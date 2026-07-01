import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Users, Send, MessageSquare, CheckSquare2, AlertCircle, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BulkUploadWidget } from "./BulkUploadWidget";
import { validateAndNormalizeSriLankanMobile } from "@/utils/phoneUtils";
import { parseOfferDescription } from "@/services/offerApi";
import { logSentNotification } from "@/utils/notificationLogger";

interface Category {
  id: number;
  name: string;
  memberCount: number;
}

interface ManualRecipient {
  mobile: string;
  name: string;
}

interface ActiveOffer {
  id: string;
  name: string;
  description: string;
  is_recurrent: boolean;
  usage_limit: number | null;
}

const CategoryNotificationPanel = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("sms");
  const [smsMessage, setSmsMessage] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");

  // Manual/Bulk Upload state
  const [manualRecipients, setManualRecipients] = useState<ManualRecipient[]>([]);

  // Offer Filtering State
  const [offers, setOffers] = useState<ActiveOffer[]>([]);
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [excludeRedeemed, setExcludeRedeemed] = useState(true);
  const [redemptions, setRedemptions] = useState<any[]>([]); // Array of { offer_id, customer_phone }
  const [selectedOffersDetails, setSelectedOffersDetails] = useState<any[]>([]);

  useEffect(() => {
    loadCategories();
    loadOffers();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data: cats, error } = await supabase
        .from("customer_categories")
        .select("id, name")
        .order("name");

      if (error) throw error;

      const catsWithCounts = await Promise.all(
        (cats || []).map(async (cat) => {
          const { count } = await supabase
            .from("members")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id)
            .eq("is_active", true);
          return { id: cat.id, name: cat.name, memberCount: count || 0 };
        })
      );

      setCategories(catsWithCounts);
    } catch (err) {
      console.error("Error loading categories:", err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("id, name, description, is_recurrent, usage_limit")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("name");

      if (error) throw error;
      setOffers(data || []);
    } catch (err) {
      console.error("Error loading offers:", err);
    }
  };

  // Fetch redemptions when filter offers change
  useEffect(() => {
    if (selectedOfferIds.length > 0) {
      fetchOffersRedemptions();
    } else {
      setRedemptions([]);
      setSelectedOffersDetails([]);
    }
  }, [selectedOfferIds]);

  const fetchOffersRedemptions = async () => {
    try {
      const { data: details, error: detailsErr } = await supabase
        .from("offers")
        .select("*")
        .in("id", selectedOfferIds);
      if (detailsErr) throw detailsErr;
      setSelectedOffersDetails(details || []);

      const { data: redData, error: redErr } = await supabase
        .from("offer_redemptions")
        .select("offer_id, customer_phone")
        .in("offer_id", selectedOfferIds)
        .eq("status", "active");

      if (redErr) throw redErr;
      setRedemptions(redData || []);
    } catch (err) {
      console.error("Error loading redemptions:", err);
    }
  };

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedCategoryIds(categories.map((c) => c.id));
  const clearAll = () => setSelectedCategoryIds([]);

  const removeManualRecipient = (mobile: string) => {
    setManualRecipients((prev) => prev.filter((r) => r.mobile !== mobile));
  };

  const clearManualRecipients = () => {
    setManualRecipients([]);
  };

  const getCategoryMembers = async () => {
    if (selectedCategoryIds.length === 0) return [];
    const { data: members, error } = await supabase
      .from("members")
      .select("mobile, first_name, last_name, category_id")
      .in("category_id", selectedCategoryIds)
      .eq("is_active", true)
      .or("is_deleted.eq.false,is_deleted.is.null");

    if (error) throw error;
    return members || [];
  };

  // Live filter analysis of all selected recipients (categories + manual)
  const [recipientAnalysis, setRecipientAnalysis] = useState<{
    totalTargeted: number;
    eligibleList: { mobile: string; name: string }[];
    skippedCount: number;
  }>({ totalTargeted: 0, eligibleList: [], skippedCount: 0 });

  // Load and apply smart filters dynamically to compile the send list
  useEffect(() => {
    const processFilters = async () => {
      const catMembers = await getCategoryMembers();
      
      const rawList = [
        ...catMembers.map((m) => ({
          mobile: m.mobile,
          name: `${m.first_name} ${m.last_name}`,
          category_id: m.category_id,
        })),
        ...manualRecipients.map((r) => ({
          mobile: r.mobile,
          name: r.name,
          category_id: -1,
        })),
      ];

      // Remove duplicates
      const uniqueMap = new Map<string, typeof rawList[0]>();
      rawList.forEach((rec) => {
        const norm = validateAndNormalizeSriLankanMobile(rec.mobile);
        const key = norm.isValid ? norm.normalized! : rec.mobile;
        uniqueMap.set(key, rec);
      });

      const processedList = Array.from(uniqueMap.values());

      if (selectedOfferIds.length === 0 || selectedOffersDetails.length === 0) {
        // No filter active
        setRecipientAnalysis({
          totalTargeted: processedList.length,
          eligibleList: processedList,
          skippedCount: 0,
        });
        return;
      }

      // Group active redemptions by offer_id and normalized phone
      const redemptionCounts: Record<string, Record<string, number>> = {};
      redemptions.forEach((r) => {
        if (r.offer_id && r.customer_phone) {
          const norm = validateAndNormalizeSriLankanMobile(r.customer_phone);
          const key = norm.isValid ? norm.normalized! : r.customer_phone;
          if (!redemptionCounts[r.offer_id]) {
            redemptionCounts[r.offer_id] = {};
          }
          redemptionCounts[r.offer_id][key] = (redemptionCounts[r.offer_id][key] || 0) + 1;
        }
      });

      const eligible: { mobile: string; name: string }[] = [];
      let skipped = 0;

      processedList.forEach((m) => {
        const norm = validateAndNormalizeSriLankanMobile(m.mobile);
        const key = norm.isValid ? norm.normalized! : m.mobile;

        let hasRedeemedAnyFully = false;

        selectedOffersDetails.forEach((offerDetail) => {
          const { category_recurrence } = parseOfferDescription(offerDetail.description);
          const isOfferRecurrent = offerDetail.is_recurrent;
          const offerUsageLimit = offerDetail.usage_limit;

          const count = redemptionCounts[offerDetail.id]?.[key] || 0;

          let isRedeemedFully = false;
          const memberCatId = m.category_id;
          const settings = memberCatId && memberCatId !== -1 ? category_recurrence[memberCatId] : null;

          if (settings) {
            if (settings.is_recurrent) {
              if (settings.hasUsageLimit && settings.usage_limit) {
                isRedeemedFully = count >= parseInt(settings.usage_limit);
              } else {
                isRedeemedFully = false;
              }
            } else {
              isRedeemedFully = count >= 1;
            }
          } else {
            if (isOfferRecurrent) {
              if (offerUsageLimit !== null && offerUsageLimit !== undefined) {
                isRedeemedFully = count >= offerUsageLimit;
              } else {
                isRedeemedFully = false;
              }
            } else {
              isRedeemedFully = count >= 1;
            }
          }

          if (isRedeemedFully) {
            hasRedeemedAnyFully = true;
          }
        });

        let shouldSkip = false;
        if (excludeRedeemed && hasRedeemedAnyFully) {
          shouldSkip = true;
        }

        if (shouldSkip) {
          skipped++;
        } else {
          eligible.push(m);
        }
      });

      setRecipientAnalysis({
        totalTargeted: processedList.length,
        eligibleList: eligible,
        skippedCount: skipped,
      });
    };

    processFilters();
  }, [selectedCategoryIds, manualRecipients, selectedOfferIds, excludeRedeemed, redemptions, selectedOffersDetails]);

  const handleSend = async () => {
    if (recipientAnalysis.eligibleList.length === 0) {
      toast.error("No eligible recipients found to send messages to");
      return;
    }
    const message = activeTab === "sms" ? smsMessage : whatsappMessage;
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSending(true);
    try {
      const payload = {
        recipients: recipientAnalysis.eligibleList.map((r) => ({
          phone: r.mobile,
          name: r.name,
        })),
        message,
        channel: activeTab,
      };

      console.log(`Sending Category Notification (${activeTab.toUpperCase()}) to:`, payload);

      // Simulate API call
      await new Promise((r) => setTimeout(r, 2000));

      // Get category names & offer names for logs
      const catNames = categories
        .filter((c) => selectedCategoryIds.includes(c.id))
        .map((c) => c.name)
        .join(", ");

      const selectedOffersNames = offers
        .filter((o) => selectedOfferIds.includes(o.id))
        .map((o) => o.name)
        .join(", ");

      logSentNotification({
        type: "Category Bulk",
        channel: activeTab as "sms" | "whatsapp",
        message,
        recipients: recipientAnalysis.eligibleList.map((r) => ({
          phone: r.mobile,
          name: r.name,
        })),
        categoriesName: catNames || "None Selected",
        offerName: selectedOffersNames || undefined,
      });

      toast.success(
        `${activeTab === "sms" ? "SMS" : "WhatsApp"} sent to ${recipientAnalysis.eligibleList.length} recipients successfully!`
      );
      setSmsMessage("");
      setWhatsappMessage("");
      setSelectedCategoryIds([]);
      setManualRecipients([]);
      setSelectedOfferIds([]);
    } catch (err) {
      console.error("Error sending:", err);
      toast.error("Failed to send messages");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Select Categories
          </Label>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={selectAll}
              className="text-primary hover:underline font-medium"
            >
              Select All
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-lg p-4">
            <AlertCircle className="h-4 w-4" />
            No categories found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const isSelected = selectedCategoryIds.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-150 select-none ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCategory(cat.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="font-medium text-sm">{cat.name}</span>
                  </div>
                  <Badge
                    variant={isSelected ? "default" : "secondary"}
                    className="text-xs gap-1"
                  >
                    <Users className="h-3 w-3" />
                    {cat.memberCount}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Recipient & Bulk Upload Section */}
      <div className="border rounded-lg p-4 bg-muted/20">
        <BulkUploadWidget
          onNumbersAdded={(newRecipients) => {
            setManualRecipients((prev) => {
              const merged = [...prev];
              newRecipients.forEach((nr) => {
                if (!merged.some((m) => m.mobile === nr.mobile)) {
                  merged.push(nr);
                }
              });
              return merged;
            });
          }}
        />

        {manualRecipients.length > 0 && (
          <div className="space-y-2 pt-4 border-t mt-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">
                Added Manual/Uploaded Recipients ({manualRecipients.length})
              </span>
              <button
                onClick={clearManualRecipients}
                className="text-xs text-destructive hover:underline"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {manualRecipients.map((rec) => (
                <Badge
                  key={rec.mobile}
                  variant="secondary"
                  className="text-xs gap-1 pr-1.5 pl-2 py-0.5"
                >
                  {rec.name}
                  <X
                    className="h-3 w-3 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                    onClick={() => removeManualRecipient(rec.mobile)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Offer usage filter checklist */}
      <div className="border rounded-lg p-4 bg-muted/10 space-y-4">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="offer-filters" className="border-b-0">
            <AccordionTrigger className="hover:no-underline py-0">
              <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Filter by Offer Redemptions (Optional)
                {selectedOfferIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {selectedOfferIds.length} Offer(s) selected
                  </Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-muted-foreground">Select Offers to Filter by:</span>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => setSelectedOfferIds(offers.map(o => o.id))}
                      className="text-primary hover:underline font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      onClick={() => setSelectedOfferIds([])}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {offers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active offers available to filter.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2 bg-background">
                    {offers.map((o) => {
                      const isChecked = selectedOfferIds.includes(o.id);
                      return (
                        <div
                          key={o.id}
                          className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 p-1.5 rounded"
                          onClick={() => {
                            setSelectedOfferIds(prev =>
                              prev.includes(o.id) ? prev.filter(x => x !== o.id) : [...prev, o.id]
                            );
                          }}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="truncate">{o.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedOfferIds.length > 0 && (
                <div className="pt-2 border-t space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="category-exclude-redeemed"
                      checked={excludeRedeemed}
                      onCheckedChange={(checked) => setExcludeRedeemed(!!checked)}
                    />
                    <Label htmlFor="category-exclude-redeemed" className="cursor-pointer text-sm font-semibold text-foreground">
                      Exclude members who have fully redeemed the selected offer(s)
                    </Label>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Recipient summary */}
      {recipientAnalysis.totalTargeted > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckSquare2 className="h-4 w-4 text-primary" />
                <span>
                  Ready to send: <span className="font-semibold text-primary">{recipientAnalysis.eligibleList.length}</span> recipients
                  {recipientAnalysis.skippedCount > 0 && (
                    <span className="text-muted-foreground text-xs ml-2">
                      ({recipientAnalysis.skippedCount} skipped by offer filters)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message composer */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Compose Message
        </Label>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="sms" className="space-y-2 mt-3">
            <Textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="Enter your SMS message…"
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {smsMessage.length} characters · {Math.ceil(smsMessage.length / 160) || 1}{" "}
              SMS segment(s)
            </p>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-2 mt-3">
            <Textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              placeholder="Enter your WhatsApp message… Use *bold*, _italic_, emojis 🎁"
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Supports *bold*, _italic_, and emoji formatting
            </p>
          </TabsContent>
        </Tabs>

        {/* Preview */}
        {(activeTab === "sms" ? smsMessage : whatsappMessage).trim() && (
          <div className="border rounded-lg p-3 bg-muted/50 text-sm">
            <p className="font-medium mb-1 text-xs text-muted-foreground uppercase tracking-wide">
              Preview
            </p>
            <p className="whitespace-pre-wrap">
              {activeTab === "sms" ? smsMessage : whatsappMessage}
            </p>
          </div>
        )}
      </div>

      {/* Send button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSend}
          disabled={
            sending ||
            recipientAnalysis.eligibleList.length === 0 ||
            !(activeTab === "sms" ? smsMessage : whatsappMessage).trim()
          }
          size="lg"
          className="gap-2 min-w-40"
        >
          <Send className="h-4 w-4" />
          {sending
            ? "Sending…"
            : `Send ${activeTab === "sms" ? "SMS" : "WhatsApp"}`}
        </Button>
      </div>
    </div>
  );
};

export default CategoryNotificationPanel;
