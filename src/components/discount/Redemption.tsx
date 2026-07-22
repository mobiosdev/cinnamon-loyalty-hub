import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CreditCard, Gift, Send, CheckCircle, AlertCircle, Percent, QrCode, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { offerApi } from "@/services/offerApi";
import { staffApi } from "@/services/staffApi";
import { redemptionApi } from "@/services/redemptionApi";
import { transactionApi } from "@/services/transactionApi";
import { validateAndNormalizeSriLankanMobile } from "@/utils/phoneUtils";
import { format } from "date-fns";
import axios from "axios";
import { cn } from "@/lib/utils";
import { QrScannerDialog } from "./QrScannerDialog";
import { logActivity } from "@/utils/auditLogger";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RedemptionStep = "input" | "verify" | "benefits";

interface MemberData {
  id: string;
  first_name: string;
  last_name: string;
  discount_percentage: number;
  discount_amount: number;
  discount_enabled: boolean;
  company_id: string;
  selected_offers: string[];
}

interface AvailableOffer {
  id: string;
  name: string;
  description: string;
  is_redeemed: boolean;
  min_bill_value?: number;
  max_discount_amount?: number;
  valid_from?: string;
  valid_to?: string;
  is_recurrent?: boolean;
  usage_limit?: number | null;
  redemptions_count?: number;
  redemptions?: Array<{
    id: string;
    redeemed_at: string;
    bill_number?: string;
  }>;
}

const Redemption = () => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isSuperAdmin = currentUser?.role === "superadmin";
  const canReverse = isSuperAdmin || currentUser?.permissions?.redemption_reversal === true;

  const [step, setStep] = useState<RedemptionStep>("input");
  const [billNumber, setBillNumber] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [staffId, setStaffId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiryTime, setExpiryTime] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  
  // Member and benefits data
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [availableOffers, setAvailableOffers] = useState<AvailableOffer[]>([]);
  const [redeemedItems, setRedeemedItems] = useState<Set<string>>(new Set());
  const [queuedOffers, setQueuedOffers] = useState<Set<string>>(new Set());
  const [discountHistory, setDiscountHistory] = useState<any[]>([]);

  // Name search and remark states
  const [searchNameQuery, setSearchNameQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingNames, setSearchingNames] = useState(false);
  const [remark, setRemark] = useState("");
  const [billExistsError, setBillExistsError] = useState("");

  // Reversal states
  const [activeTab, setActiveTab] = useState<"redeem" | "reverse">("redeem");
  const [reversalBillNumber, setReversalBillNumber] = useState("");
  const [reversalStep, setReversalStep] = useState<"input" | "verify">("input");
  const [reversalOtp, setReversalOtp] = useState("");
  const [reversalStaffId, setReversalStaffId] = useState<number | null>(null);
  const [reversalMaskedMobile, setReversalMaskedMobile] = useState("");
  const [reversalExpiryTime, setReversalExpiryTime] = useState<string | null>(null);
  const [reversalSecondsLeft, setReversalSecondsLeft] = useState<number>(0);
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);

  // Countdown timer for reversal OTP
  useEffect(() => {
    if (!reversalExpiryTime || reversalStep !== "verify") {
      setReversalSecondsLeft(0);
      return;
    }

    const calculateSecondsLeft = () => {
      const diff = new Date(reversalExpiryTime).getTime() - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setReversalSecondsLeft(calculateSecondsLeft());

    const timer = setInterval(() => {
      const left = calculateSecondsLeft();
      setReversalSecondsLeft(left);
      if (left <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [reversalExpiryTime, reversalStep]);

  // Check if bill number exists
  useEffect(() => {
    if (!billNumber || billNumber.trim() === "") {
      setBillExistsError("");
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const exists = await transactionApi.checkBillExists(billNumber.trim());
        if (exists) {
          setBillExistsError("This Bill Number has already been processed / redeemed");
        } else {
          setBillExistsError("");
        }
      } catch (err) {
        console.error("Error checking bill number:", err);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [billNumber]);

  // Countdown timer for OTP
  useEffect(() => {
    if (!expiryTime || step !== "verify") {
      setSecondsLeft(0);
      return;
    }

    const calculateSecondsLeft = () => {
      const diff = new Date(expiryTime).getTime() - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setSecondsLeft(calculateSecondsLeft());

    const timer = setInterval(() => {
      const left = calculateSecondsLeft();
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryTime, step]);

  const getCategoryBadgeVariant = (categoryName: string): "default" | "secondary" | "destructive" | "outline" => {
    const categoryColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'vip': 'default',
      'premium': 'default',
      'standard': 'secondary',
      'basic': 'outline',
      'corporate': 'secondary',
      'silver': 'outline',
      'gold': 'default',
      'platinum': 'destructive',
    };
    
    const normalized = categoryName?.toLowerCase() || '';
    for (const [key, variant] of Object.entries(categoryColors)) {
      if (normalized.includes(key)) {
        return variant;
      }
    }
    return 'outline';
  };

  const formatExpiryTime = (timeString: string | null) => {
    if (!timeString) return "";
    const date = new Date(timeString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchDiscountHistory = async (phone: string) => {
    try {
      const data = await redemptionApi.getTransactions({ searchTerm: phone });
      const mapped = (data || [])
        .filter((t: any) => t.type === 'discount')
        .map((t: any) => ({
          ...t,
          members: {
            first_name: t.member_name.split(' ')[0] || '',
            last_name: t.member_name.split(' ').slice(1).join(' ') || '',
            member_code: t.member_code
          }
        }));

      setDiscountHistory(mapped);
    } catch (error) {
      console.error('Error fetching discount history:', error);
    }
  };

  const handleSendOTP = async () => {
    if (!billNumber) {
      toast.error("Please enter a Bill Number");
      return;
    }
    
    if (!mobileNumber && !memberCode) {
      toast.error("Please enter either a Mobile Number or Member Code");
      return;
    }

    setLoading(true);

    try {
      let finalMobileNumber = "";
      
      if (memberCode) {
        // Search by member code
        const member = await staffApi.getMemberByCode(memberCode.trim().toUpperCase());
        if (!member) {
          toast.error("Member not found with the provided Member Code");
          setLoading(false);
          return;
        }
        if (!member.is_active) {
          toast.error("This member account is inactive");
          setLoading(false);
          return;
        }
        finalMobileNumber = member.mobile;
        setMobileNumber(member.mobile); // Populate phone number state
      } else if (mobileNumber) {
        // Search by phone number
        const phoneValidation = validateAndNormalizeSriLankanMobile(mobileNumber);
        if (!phoneValidation.isValid) {
          toast.error(phoneValidation.error || "Invalid mobile number");
          setLoading(false);
          return;
        }

        const member = await staffApi.getMemberByPhone(phoneValidation.normalized!);
        if (!member) {
          toast.error("Member not found with the provided Mobile Number");
          setLoading(false);
          return;
        }
        if (!member.is_active) {
          toast.error("This member account is inactive");
          setLoading(false);
          return;
        }
        finalMobileNumber = phoneValidation.normalized!;
      }

      const data = await transactionApi.sendOtp({
        mobile: finalMobileNumber,
        notes: `OTP for redeeming benefits on bill #${billNumber}`,
        user_id: 1,
        bill_number: billNumber,
      });

      setStaffId(data.data.staff_id);
      setExpiryTime(data.data.expiry_time);
      setStep("verify");
      toast.success(data.message || `OTP sent to ${finalMobileNumber}`);
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a 6-digit OTP");
      return;
    }

    if (!staffId) {
      toast.error("Invalid session. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const phoneValidation = validateAndNormalizeSriLankanMobile(mobileNumber);
      const cleanMobile = phoneValidation.normalized!;

      await transactionApi.verifyOtp({
        mobile: cleanMobile,
        otp,
        staff_id: staffId,
      });
      
      // Fetch member data and available offers
      const [member, offers] = await Promise.all([
        staffApi.getMemberByPhone(cleanMobile),
        offerApi.getAvailableOffers(cleanMobile)
      ]);

      if (!member) {
        toast.error("Member not found");
        setLoading(false);
        return;
      }

      if (!member.is_active) {
        toast.error("This member account is inactive");
        setLoading(false);
        return;
      }

      setMemberData(member as any);
      setAvailableOffers(offers.offers || []);
      setStep("benefits");
      
      // Fetch discount history
      await fetchDiscountHistory(cleanMobile);
      
      toast.success("OTP verified! Select benefits to redeem.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to verify OTP or load member data");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemDiscount = async () => {
    if (!memberData?.discount_enabled) {
      toast.error("Discount not available for this member");
      return;
    }

    setLoading(true);
    try {
      // Normalize phone number for storage
      const phoneValidation = validateAndNormalizeSriLankanMobile(mobileNumber);
      const phoneToSave = phoneValidation.isValid ? phoneValidation.normalized! : mobileNumber;

      // Save discount redemption to database
      await redemptionApi.redeemDiscount({
        member_id: memberData.id,
        bill_number: billNumber,
        customer_phone: phoneToSave,
        discount_type: memberData.discount_amount > 0 ? 'fixed' : 'percentage',
        discount_value: memberData.discount_amount > 0 ? memberData.discount_amount : memberData.discount_percentage,
        discount_amount: null,
        redeemed_by: 1
      });

      // Fetch updated history
      await fetchDiscountHistory(phoneToSave);

      logActivity({
        activityType: 'benefit_redemption',
        entityType: 'redemption',
        entityName: `Discount on Bill #${billNumber}`,
        action: 'redeem',
        memberInfo: {
          member_code: memberData.member_code,
          phone: phoneToSave,
          name: `${memberData.first_name} ${memberData.last_name}`,
        },
        section: 'Redemption - Redeem Discount',
        details: {
          bill_number: billNumber,
          discount_type: memberData.discount_amount > 0 ? 'fixed' : 'percentage',
          discount_value: memberData.discount_amount > 0 ? memberData.discount_amount : memberData.discount_percentage,
          remarks: remark || undefined,
        }
      });

      setRedeemedItems(prev => new Set(prev).add('discount'));
      toast.success("Discount applied successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply discount");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemOffer = (offer: AvailableOffer) => {
    if (offer.is_redeemed) {
      toast.error("This offer has already been redeemed");
      return;
    }

    if (queuedOffers.has(offer.id)) {
      setQueuedOffers(prev => {
        const next = new Set(prev);
        next.delete(offer.id);
        return next;
      });
      toast.info(`Removed "${offer.name}" from batch redemption list`);
    } else {
      setQueuedOffers(prev => new Set(prev).add(offer.id));
      toast.success(`Added "${offer.name}" to batch redemption list`);
    }
  };

  const handleProcessRedemption = async () => {
    if (queuedOffers.size === 0) {
      toast.error("No offers selected for redemption");
      return;
    }

    setLoading(true);
    try {
      // Normalize phone number for consistent storage
      const phoneValidation = validateAndNormalizeSriLankanMobile(mobileNumber);
      const phoneToSave = phoneValidation.isValid ? phoneValidation.normalized! : mobileNumber;

      const offerIdsArray = Array.from(queuedOffers);

      await offerApi.redeemOfferBatch({
        offer_ids: offerIdsArray,
        customer_phone: phoneToSave,
        bill_number: billNumber,
        redeemed_by: 1, // TODO: Get from auth
      });

      logActivity({
        activityType: 'benefit_redemption',
        entityType: 'redemption',
        entityName: `Offers on Bill #${billNumber}`,
        action: 'redeem',
        memberInfo: {
          member_code: memberData?.member_code,
          phone: phoneToSave,
          name: memberData ? `${memberData.first_name} ${memberData.last_name}` : undefined,
        },
        section: 'Redemption - Redeem Offers',
        details: {
          bill_number: billNumber,
          offer_ids: offerIdsArray,
          offer_names: availableOffers.filter(o => queuedOffers.has(o.id)).map(o => o.name),
          remarks: remark || undefined,
        }
      });

      // Update state for all redeemed items
      setRedeemedItems(prev => {
        const next = new Set(prev);
        offerIdsArray.forEach(id => next.add(id));
        return next;
      });

      setAvailableOffers(prev => 
        prev.map(o => {
          if (queuedOffers.has(o.id)) {
            const newRedemptionsCount = (o.redemptions_count || 0) + 1;
            const newRedemptions = [
              {
                id: Math.random().toString(),
                redeemed_at: new Date().toISOString(),
                bill_number: billNumber || undefined
              },
              ...(o.redemptions || [])
            ];
            return { 
              ...o, 
              is_redeemed: true,
              redemptions_count: newRedemptionsCount,
              redemptions: newRedemptions
            };
          }
          return o;
        })
      );

      setQueuedOffers(new Set());
      toast.success("Redemption processed successfully!");
    } catch (error: any) {
      console.error("Redemption failed:", error);
      toast.error(error.message || "Failed to process redemption");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setBillNumber("");
    setMobileNumber("");
    setMemberCode("");
    setOtp("");
    setSentOtp("");
    setMemberData(null);
    setAvailableOffers([]);
    setRedeemedItems(new Set());
    setQueuedOffers(new Set());
    setExpiryTime(null);
    setSearchNameQuery("");
    setSearchResults([]);
    setRemark("");
  };

  const handleRequestReversal = async () => {
    if (!reversalBillNumber || reversalBillNumber.trim() === "") {
      toast.error("Please enter a bill number to reverse");
      return;
    }

    setLoading(true);
    try {
      const res = await offerApi.requestReversal(reversalBillNumber.trim());
      setReversalStaffId(res.data.staff_id);
      setReversalMaskedMobile(res.data.masked_mobile);
      setReversalExpiryTime(res.data.expiry_time);
      setReversalStep("verify");
      toast.success(res.message || "OTP sent successfully!");
    } catch (err: any) {
      console.error("Reversal request failed:", err);
      toast.error(err.message || "Failed to initiate reversal");
    } finally {
      setLoading(false);
    }
  };

  const refreshAvailableOffers = async (mobile: string) => {
    try {
      const cleanMobile = mobile.trim();
      const offers = await offerApi.getAvailableOffers(cleanMobile);
      setAvailableOffers(offers.offers || []);
    } catch (error) {
      console.error("Error refreshing available offers:", error);
    }
  };

  const handleConfirmReversal = async () => {
    if (!reversalBillNumber || reversalBillNumber.trim() === "") {
      toast.error("Please enter a bill number to reverse");
      return;
    }

    setShowReverseConfirm(true);
  };

  const executeReversal = async () => {
    setLoading(true);
    try {
      const res = await offerApi.confirmReversal({
        bill_number: reversalBillNumber.trim(),
        otp: "000000",
        staff_id: 1
      });

      logActivity({
        activityType: 'benefit_reversal',
        entityType: 'redemption',
        entityName: `Reversal on Bill #${reversalBillNumber.trim()}`,
        action: 'update',
        section: 'Redemption - Reversal',
        details: {
          event: 'confirm_reversal',
          bill_number: reversalBillNumber.trim(),
          reversal_message: res.message
        }
      });

      toast.success(res.message || "Redemption reversed successfully!");
      
      // If we currently have a loaded member, refresh their offers list
      if (mobileNumber) {
        await refreshAvailableOffers(mobileNumber);
      }

      // Reset Reversal state
      setReversalBillNumber("");
      setReversalOtp("");
      setReversalStaffId(null);
      setReversalMaskedMobile("");
      setReversalExpiryTime(null);
      setReversalStep("input");
      setShowReverseConfirm(false);
    } catch (err: any) {
      console.error("Reversal confirmation failed:", err);
      toast.error(err.message || "Failed to confirm reversal");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = (member: any) => {
    setMobileNumber(member.mobile || "");
    setMemberCode(member.member_code || "");
    setSearchNameQuery(`${member.first_name || ""} ${member.last_name || ""}`.trim());
    toast.success(`Selected member: ${member.first_name} ${member.last_name}`);
  };

  const handleQrScanSuccess = async (decodedText: string) => {
    let parsedCode = decodedText.trim();
    try {
      if (parsedCode.startsWith("http://") || parsedCode.startsWith("https://")) {
        const url = new URL(parsedCode);
        const codeParam = url.searchParams.get("code") || url.searchParams.get("member_code");
        if (codeParam) {
          parsedCode = codeParam;
        } else {
          const paths = url.pathname.split("/").filter(Boolean);
          if (paths.length > 0) {
            parsedCode = paths[paths.length - 1];
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse scanned URL, using raw value:", e);
    }

    const uppercaseCode = parsedCode.toUpperCase();
    setMemberCode(uppercaseCode);
    setLoading(true);

    try {
      const member = await staffApi.getMemberByCode(uppercaseCode);
      if (!member) {
        toast.error(`Member not found with code: ${uppercaseCode}`);
        return;
      }
      if (!member.is_active) {
        toast.error(`Member account associated with code ${uppercaseCode} is inactive`);
        return;
      }

      handleSelectMember(member);
      toast.success(`Found and selected member: ${member.first_name} ${member.last_name}`);
    } catch (error) {
      console.error("Error looking up member by scanned QR code:", error);
      toast.error("Failed to lookup member from scanned QR code");
    } finally {
      setLoading(false);
    }
  };

  const handleNameSearch = async () => {
    const nameStr = searchNameQuery.trim();
    const phoneStr = mobileNumber.trim();
    const codeStr = memberCode.trim();

    if (!nameStr && !phoneStr && !codeStr) {
      toast.error("Please enter a Mobile Number, Member Code, or Name to search");
      return;
    }
    
    setSearchingNames(true);
    try {
      const result = await staffApi.getStaff({
        search: nameStr || undefined,
        mobile: phoneStr || undefined,
        member_code: codeStr || undefined,
        is_active: true,
        limit: 10
      });
      const transformedData = result.data || [];
      
      setSearchResults(transformedData);
      
      if (transformedData.length === 0) {
        toast.info("No matching members found");
      } else if (transformedData.length === 1) {
        handleSelectMember(transformedData[0]);
      } else {
        toast.success(`Found ${transformedData.length} matching member(s)`);
      }
    } catch (error) {
      console.error("Error searching member:", error);
      toast.error("Failed to search members");
    } finally {
      setSearchingNames(false);
    }
  };

  const renderInputStep = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="billNumber">Bill Number</Label>
        <Input
          id="billNumber"
          value={billNumber}
          onChange={(e) => setBillNumber(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!billExistsError) {
                handleSendOTP();
              }
            }
          }}
          placeholder="Enter bill number"
          className={cn("text-lg", billExistsError && "border-destructive focus-visible:ring-destructive")}
        />
        {billExistsError && (
          <p className="text-sm font-semibold text-destructive mt-1.5 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {billExistsError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <div className="space-y-1">
            <Label htmlFor="mobile">Member Mobile Number</Label>
            <Input
              id="mobile"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleNameSearch();
                }
              }}
              placeholder="+94 XXX XXX XXX"
              className="text-lg"
            />
          </div>

          <div className="pt-6 font-semibold text-muted-foreground text-sm text-center">OR</div>

          <div className="space-y-1">
            <Label htmlFor="memberCode">Member Code</Label>
            <Input
              id="memberCode"
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleNameSearch();
                }
              }}
              placeholder="e.g. MEM12345"
              className="text-lg font-mono uppercase"
            />
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Provide at least Mobile Number or Member Code to search the member.
        </p>
      </div>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-muted"></div>
        <span className="flex-shrink mx-4 text-muted-foreground text-xs uppercase font-semibold">Or Search by Name</span>
        <div className="flex-grow border-t border-muted"></div>
      </div>

      <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border/50">
        <div className="space-y-1">
          <Label htmlFor="searchNameQuery">Search by First Name or Last Name</Label>
          <Input
            id="searchNameQuery"
            value={searchNameQuery}
            onChange={(e) => setSearchNameQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleNameSearch();
              }
            }}
            placeholder="Enter first name or last name..."
            className="w-full"
          />
        </div>

        <Button 
          type="button" 
          variant="outline" 
          onClick={handleNameSearch} 
          disabled={searchingNames}
          className="w-full"
        >
          {searchingNames ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            "Search Member"
          )}
        </Button>

        {/* Search Results Table (mirroring Registered Members page, excluding actions) */}
        {searchResults.length > 0 && (
          <div className="border rounded-md mt-4 overflow-x-auto bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((member) => {
                  const isSelected = 
                    (memberCode.trim() !== "" && member.member_code?.toUpperCase() === memberCode.trim().toUpperCase()) ||
                    (mobileNumber.trim() !== "" && member.mobile === mobileNumber.trim());

                  return (
                    <TableRow 
                      key={member.id} 
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        isSelected && "bg-muted font-medium"
                      )}
                      onClick={() => handleSelectMember(member)}
                    >
                      <TableCell className={cn(
                        "font-mono font-semibold text-xs",
                        isSelected && "border-l-2 border-l-primary pl-2"
                      )}>{member.member_code || 'N/A'}</TableCell>
                      <TableCell className="text-xs font-medium">{`${member.title || ''} ${member.first_name} ${member.last_name}`}</TableCell>
                      <TableCell className="text-xs">{member.company_name || 'N/A'}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={getCategoryBadgeVariant(member.category_name)} className="text-[10px] py-0 px-1.5">
                          {member.category_name || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{member.mobile}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={member.is_active ? "default" : "secondary"} className="text-[10px] py-0 px-1.5">
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="remark">Remark</Label>
        <Input
          id="remark"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Enter any remarks or notes..."
          className="text-base"
        />
      </div>

      <div className="space-y-3 pt-2">
        <Button onClick={handleSendOTP} disabled={loading || !!billExistsError} size="lg" className="w-full">
          <Send className="mr-2 h-4 w-4" />
          {loading ? "Sending..." : "Send OTP"}
        </Button>

        <Button 
          type="button" 
          variant="outline" 
          size="lg" 
          className="w-full border-dashed border-primary/40 hover:border-primary/80 hover:bg-primary/5 text-primary"
          onClick={() => setIsScannerOpen(true)}
        >
          <QrCode className="mr-2 h-5 w-5" />
          Click to Scan QR Code
        </Button>

        {/* <Button onClick={handleSendOTP} disabled={loading} size="lg" className="w-full" variant="secondary">
          <Send className="mr-2 h-4 w-4" />
          {loading ? "Sending..." : "Send OTP"}
        </Button> */}
      </div>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-6">
      <div className="bg-muted rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">Bill Number: {billNumber}</p>
        <p className="text-sm text-muted-foreground">OTP sent to: {mobileNumber}</p>
        {expiryTime && (
          <div className="text-xs text-muted-foreground">
            {secondsLeft > 0 ? (
              <p>OTP expires in: <span className="font-mono font-bold text-foreground">{formatTimeLeft(secondsLeft)}</span></p>
            ) : (
              <p className="text-destructive font-semibold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> OTP has expired
              </p>
            )}
          </div>
        )}
        {sentOtp && (
          <p className="text-xs font-medium text-primary mt-2">
            OTP code send to mobile number
          </p>
        )}
      </div>

      <div className="space-y-4 text-center">
        <Label htmlFor="otp">Enter 6-digit OTP</Label>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
            <InputOTPGroup>
              {[...Array(6)].map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        
        <div className="space-y-2 pt-2">
          <Button onClick={handleVerifyOTP} disabled={loading || secondsLeft <= 0} size="lg" className="w-full">
            {loading ? "Verifying..." : "Verify OTP & Load Benefits"}
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleSendOTP} 
              disabled={loading} 
              variant="outline" 
              className={cn(
                "w-full",
                secondsLeft <= 0 && "border-primary text-primary animate-pulse font-semibold"
              )}
            >
              {loading ? "Sending..." : "Resend OTP"}
            </Button>
            <Button 
              onClick={() => {
                setOtp("");
                setStep("input");
              }} 
              disabled={loading} 
              variant="ghost" 
              className="w-full"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBenefitsStep = () => {
    const hasDiscount = memberData?.discount_enabled;
    const discountRedeemed = redeemedItems.has('discount');
    const hasOffers = availableOffers.length > 0;

    return (
      <div className="space-y-6">
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">Customer: {memberData?.first_name} {memberData?.last_name}</p>
          <p className="text-sm text-muted-foreground">Bill Number: {billNumber}</p>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Available Benefits</h3>

          {/* Discount Section */}
          {hasDiscount && (
            <Card className={discountRedeemed ? "border-success bg-success/5" : ""}>
              {/* <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3 flex-1">
                    <div className="rounded-full bg-primary/10 p-2 h-fit">
                      <Percent className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium flex items-center gap-2">
                        Discount
                        {discountRedeemed && (
                          <Badge variant="outline" className="text-success border-success">
                            Applied
                          </Badge>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {memberData.discount_percentage}% discount
                        {memberData.discount_amount > 0 && 
                          ` (Max: LKR ${memberData.discount_amount.toLocaleString()})`
                        }
                      </p>
                    </div>
                  </div>
                  <div>
                    {discountRedeemed ? (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Applied</span>
                      </div>
                    ) : (
                      <Button
                        onClick={handleRedeemDiscount}
                        disabled={loading}
                        size="sm"
                      >
                        Apply Discount
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent> */}
            </Card>
          )}

          {/* Offers Section */}
          {hasOffers ? (
            <>
              {availableOffers.map((offer) => {
                const redemptionsCount = offer.redemptions_count || 0;
                const usageLimit = offer.usage_limit;
                const isRecurrent = offer.is_recurrent;

                let isRedeemed = false;
                if (isRecurrent) {
                  if (usageLimit !== null && usageLimit !== undefined) {
                    isRedeemed = redemptionsCount >= usageLimit || redeemedItems.has(offer.id);
                  } else {
                    isRedeemed = redeemedItems.has(offer.id);
                  }
                } else {
                  isRedeemed = offer.is_redeemed || redemptionsCount >= 1 || redeemedItems.has(offer.id);
                }

                let recurrenceText = "";
                if (isRecurrent) {
                  if (usageLimit !== null && usageLimit !== undefined) {
                    const left = Math.max(0, usageLimit - redemptionsCount);
                    recurrenceText = `Recurrent (${redemptionsCount} used, ${left} available)`;
                  } else {
                    recurrenceText = `Recurrent (Unlimited - ${redemptionsCount} used)`;
                  }
                } else {
                  const left = isRedeemed ? 0 : 1;
                  recurrenceText = `One-time (${redemptionsCount} used, ${left} available)`;
                }

                let validityText = "";
                if (offer.valid_from && offer.valid_to) {
                  validityText = `Validity: ${new Date(offer.valid_from).toLocaleDateString()} - ${new Date(offer.valid_to).toLocaleDateString()}`;
                } else if (offer.valid_to) {
                  validityText = `Expires: ${new Date(offer.valid_to).toLocaleDateString()}`;
                } else if (offer.valid_from) {
                  validityText = `Valid From: ${new Date(offer.valid_from).toLocaleDateString()}`;
                } else {
                  validityText = "Validity: Unlimited / No Expiry";
                }

                return (
                  <Card 
                    key={offer.id} 
                    className={`transition-colors border ${
                      isRedeemed 
                        ? "border-red-200 dark:border-red-900/30 bg-red-500/5 dark:bg-red-950/10 opacity-90" 
                        : "border-green-200 dark:border-green-900/30 bg-green-500/5 dark:bg-green-950/10 hover:border-green-300"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 flex-1">
                          <div className="rounded-full bg-secondary/10 p-2 h-fit">
                            <Gift className="h-5 w-5 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-semibold text-sm ${isRedeemed ? "text-red-700 dark:text-red-400 line-through" : "text-green-700 dark:text-green-400"}`}>
                                {offer.name}
                              </h4>
                              <Badge 
                                className={`text-[10px] py-0 px-1.5 font-semibold ${
                                  isRedeemed 
                                    ? "bg-red-600 text-white hover:bg-red-700" 
                                    : "bg-green-600 text-white hover:bg-green-700"
                                }`}
                              >
                                {isRedeemed ? "Used" : "Active"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{offer.description}</p>
                            
                            <div className="flex flex-col gap-1 mt-2 text-[11px] text-muted-foreground">
                              <p className="font-medium text-foreground/80">
                                {recurrenceText}
                              </p>
                              <p>
                                {validityText}
                              </p>
                              
                              {(offer.min_bill_value || offer.max_discount_amount) && (
                                <p className="space-x-2">
                                  {offer.min_bill_value && (
                                    <span>Min Bill: LKR {offer.min_bill_value.toLocaleString()}</span>
                                  )}
                                  {offer.min_bill_value && offer.max_discount_amount && <span>•</span>}
                                  {offer.max_discount_amount && (
                                    <span>Max Discount: LKR {offer.max_discount_amount.toLocaleString()}</span>
                                  )}
                                </p>
                              )}
                            </div>

                            {/* Redemption history details inside card */}
                            {offer.redemptions && offer.redemptions.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-dashed border-border/60">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Redemption History</p>
                                <div className="space-y-1">
                                  {offer.redemptions.map((redemption: any) => (
                                    <div key={redemption.id} className="flex justify-between items-center text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded">
                                      <span>Redeemed: {new Date(redemption.redeemed_at).toLocaleDateString()}</span>
                                      {redemption.bill_number && <span className="font-mono">Bill: #{redemption.bill_number}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          {isRedeemed ? (
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <CheckCircle className="h-5 w-5" />
                              <span className="text-sm font-semibold">Redeemed</span>
                            </div>
                          ) : queuedOffers.has(offer.id) ? (
                            <Button
                              onClick={() => handleRedeemOffer(offer)}
                              disabled={loading}
                              size="sm"
                              variant="destructive"
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleRedeemOffer(offer)}
                              disabled={loading}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Redeem
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          ) : !hasDiscount && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No benefits available for this member</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={handleReset} variant="outline" size="lg" className="flex-1">
            Cancel / Reset
          </Button>
          {queuedOffers.size > 0 && (
            <Button
              onClick={handleProcessRedemption}
              disabled={loading}
              size="lg"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Complete Redemption (${queuedOffers.size})`
              )}
            </Button>
          )}
        </div>

        {/* Discount History Section */}
        {/* {discountHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Recent Discount Redemptions</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Discount Type</TableHead>
                    <TableHead className="text-right">Discount Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discountHistory.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm">
                        {format(new Date(record.redeemed_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {record.bill_number}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <p className="font-medium">
                            {record.members?.first_name} {record.members?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {record.members?.member_code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {record.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {record.discount_type === 'percentage' 
                          ? `${record.discount_value}%` 
                          : `LKR ${parseFloat(record.discount_value).toLocaleString()}`
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )} */}

        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex gap-3">

          <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-accent-foreground">Important Notes</p>
            <ul className="text-muted-foreground mt-1 space-y-1">
              <li>• Only one corporate discount per bill</li>
              <li>• Offers can only be redeemed once per customer</li>
              <li>• All redemptions are logged for audit purposes</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderReversalInputStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="reversalBillNumber">Bill Number to Reverse</Label>
        <Input
          id="reversalBillNumber"
          value={reversalBillNumber}
          onChange={(e) => setReversalBillNumber(e.target.value)}
          placeholder="Enter bill number (e.g. BILL-999)"
          className="text-lg font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Enter the bill number of the transaction you wish to reverse.
        </p>
      </div>

      <Button 
        onClick={handleConfirmReversal} 
        disabled={loading || !reversalBillNumber.trim()} 
        size="lg" 
        className="w-full bg-destructive hover:bg-destructive/90 text-white font-semibold"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Reversing...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Reverse Redemption
          </>
        )}
      </Button>
    </div>
  );

  const renderReversalVerifyStep = () => (
    <div className="space-y-6">
      <div className="bg-muted rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">Reversing Bill: {reversalBillNumber}</p>
        <p className="text-sm text-muted-foreground">OTP sent to customer mobile: {reversalMaskedMobile}</p>
        {reversalExpiryTime && (
          <div className="text-xs text-muted-foreground">
            {reversalSecondsLeft > 0 ? (
              <p>OTP expires in: <span className="font-mono font-bold text-foreground">{formatTimeLeft(reversalSecondsLeft)}</span></p>
            ) : (
              <p className="text-destructive font-semibold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> OTP has expired
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4 text-center">
        <Label htmlFor="reversalOtp">Enter 6-digit OTP Code</Label>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={reversalOtp} onChange={(value) => setReversalOtp(value)}>
            <InputOTPGroup>
              {[...Array(6)].map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        
        <div className="space-y-2 pt-2">
          <Button 
            onClick={handleConfirmReversal} 
            disabled={loading || reversalSecondsLeft <= 0} 
            size="lg" 
            className="w-full bg-destructive hover:bg-destructive/90 text-white font-semibold"
          >
            {loading ? "Reversing..." : "Confirm & Reverse Redemption"}
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleRequestReversal} 
              disabled={loading} 
              variant="outline" 
              className={cn(
                "w-full",
                reversalSecondsLeft <= 0 && "border-primary text-primary animate-pulse font-semibold"
              )}
            >
              Resend OTP
            </Button>
            <Button 
              onClick={() => {
                setReversalOtp("");
                setReversalStep("input");
              }} 
              disabled={loading} 
              variant="ghost" 
              className="w-full"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif">
              {canReverse ? "Redemption & Reversal" : "Redemption"}
            </CardTitle>
          </div>
          <CardDescription>
            {canReverse 
              ? "Verify members to redeem benefits, or reverse a previous bill redemption." 
              : "Verify members to redeem benefits."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
            <TabsList className={cn("grid w-full mb-6", canReverse ? "grid-cols-2" : "grid-cols-1")}>
              <TabsTrigger value="redeem">Redeem Benefits</TabsTrigger>
              {canReverse && <TabsTrigger value="reverse">Reverse Redemption</TabsTrigger>}
            </TabsList>

            <TabsContent value="redeem" className="space-y-4">
              {step === "input" && renderInputStep()}
              {step === "verify" && renderVerifyStep()}
              {step === "benefits" && renderBenefitsStep()}
            </TabsContent>

            {canReverse && (
              <TabsContent value="reverse" className="space-y-4">
                {renderReversalInputStep()}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <QrScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleQrScanSuccess}
      />

      <AlertDialog open={showReverseConfirm} onOpenChange={setShowReverseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse Redemption</AlertDialogTitle>
            <AlertDialogDescription className="text-red-600 dark:text-red-400">
              Are you sure you want to reverse all redemptions for bill number{" "}
              <span className="font-semibold">{reversalBillNumber.trim()}</span>? This action will cancel the redemption records for this bill.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeReversal}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Reversing...
                </>
              ) : (
                "Reverse Redemption"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Redemption;
