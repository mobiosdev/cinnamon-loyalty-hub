import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Gift, Send, CheckCircle, AlertCircle, Percent } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { offerApi } from "@/services/offerApi";
import { staffApi } from "@/services/staffApi";
import { validateAndNormalizeSriLankanMobile } from "@/utils/phoneUtils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import axios from "axios";

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
  const [otp, setOtp] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [expiryTime, setExpiryTime] = useState<string | null>(null);
  
  // Member and benefits data
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [availableOffers, setAvailableOffers] = useState<AvailableOffer[]>([]);
  const [redeemedItems, setRedeemedItems] = useState<Set<string>>(new Set());
  const [discountHistory, setDiscountHistory] = useState<any[]>([]);

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
    if (!billNumber || !mobileNumber) {
      toast.error("Please fill all fields");
      return;
    }

    // Validate and normalize phone number
    const phoneValidation = validateAndNormalizeSriLankanMobile(mobileNumber);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error || "Invalid mobile number");
      return;
    }

    setLoading(true);

    try {
      // Generate a 4-digit OTP code
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

      // Call SMS API
      await axios.get('https://msg.text-ware.com/send_sms.php', {
        params: {
          username: 'TW00001_ntb_demo_tr',
          password: 'tisJFd9jH@1aR',
          src: 'TWTEST',
          dst: phoneValidation.normalized,
          msg: 'Dear Member, The verification code for redeeming your discount at Cinnamon Grand is: '+generatedOtp+' Please use this code to complete your redemption. Kindly refrain from sharing this code with anyone else.',
          dr: '1'
        }
      });
      
      setSentOtp(generatedOtp);
      
      // Set expiry time (5 minutes from now)
      const expiryDate = new Date(Date.now() + 5 * 60 * 1000);
      setExpiryTime(expiryDate.toISOString());
      
      setStep("verify");
      toast.success(`OTP sent to ${mobileNumber}`);
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
    setOtp("");
    setSentOtp("");
    setMemberData(null);
    setAvailableOffers([]);
    setRedeemedItems(new Set());
    setExpiryTime(null);
  };

  const renderInputStep = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="billNumber">Bill Number *</Label>
        <Input
          id="billNumber"
          value={billNumber}
          onChange={(e) => setBillNumber(e.target.value)}
          placeholder="Enter bill number"
          className="text-lg"
        />
      </div>

      <div>
        <Label htmlFor="mobile">Customer Mobile Number *</Label>
        <Input
          id="mobile"
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          placeholder="+94 XXX XXX XXX"
          className="text-lg"
        />
        <p className="text-xs text-muted-foreground mt-1">
          OTP will be sent via SMS
        </p>
      </div>

      <Button onClick={handleSendOTP} disabled={loading} size="lg" className="w-full">
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Sending..." : "Send OTP"}
      </Button>
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
            Verify customer and redeem all available benefits in one place
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
