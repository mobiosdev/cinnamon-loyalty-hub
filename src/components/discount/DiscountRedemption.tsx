import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Send, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { logActivity } from "@/utils/auditLogger";

type RedemptionStep = "input" | "verify" | "success";

const DiscountRedemption = () => {
  const [step, setStep] = useState<RedemptionStep>("input");
  const [billNumber, setBillNumber] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [contactType, setContactType] = useState<"email" | "mobile">("email");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [expiryTime, setExpiryTime] = useState<string | null>(null);

  // Mock discount data
  const [discountData] = useState({
    companyName: "ABC Corporation",
    staffName: "John Doe",
    discountAmount: "15%",
    maxDiscount: "LKR 5,000",
  });

  const formatExpiryTime = (timeString: string | null) => {
    if (!timeString) return "";
    const date = new Date(timeString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const handleSendOTP = async () => {
    if (!billNumber || !contactInfo) {
      toast.error("Please fill all fields");
      return;
    }

    const mobileNumber = contactInfo.replace(/[^\d+]/g, "");
    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7050/api';
      const response = await fetch(`${apiBase}/transaction/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: mobileNumber,
          notes: `Your OTP for bill #${billNumber}`,
          user_id: 1,
          bill_number: billNumber,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to send OTP");

      setStaffId(data.data.staff_id);
      setExpiryTime(data.data.expiry_time);
      setStep("verify");
      toast.success(data.message || `OTP sent to ${contactInfo}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter complete OTP");
      return;
    }

    if (!staffId) {
      toast.error("Invalid session. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7050/api';
      const verifyResponse = await fetch(`${apiBase}/transaction/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: contactInfo.replace(/[^\d+]/g, ""),
          otp,
          staff_id: staffId,
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verifyData.message || "OTP verification failed");

      const pendingResponse = await fetch(`${apiBase}/transaction/pending`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: contactInfo.replace(/[^\d+]/g, ""),
          notes: `Discount redemption for bill #${billNumber}`,
          user_id: 1,
          bill_number: billNumber,
        }),
      });

      const pendingData = await pendingResponse.json();
      if (!pendingResponse.ok) throw new Error(pendingData.message || "Failed to process discount");

      // Log discount redemption
      await logActivity({
        activityType: 'discount_redemption',
        entityType: 'redemption',
        entityId: billNumber,
        entityName: contactInfo,
        action: 'redeem',
        details: {
          bill_number: billNumber,
          discount_type: 'percentage',
          contact_info: contactInfo
        }
      });

      setStep("success");
      toast.success("Discount applied successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setBillNumber("");
    setContactInfo("");
    setOtp("");
  };

  const detectContactType = (value: string) => {
    setContactInfo(value);
    if (value.includes("@")) setContactType("email");
    else if (value.match(/^\+?[\d\s]+$/)) setContactType("mobile");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif">Front Desk - Discount Redemption</CardTitle>
          </div>
          <CardDescription>
            Apply corporate discount to customer bills via OTP verification
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Input */}
          {step === "input" && (
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
                <Label htmlFor="contact">Customer Mobile *</Label>
                <Input
                  id="contact"
                  value={contactInfo}
                  onChange={(e) => detectContactType(e.target.value)}
                  placeholder="+94 XXX XXX XXX"
                  className="text-lg"
                />
                {contactInfo && (
                  <p className="text-xs text-muted-foreground">
                    OTP will be sent via {contactType === "email" ? "Email" : "SMS"}
                  </p>
                )}
              </div>

              <Button onClick={handleSendOTP} disabled={loading} size="lg" className="w-full">
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            </div>
          )}

          {/* Step 2: Verify OTP */}
          {step === "verify" && (
            <div className="space-y-6">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Bill Number: {billNumber}</p>
                <p className="text-sm text-muted-foreground">OTP sent to: {contactInfo}</p>
                {expiryTime && (
                  <p className="text-xs text-muted-foreground">
                    OTP expires at: {formatExpiryTime(expiryTime)}
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
                <Button onClick={handleVerifyOTP} disabled={loading} size="lg" className="w-full">
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-success/10 p-4">
                  <CheckCircle className="h-12 w-12 text-success" />
                </div>
              </div>

              <h3 className="text-2xl font-serif font-semibold text-success">Discount Applied!</h3>
              <p className="text-muted-foreground">Bill #{billNumber}</p>

              <div className="bg-card border rounded-lg p-6 space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company:</span>
                  <span className="font-medium">{discountData.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff Member:</span>
                  <span className="font-medium">{discountData.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount:</span>
                  <Badge variant="secondary" className="text-base">
                    {discountData.discountAmount}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Maximum:</span>
                  <span>{discountData.maxDiscount}</span>
                </div>
              </div>

              <Button onClick={handleReset} variant="outline" size="lg" className="w-full">
                Process Another Bill
              </Button>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-accent-foreground">One Discount Per Bill</p>
              <p className="text-muted-foreground">
                Each bill can only have one corporate discount applied.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiscountRedemption;
