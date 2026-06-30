import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Gift, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { offerApi } from "@/services/offerApi";
import { logActivity } from "@/utils/auditLogger";

type RedemptionStep = "input" | "select" | "success";

const OfferRedemption = () => {
  const [step, setStep] = useState<RedemptionStep>("input");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [availableOffers, setAvailableOffers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckOffers = async () => {
    if (!customerPhone || !billNumber) {
      toast.error("Please enter search criteria and bill number");
      return;
    }

    setLoading(true);
    try {
      const response = await offerApi.getAvailableOffers(customerPhone);
      if (!response.member) {
        toast.error("No member found matching this search criteria");
        return;
      }
      setMember(response.member);
      setAvailableOffers(response.offers);
      setStep("select");
    } catch (error) {
      toast.error("Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemOffer = async (offer: any) => {
    if (offer.is_redeemed) {
      toast.error("This offer has already been redeemed");
      return;
    }

    if (!member) {
      toast.error("No member details found");
      return;
    }

    setLoading(true);
    try {
      await offerApi.redeemOffer({
        offer_id: offer.id,
        customer_phone: member.mobile,
        bill_number: billNumber,
        redeemed_by: 1, // TODO: Get from auth
      });
      
      // Log offer redemption
      await logActivity({
        activityType: 'offer_redemption',
        entityType: 'redemption',
        entityId: offer.id,
        entityName: member.mobile,
        action: 'redeem',
        details: {
          offer_name: offer.name,
          bill_number: billNumber,
          customer_phone: member.mobile,
          member_name: `${member.first_name} ${member.last_name}`,
          member_code: member.member_code
        }
      });
      
      setSelectedOffer(offer);
      setStep("success");
      toast.success("Offer redeemed successfully!");
    } catch (error) {
      toast.error("Failed to redeem offer");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setCustomerPhone("");
    setBillNumber("");
    setAvailableOffers([]);
    setSelectedOffer(null);
    setMember(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif">Physical Offer Redemption</CardTitle>
          </div>
          <CardDescription>
            Redeem cakes, vouchers, and other physical rewards for customers
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "input" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerPhone">Search Member (Phone, Code, or Name) *</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter mobile, member code, or name"
                  className="text-lg"
                />
              </div>

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

              <Button onClick={handleCheckOffers} disabled={loading} size="lg" className="w-full">
                {loading ? "Checking..." : "Check Available Offers"}
              </Button>
            </div>
          )}

          {step === "select" && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium">Customer: {member?.first_name} {member?.last_name} ({member?.member_code || 'N/A'})</p>
                <p className="text-sm text-muted-foreground">Mobile: {member?.mobile}</p>
                <p className="text-sm text-muted-foreground">Bill: {billNumber}</p>
              </div>

              <div>
                <h3 className="font-medium mb-3">Available Offers</h3>
                <div className="space-y-3">
                  {availableOffers.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground bg-card border rounded-lg">
                      No offers are assigned to this member.
                    </div>
                  ) : (
                    availableOffers.map((offer) => (
                      <Card key={offer.id} className={offer.is_redeemed ? "opacity-50" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{offer.name}</h4>
                              <p className="text-sm text-muted-foreground">{offer.description}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              {offer.is_redeemed ? (
                                <Badge variant="secondary">Already Redeemed</Badge>
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
                    ))
                  )}
                </div>
              </div>

              <Button onClick={handleReset} variant="outline" className="w-full">
                Cancel
              </Button>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-success/10 p-4">
                  <CheckCircle className="h-12 w-12 text-success" />
                </div>
              </div>

              <h3 className="text-2xl font-serif font-semibold text-success">Offer Redeemed!</h3>

              <div className="bg-card border rounded-lg p-6 space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{member?.first_name} {member?.last_name} ({member?.member_code || 'N/A'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mobile:</span>
                  <span className="font-medium">{member?.mobile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bill Number:</span>
                  <span className="font-medium">{billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Offer:</span>
                  <Badge variant="secondary" className="text-base">
                    {selectedOffer?.name}
                  </Badge>
                </div>
              </div>

              <Button onClick={handleReset} variant="outline" size="lg" className="w-full">
                Redeem Another Offer
              </Button>
            </div>
          )}

          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-accent-foreground">Offer Redemption</p>
              <p className="text-muted-foreground">
                Each offer can only be redeemed once per customer. Management can reactivate offers if needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfferRedemption;
