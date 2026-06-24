import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Gift, Send, CheckCircle, AlertCircle, Percent, QrCode, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { offerApi } from "@/services/offerApi";
import { staffApi } from "@/services/staffApi";
import { validateAndNormalizeSriLankanMobile } from "@/utils/phoneUtils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import axios from "axios";
import { cn } from "@/lib/utils";

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
}

const Redemption = () => {
  const [step, setStep] = useState<RedemptionStep>("input");
  const [billNumber, setBillNumber] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [otp, setOtp] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [expiryTime, setExpiryTime] = useState<string | null>(null);
  
  // Member and benefits data
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [availableOffers, setAvailableOffers] = useState<AvailableOffer[]>([]);
  const [redeemedItems, setRedeemedItems] = useState<Set<string>>(new Set());
  const [discountHistory, setDiscountHistory] = useState<any[]>([]);

  // Name search and remark states
  const [searchNameQuery, setSearchNameQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingNames, setSearchingNames] = useState(false);
  const [remark, setRemark] = useState("");

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

  const fetchDiscountHistory = async (phone: string) => {
    try {
      // Normalize phone for search
      const phoneValidation = validateAndNormalizeSriLankanMobile(phone);
      const searchFormats = [
        phoneValidation.isValid ? phoneValidation.normalized : phone,
        phoneValidation.isValid ? `+${phoneValidation.normalized}` : phone,
        phone
      ];

      const { data, error } = await supabase
        .from('discount_redemptions')
        .select(`
          *,
          members (
            first_name,
            last_name,
            member_code
          )
        `)
        .in('customer_phone', searchFormats)
        .order('redeemed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDiscountHistory(data || []);
    } catch (error) {
      console.error('Error fetching discount history:', error);
    }
  };

  const handleSendOTP = async () => {
    // if (!billNumber) {
    //   toast.error("Please enter a bill number");
    //   return;
    // }

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

      // Generate a 4-digit OTP code
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

      // Call SMS API
      await axios.get('https://msg.text-ware.com/send_sms.php', {
        params: {
          username: 'TW00001_ntb_demo_tr',
          password: 'tisJFd9jH@1aR',
          src: 'TWTEST',
          dst: finalMobileNumber,
          msg: 'Dear Member, The verification code for redeeming your discount at Cinnamon Grand is: '+generatedOtp+' Please use this code to complete your redemption. Kindly refrain from sharing this code with anyone else.',
          dr: '1'
        }
      });
      
      setSentOtp(generatedOtp);
      
      // Set expiry time (5 minutes from now)
      const expiryDate = new Date(Date.now() + 5 * 60 * 1000);
      setExpiryTime(expiryDate.toISOString());
      
      setStep("verify");
      toast.success(`OTP sent to ${finalMobileNumber}`);
    } catch (error) {
      console.error("Error sending OTP SMS:", error);
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      toast.error("Please enter complete OTP");
      return;
    }

    // Check expiry
    if (expiryTime && new Date() > new Date(expiryTime)) {
      toast.error("OTP has expired. Please request a new one.");
      return;
    }

    // Validate OTP - accept either the sent OTP or "1234" for testing fallback
    if (otp !== sentOtp && otp !== "1234") {
      toast.error("Invalid OTP. Please enter the code sent to your mobile.");
      return;
    }

    setLoading(true);

    try {
      const phoneValidation = validateAndNormalizeSriLankanMobile(mobileNumber);
      const cleanMobile = phoneValidation.normalized!;
      
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
      setAvailableOffers(offers);
      setStep("benefits");
      
      // Fetch discount history
      const phoneToUse = phoneValidation.normalized!;
      await fetchDiscountHistory(phoneToUse);
      
      toast.success("OTP verified! Select benefits to redeem.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load member data");
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
      const { error } = await supabase
        .from('discount_redemptions')
        .insert({
          member_id: memberData.id,
          bill_number: billNumber,
          customer_phone: phoneToSave,
          discount_type: memberData.discount_amount > 0 ? 'fixed' : 'percentage',
          discount_value: memberData.discount_amount > 0 ? memberData.discount_amount : memberData.discount_percentage,
          discount_amount: null, // Could be calculated if you have bill amount
          redeemed_by: 1 // TODO: Get from auth
        });

      if (error) throw error;

      // Fetch updated history
      await fetchDiscountHistory(phoneToSave);

      setRedeemedItems(prev => new Set(prev).add('discount'));
      toast.success("Discount applied successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply discount");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemOffer = async (offer: AvailableOffer) => {
    if (offer.is_redeemed) {
      toast.error("This offer has already been redeemed");
      return;
    }

    setLoading(true);
    try {
      // Normalize phone number for consistent storage
      const phoneValidation = validateAndNormalizeSriLankanMobile(mobileNumber);
      const phoneToSave = phoneValidation.isValid ? phoneValidation.normalized! : mobileNumber;

      await offerApi.redeemOffer({
        offer_id: offer.id,
        customer_phone: phoneToSave,
        bill_number: billNumber,
        redeemed_by: 1, // TODO: Get from auth
      });
      
      setRedeemedItems(prev => new Set(prev).add(offer.id));
      setAvailableOffers(prev => 
        prev.map(o => o.id === offer.id ? { ...o, is_redeemed: true } : o)
      );
      toast.success(`${offer.name} redeemed successfully!`);
    } catch (error) {
      toast.error("Failed to redeem offer");
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
    setExpiryTime(null);
    setSearchNameQuery("");
    setSearchResults([]);
    setRemark("");
  };

  const handleSelectMember = (member: any) => {
    setMobileNumber(member.mobile || "");
    setMemberCode(member.member_code || "");
    toast.success(`Selected member: ${member.first_name} ${member.last_name}`);
  };

  const handleNameSearch = async () => {
    if (!searchNameQuery.trim()) {
      toast.error("Please enter a name to search");
      return;
    }
    
    setSearchingNames(true);
    try {
      let query = supabase
        .from('members')
        .select(`
          *,
          companies (
            name
          ),
          customer_categories (
            name
          )
        `);

      // Only get active and non-deleted members
      query = query.eq('is_active', true).or('is_deleted.eq.false,is_deleted.is.null');

      const trimmedQuery = searchNameQuery.trim();
      if (trimmedQuery) {
        query = query.or(`first_name.ilike.%${trimmedQuery}%,last_name.ilike.%${trimmedQuery}%`);
      }

      const { data, error } = await query.limit(10);
      
      if (error) throw error;
      
      const transformedData = (data || []).map((member: any) => ({
        ...member,
        company_name: member.companies?.name,
        category_name: member.customer_categories?.name,
      }));

      setSearchResults(transformedData);
      
      if (transformedData.length === 0) {
        toast.info("No matching members found");
      } else if (transformedData.length === 1) {
        handleSelectMember(transformedData[0]);
      } else {
        toast.success(`Found ${transformedData.length} matching member(s)`);
      }
    } catch (error) {
      console.error("Error searching member by name:", error);
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
          placeholder="Enter bill number"
          className="text-lg"
        />
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <div className="space-y-1">
            <Label htmlFor="mobile">Member Mobile Number</Label>
            <Input
              id="mobile"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
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
        <Button onClick={handleSendOTP} disabled={loading} size="lg" className="w-full">
          <Send className="mr-2 h-4 w-4" />
          {loading ? "Sending..." : "Send OTP"}
        </Button>

        <Button 
          type="button" 
          variant="outline" 
          size="lg" 
          className="w-full border-dashed border-primary/40 hover:border-primary/80 hover:bg-primary/5 text-primary"
          onClick={() => toast.info("QR Code scanner opening...")}
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
          <p className="text-xs text-muted-foreground">
            OTP expires at: {formatExpiryTime(expiryTime)}
          </p>
        )}
        {sentOtp && (
          <p className="text-xs font-medium text-primary mt-2">
            OTP code send to mobile number
          </p>
        )}
      </div>

      <div className="space-y-4 text-center">
        <Label htmlFor="otp">Enter 4-digit OTP</Label>
        <div className="flex justify-center">
          <InputOTP maxLength={4} value={otp} onChange={(value) => setOtp(value)}>
            <InputOTPGroup>
              {[...Array(4)].map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button onClick={handleVerifyOTP} disabled={loading} size="lg" className="w-full">
          {loading ? "Verifying..." : "Verify OTP & Load Benefits"}
        </Button>
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
              <CardContent className="p-4">
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
              </CardContent>
            </Card>
          )}

          {/* Offers Section */}
          {hasOffers ? (
            <>
              {availableOffers.map((offer) => {
                const isRedeemed = offer.is_redeemed || redeemedItems.has(offer.id);
                return (
                  <Card key={offer.id} className={isRedeemed ? "border-success bg-success/5 opacity-75" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 flex-1">
                          <div className="rounded-full bg-secondary/10 p-2 h-fit">
                            <Gift className="h-5 w-5 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium flex items-center gap-2">
                              {offer.name}
                              {isRedeemed && (
                                <Badge variant="outline" className="text-success border-success">
                                  Redeemed
                                </Badge>
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                            {(offer.min_bill_value || offer.max_discount_amount) && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {offer.min_bill_value && (
                                  <span>Min Bill: LKR {offer.min_bill_value.toLocaleString()}</span>
                                )}
                                {offer.min_bill_value && offer.max_discount_amount && (
                                  <span className="mx-2">•</span>
                                )}
                                {offer.max_discount_amount && (
                                  <span>Max Discount: LKR {offer.max_discount_amount.toLocaleString()}</span>
                                )}
                              </p>
                            )}
                            {isRedeemed && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                This offer can only be redeemed once
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          {isRedeemed ? (
                            <div className="flex items-center gap-2 text-success">
                              <CheckCircle className="h-5 w-5" />
                              <span className="text-sm font-medium">Redeemed</span>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleRedeemOffer(offer)}
                              disabled={loading}
                              size="sm"
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
            Process Another Bill
          </Button>
        </div>

        {/* Discount History Section */}
        {discountHistory.length > 0 && (
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
        )}

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

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif">Redemption</CardTitle>
          </div>
          <CardDescription>
            Verify members and redeem benefits
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "input" && renderInputStep()}
          {step === "verify" && renderVerifyStep()}
          {step === "benefits" && renderBenefitsStep()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Redemption;
