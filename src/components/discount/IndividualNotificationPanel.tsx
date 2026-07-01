import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  Send,
  MessageSquare,
  CheckSquare2,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BulkUploadWidget } from "./BulkUploadWidget";
import { validateAndNormalizeSriLankanMobile, formatPhoneForDisplay } from "@/utils/phoneUtils";
import { parseOfferDescription } from "@/services/offerApi";
import { logSentNotification } from "@/utils/notificationLogger";

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  mobile: string;
  category_id: number;
  customer_categories?: {
    name: string;
  };
}

interface ActiveOffer {
  id: string;
  name: string;
  description: string;
  is_recurrent: boolean;
  usage_limit: number | null;
}

const IndividualNotificationPanel = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("sms");
  const [smsMessage, setSmsMessage] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");

  // Offer Filtering State
  const [offers, setOffers] = useState<ActiveOffer[]>([]);
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [excludeRedeemed, setExcludeRedeemed] = useState(true);
  const [redemptions, setRedemptions] = useState<any[]>([]); // Array of { offer_id, customer_phone }
  const [selectedOffersDetails, setSelectedOffersDetails] = useState<any[]>([]);

  useEffect(() => {
    loadMembers();
    loadOffers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("members")
        .select(`
          id,
          first_name,
          last_name,
          mobile,
          category_id,
          customer_categories (
            name
          )
        `)
        .eq("is_active", true)
        .or("is_deleted.eq.false,is_deleted.is.null");

      if (error) throw error;
      setMembers((data as any) || []);
    } catch (err) {
      console.error("Error loading members:", err);
      toast.error("Failed to load members");
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

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(query) ||
        m.mobile.toLowerCase().includes(query) ||
        (m.customer_categories?.name &&
          m.customer_categories.name.toLowerCase().includes(query))
    );
  }, [members, searchQuery]);

  // Paginated members
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMembers, currentPage]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const toggleSelectMember = (member: Member) => {
    setSelectedMembers((prev) => {
      const exists = prev.some((m) => m.id === member.id);
      if (exists) {
        return prev.filter((m) => m.id !== member.id);
      } else {
        return [...prev, member];
      }
    });
  };

  const handleSelectAllOnPage = () => {
    const pageMemberIds = paginatedMembers.map((m) => m.id);
    const allSelected = paginatedMembers.every((m) =>
      selectedMembers.some((sm) => sm.id === m.id)
    );

    if (allSelected) {
      // Deselect all on this page
      setSelectedMembers((prev) => prev.filter((m) => !pageMemberIds.includes(m.id)));
    } else {
      // Select all on this page (avoiding duplicates)
      setSelectedMembers((prev) => {
        const toAdd = paginatedMembers.filter(
          (m) => !prev.some((sm) => sm.id === m.id)
        );
        return [...prev, ...toAdd];
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedMembers([]);
  };

  const handleNumbersAdded = (newNumbers: { mobile: string; name: string }[]) => {
    const valid: Member[] = [];
    newNumbers.forEach((nn) => {
      // Prevent duplicate mobile addition
      const mobileExistsInSelection = selectedMembers.some(
        (sm) => sm.mobile === nn.mobile
      );

      if (!mobileExistsInSelection) {
        // Try to find if this phone number belongs to an existing member in our database
        const existingDbMember = members.find((m) => m.mobile === nn.mobile);

        if (existingDbMember) {
          valid.push(existingDbMember);
        } else {
          // Create a pseudo-member object for the manual upload
          valid.push({
            id: `manual-${nn.mobile}`,
            first_name: nn.name.split(" (")[0] || "Manual Recipient",
            last_name: `(${formatPhoneForDisplay(nn.mobile)})`,
            mobile: nn.mobile,
            category_id: -1,
            customer_categories: { name: "Manual Upload" },
          });
        }
      }
    });

    if (valid.length > 0) {
      setSelectedMembers((prev) => [...prev, ...valid]);
    }
  };

  // Perform smart offer filtration on selection
  const recipientAnalysis = useMemo(() => {
    if (selectedOfferIds.length === 0 || selectedOffersDetails.length === 0) {
      return {
        eligibleList: selectedMembers,
        skippedCount: 0,
      };
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

    const eligible: Member[] = [];
    let skipped = 0;

    selectedMembers.forEach((m) => {
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

    return {
      eligibleList: eligible,
      skippedCount: skipped,
    };
  }, [selectedMembers, selectedOfferIds, excludeRedeemed, redemptions, selectedOffersDetails]);

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
        recipients: recipientAnalysis.eligibleList.map((m) => ({
          phone: m.mobile,
          name: `${m.first_name} ${m.last_name}`,
        })),
        message,
        channel: activeTab,
      };

      console.log(`Sending individual message (${activeTab.toUpperCase()}) to:`, payload);

      // Simulate API call
      await new Promise((r) => setTimeout(r, 2000));

      const selectedOffersNames = offers
        .filter((o) => selectedOfferIds.includes(o.id))
        .map((o) => o.name)
        .join(", ");

      logSentNotification({
        type: "Individual Custom",
        channel: activeTab as "sms" | "whatsapp",
        message,
        recipients: recipientAnalysis.eligibleList.map((m) => ({
          phone: m.mobile,
          name: `${m.first_name} ${m.last_name}`,
        })),
        offerName: selectedOffersNames || undefined,
      });

      toast.success(
        `Message sent successfully to ${recipientAnalysis.eligibleList.length} recipient(s)!`
      );
      setSmsMessage("");
      setWhatsappMessage("");
      setSelectedMembers([]);
      setSelectedOfferIds([]);
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const isAllPageSelected = useMemo(() => {
    if (paginatedMembers.length === 0) return false;
    return paginatedMembers.every((m) =>
      selectedMembers.some((sm) => sm.id === m.id)
    );
  }, [paginatedMembers, selectedMembers]);

  return (
    <div className="space-y-6">
      {/* Manual Input / Bulk Upload Widget */}
      <div className="border rounded-lg p-4 bg-muted/20">
        <BulkUploadWidget
          onNumbersAdded={handleNumbersAdded}
          buttonText="Validate & Add to Selection"
        />
      </div>

      {/* Search and Member List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search database members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs w-full sm:w-auto">
            {selectedMembers.length > 0 && (
              <button
                onClick={handleClearSelection}
                className="text-muted-foreground hover:text-foreground hover:underline font-medium"
              >
                Clear Selection ({selectedMembers.length})
              </button>
            )}
            <span className="text-muted-foreground">
              Matched in db: {filteredMembers.length}
            </span>
          </div>
        </div>

        {/* Selected preview bar */}
        {selectedMembers.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-3 px-4 flex flex-wrap items-center gap-2">
              <CheckSquare2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium mr-2">Selected recipients:</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto w-full mt-2 sm:mt-0 sm:w-auto">
                {selectedMembers.map((m) => (
                  <Badge
                    key={m.id}
                    variant="secondary"
                    className="text-xs gap-1 pr-1.5 pl-2 py-0.5"
                  >
                    {m.first_name} {m.last_name} ({formatPhoneForDisplay(m.mobile)})
                    <X
                      className="h-3 w-3 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                      onClick={() => toggleSelectMember(m)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center">
                  <Checkbox
                    checked={isAllPageSelected}
                    onCheckedChange={handleSelectAllOnPage}
                  />
                </TableHead>
                <TableHead>Member Name</TableHead>
                <TableHead>Mobile Number</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading members...
                  </TableCell>
                </TableRow>
              ) : paginatedMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No members found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMembers.map((member) => {
                  const isSelected = selectedMembers.some((sm) => sm.id === member.id);
                  return (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => toggleSelectMember(member)}
                    >
                      <TableCell
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectMember(member)}
                        />
                      </TableCell>
                      <TableCell className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell>{formatPhoneForDisplay(member.mobile)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {member.customer_categories?.name || "Uncategorized"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of{" "}
              {filteredMembers.length} database members
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
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
                      id="individual-exclude-redeemed"
                      checked={excludeRedeemed}
                      onCheckedChange={(checked) => setExcludeRedeemed(!!checked)}
                    />
                    <Label htmlFor="individual-exclude-redeemed" className="cursor-pointer text-sm font-semibold text-foreground">
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
      {selectedMembers.length > 0 && (
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

      {/* Message Composer */}
      <div className="space-y-3 pt-4 border-t">
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
              placeholder="Enter message text for selected members..."
              rows={4}
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
              placeholder="Enter WhatsApp message text... Use *bold*, _italic_, emojis 🎁"
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Supports *bold*, _italic_, and emoji formatting
            </p>
          </TabsContent>
        </Tabs>

        {/* Message Preview */}
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

      {/* Action Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSend}
          disabled={
            sending ||
            recipientAnalysis.eligibleList.length === 0 ||
            !(activeTab === "sms" ? smsMessage : whatsappMessage).trim()
          }
          className="gap-2 min-w-[180px]"
        >
          <Send className="h-4 w-4" />
          {sending ? "Sending..." : `Send ${activeTab === "sms" ? "SMS" : "WhatsApp"}`}
        </Button>
      </div>
    </div>
  );
};

export default IndividualNotificationPanel;
