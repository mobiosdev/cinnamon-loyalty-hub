import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageSquare,
  Send,
  Users,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseOfferDescription } from "@/services/offerApi";
import { validateAndNormalizeSriLankanMobile, formatPhoneForDisplay } from "@/utils/phoneUtils";
import { BulkUploadWidget } from "./BulkUploadWidget";
import { logSentNotification } from "@/utils/notificationLogger";

interface SendMessageDialogProps {
  offer: {
    id: string;
    name: string;
    description: string;
    categories: Array<{
      id: number;
      name: string;
      memberCount: number;
    }>;
    totalMembers: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

interface MemberRecipient {
  mobile: string;
  first_name: string;
  last_name: string;
  category_id: number;
  is_manual?: boolean;
}

export const SendMessageDialog = ({ offer, isOpen, onClose }: SendMessageDialogProps) => {
  const [smsMessage, setSmsMessage] = useState(
    `Special Offer: ${offer.name}\n\n${offer.description}\n\nVisit us to redeem this exclusive offer!`
  );
  const [whatsappMessage, setWhatsappMessage] = useState(
    `🎁 *${offer.name}*\n\n${offer.description}\n\n✨ This is an exclusive offer for you! Visit us to redeem.\n\nThank you for being a valued member!`
  );
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("sms");

  // Recipient lists
  const [eligibleRecipients, setEligibleRecipients] = useState<MemberRecipient[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);

  // Manual entry state
  const [manualNumbers, setManualNumbers] = useState<string[]>([]);
  const [applyFilterToManual, setApplyFilterToManual] = useState(true);

  // Filter options state
  const [excludeRedeemed, setExcludeRedeemed] = useState(true);

  useEffect(() => {
    if (isOpen) {
      calculateRecipients();
    }
  }, [isOpen, offer.id, manualNumbers, applyFilterToManual, excludeRedeemed]);

  const calculateRecipients = async () => {
    setLoading(true);
    try {
      // 1. Fetch full offer detail for recurrence and usage limits
      const { data: offerDetails, error: offerError } = await supabase
        .from("offers")
        .select("*")
        .eq("id", offer.id)
        .single();
      if (offerError) throw offerError;

      const { category_recurrence } = parseOfferDescription(offerDetails.description);
      const isOfferRecurrent = offerDetails.is_recurrent;
      const offerUsageLimit = offerDetails.usage_limit;

      // 2. Fetch all active members in target categories
      const categoryIds = offer.categories.map((cat) => cat.id);
      const { data: catMembers, error: membersError } = await supabase
        .from("members")
        .select("mobile, first_name, last_name, category_id")
        .in("category_id", categoryIds)
        .eq("is_active", true)
        .or("is_deleted.eq.false,is_deleted.is.null");
      if (membersError) throw membersError;

      // 3. Compile list of manual numbers and lookup if they are database members
      let manualMemberData: MemberRecipient[] = [];
      if (manualNumbers.length > 0) {
        const { data: matchedDbMembers, error: matchError } = await supabase
          .from("members")
          .select("mobile, first_name, last_name, category_id")
          .in("mobile", manualNumbers)
          .eq("is_active", true)
          .or("is_deleted.eq.false,is_deleted.is.null");

        if (matchError) throw matchError;

        manualNumbers.forEach((mobile) => {
          const dbMatch = matchedDbMembers?.find((m) => m.mobile === mobile);
          if (dbMatch) {
            manualMemberData.push({ ...dbMatch, is_manual: true });
          } else {
            manualMemberData.push({
              mobile,
              first_name: "Manual Recipient",
              last_name: `(${formatPhoneForDisplay(mobile)})`,
              category_id: -1,
              is_manual: true,
            });
          }
        });
      }

      // Merge category members and manual members
      const allMembersToProcess = [...(catMembers || [])];
      
      // Prevent duplicates if a manual number is already in the category members
      manualMemberData.forEach((mm) => {
        if (!allMembersToProcess.some((am) => am.mobile === mm.mobile)) {
          allMembersToProcess.push(mm);
        }
      });

      // 4. Fetch all active redemptions for this offer
      const { data: redemptions, error: redemptionsError } = await supabase
        .from("offer_redemptions")
        .select("customer_phone")
        .eq("offer_id", offer.id)
        .eq("status", "active");
      if (redemptionsError) throw redemptionsError;

      // Group active redemptions by normalized phone
      const redemptionCountsByPhone: Record<string, number> = {};
      (redemptions || []).forEach((r) => {
        if (r.customer_phone) {
          const norm = validateAndNormalizeSriLankanMobile(r.customer_phone);
          const key = norm.isValid ? norm.normalized! : r.customer_phone;
          redemptionCountsByPhone[key] = (redemptionCountsByPhone[key] || 0) + 1;
        }
      });

      // Filter members based on usage limits/redemption count
      const eligible: MemberRecipient[] = [];
      let skipped = 0;

      allMembersToProcess.forEach((m) => {
        // Skip filter check if m is manual AND applyFilterToManual is false
        if (m.is_manual && !applyFilterToManual) {
          eligible.push(m);
          return;
        }

        const norm = validateAndNormalizeSriLankanMobile(m.mobile);
        const key = norm.isValid ? norm.normalized! : m.mobile;
        const count = redemptionCountsByPhone[key] || 0;

        let hasRedeemedFully = false;
        const memberCatId = m.category_id;
        const settings = memberCatId && memberCatId !== -1 ? category_recurrence[memberCatId] : null;

        if (settings) {
          if (settings.is_recurrent) {
            if (settings.hasUsageLimit && settings.usage_limit) {
              hasRedeemedFully = count >= parseInt(settings.usage_limit);
            } else {
              hasRedeemedFully = false;
            }
          } else {
            hasRedeemedFully = count >= 1;
          }
        } else {
          if (isOfferRecurrent) {
            if (offerUsageLimit !== null && offerUsageLimit !== undefined) {
              hasRedeemedFully = count >= offerUsageLimit;
            } else {
              hasRedeemedFully = false;
            }
          } else {
            hasRedeemedFully = count >= 1;
          }
        }

        let shouldSkip = false;
        if (excludeRedeemed && hasRedeemedFully) {
          shouldSkip = true;
        }

        if (shouldSkip) {
          skipped++;
        } else {
          eligible.push(m);
        }
      });

      setEligibleRecipients(eligible);
      setSkippedCount(skipped);
    } catch (err) {
      console.error("Error calculating recipients:", err);
      toast.error("Error preparing recipient list");
    } finally {
      setLoading(false);
    }
  };

  const removeManualNumber = (mobile: string) => {
    setManualNumbers((prev) => prev.filter((num) => num !== mobile));
  };

  const clearManualNumbers = () => {
    setManualNumbers([]);
  };

  const handleSend = async () => {
    if (eligibleRecipients.length === 0) {
      toast.error("No eligible recipients found to send messages to");
      return;
    }

    const message = activeTab === "sms" ? smsMessage : whatsappMessage;
    if (!message.trim()) {
      toast.error("Message content cannot be empty");
      return;
    }

    setSending(true);
    try {
      const payload = {
        recipients: eligibleRecipients.map((m) => ({
          phone: m.mobile,
          name: `${m.first_name} ${m.last_name}`,
        })),
        message,
        offer_id: offer.id,
        offer_name: offer.name,
        channel: activeTab,
      };

      console.log(`Sending Offer Reminders (${activeTab.toUpperCase()}) to:`, payload);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Log notification to log list
      logSentNotification({
        type: "Offer Reminder",
        channel: activeTab as "sms" | "whatsapp",
        message,
        recipients: eligibleRecipients.map((m) => ({
          phone: m.mobile,
          name: `${m.first_name} ${m.last_name}`,
        })),
        offerName: offer.name,
      });

      toast.success(
        `${activeTab === "sms" ? "SMS" : "WhatsApp"} sent successfully to ${eligibleRecipients.length} recipients!`
      );
      onClose();
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notifications");
    } finally {
      setSending(false);
    }
  };

  const categoryRecipientsCount = offer.categories.reduce((acc, cat) => acc + cat.memberCount, 0);
  const totalRawRecipients = categoryRecipientsCount + manualNumbers.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <MessageSquare className="h-5 w-5 text-primary" />
            Send Offer Reminder: {offer.name}
          </DialogTitle>
          <DialogDescription>
            Send messages to members about this offer. Users who have already fully redeemed this offer are automatically filtered out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target Categories */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-primary" />
                Target Categories
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {offer.categories.map((cat) => (
                <Badge key={cat.id} variant="secondary" className="gap-1 font-medium">
                  {cat.name}
                  <span className="text-xs text-muted-foreground">
                    ({cat.memberCount} total)
                  </span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Manual Entry/Bulk Upload inside Dialog */}
          <div className="border rounded-lg p-4 bg-muted/10">
            <BulkUploadWidget
              onNumbersAdded={(newRecipients) => {
                setManualNumbers((prev) => {
                  const merged = [...prev];
                  newRecipients.forEach((nr) => {
                    if (!merged.includes(nr.mobile)) {
                      merged.push(nr.mobile);
                    }
                  });
                  return merged;
                });
              }}
              applyRedemptionFilterOption={true}
              filterManualState={applyFilterToManual}
              onFilterManualChange={setApplyFilterToManual}
            />

            {manualNumbers.length > 0 && (
              <div className="space-y-2 pt-4 border-t mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Added Manual/Uploaded Numbers ({manualNumbers.length})
                  </span>
                  <button onClick={clearManualNumbers} className="text-xs text-destructive hover:underline">
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {manualNumbers.map((num) => (
                    <Badge key={num} variant="secondary" className="text-xs gap-1 pr-1.5 pl-2 py-0.5">
                      {formatPhoneForDisplay(num)}
                      <X
                        className="h-3 w-3 text-muted-foreground hover:text-destructive cursor-pointer"
                        onClick={() => removeManualNumber(num)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Smart Filtering Selection */}
          <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="exclude-redeemed"
                checked={excludeRedeemed}
                onCheckedChange={(checked) => setExcludeRedeemed(!!checked)}
              />
              <Label htmlFor="exclude-redeemed" className="cursor-pointer text-sm font-semibold">
                Exclude members who have fully redeemed this offer
              </Label>
            </div>
          </div>

          {/* Smart Filtering Summary */}
          <div className="border rounded-lg p-4 bg-muted/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Recipient Distribution</span>
              {loading && <span className="text-xs text-muted-foreground animate-pulse">Recalculating...</span>}
            </div>

            {!loading && (
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground">Total targeted</span>
                  <span className="font-semibold text-base text-foreground">{totalRawRecipients}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Redeemed / Skipped <AlertCircle className="h-3 w-3 text-amber-500" />
                  </span>
                  <span className="font-semibold text-base text-amber-600">{skippedCount} skipped</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Ready to Receive <CheckCircle2 className="h-3 w-3 text-green-500" />
                  </span>
                  <span className="font-semibold text-base text-green-600">{eligibleRecipients.length} will send</span>
                </div>
              </div>
            )}
          </div>

          {/* Tabs for SMS/WhatsApp */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sms">SMS</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>

            <TabsContent value="sms" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="sms-message" className="text-sm font-semibold">SMS Message</Label>
                <Textarea
                  id="sms-message"
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  rows={6}
                  className="resize-none"
                  placeholder="Enter your SMS message..."
                />
                <p className="text-xs text-muted-foreground">
                  Character count: {smsMessage.length} (160 chars per SMS)
                </p>
              </div>

              <div className="border rounded-lg p-3 bg-muted/50 text-sm">
                <p className="font-medium mb-1 text-xs text-muted-foreground uppercase tracking-wide">SMS Preview:</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{smsMessage}</p>
              </div>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-message" className="text-sm font-semibold">WhatsApp Message</Label>
                <Textarea
                  id="whatsapp-message"
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  rows={6}
                  className="resize-none"
                  placeholder="Enter your WhatsApp message..."
                />
                <p className="text-xs text-muted-foreground">
                  You can use *bold*, _italic_, and emojis in WhatsApp messages
                </p>
              </div>

              <div className="border rounded-lg p-3 bg-muted/50 text-sm">
                <p className="font-medium mb-1 text-xs text-muted-foreground uppercase tracking-wide">WhatsApp Preview:</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{whatsappMessage}</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || loading || eligibleRecipients.length === 0}
              className="gap-2 px-6"
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : `Send ${activeTab === "sms" ? "SMS" : "WhatsApp"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
