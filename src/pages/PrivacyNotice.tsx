import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ShieldCheck, ArrowLeft, Mail, Phone, Lock, FileText, 
  CheckCircle2, AlertCircle, Send, Download, ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { staffApi } from "@/services/staffApi";
import cinnamonLogo from "@/assets/cinnamon-logo.png";

export default function PrivacyNotice() {
  const [formData, setFormData] = useState({
    requester_name: "",
    requester_email: "",
    requester_phone: "",
    member_code: "",
    request_type: "access",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requester_name) {
      toast.error("Please enter your name.");
      return;
    }
    if (!formData.requester_email && !formData.requester_phone) {
      toast.error("Please provide either an email or phone number for verification.");
      return;
    }

    try {
      setSubmitting(true);
      await staffApi.submitDsarRequest({
        requester_name: formData.requester_name,
        requester_email: formData.requester_email || undefined,
        requester_phone: formData.requester_phone || undefined,
        member_code: formData.member_code || undefined,
        request_type: formData.request_type,
        channel: "web"
      });
      setSubmitted(true);
      toast.success("Your request has been recorded. Our Data Protection team will respond within 30 days.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={cinnamonLogo} alt="Cinnamon Grand Colombo" className="h-9 w-auto object-contain" />
            <div className="border-l pl-3 ml-1 border-slate-300 dark:border-slate-700">
              <span className="text-sm font-semibold text-[#8b1874]">Privacy &amp; Data Protection</span>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#2e0854] to-[#4b1263] text-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="h-4 w-4" /> Personal Data Protection Act Notice
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Privacy Notice &amp; Data Subject Rights</h1>
          <p className="mt-3 text-slate-200 max-w-2xl text-sm sm:text-base leading-relaxed">
            Cinnamon Grand Colombo is committed to safeguarding your personal information in strict compliance with the
            Sri Lanka Personal Data Protection Act No. 9 of 2022 and the Personal Data Protection (Amendment) Act No. 22 of 2025.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Notice Details */}
        <div className="lg:col-span-2 space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">1. Data Controller Information</CardTitle>
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                  DRAFT - PENDING LEGAL APPROVAL
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p>
                <strong>Cinnamon Grand Colombo</strong> (operating the Cinnamon Loyalty Program) acts as the Data Controller responsible for the lawful collection, processing, and protection of your personal data.
              </p>
              <div className="mt-3 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-xs space-y-1">
                <div><strong>Address:</strong> 77 Galle Road, Colombo 00300, Sri Lanka [Subject to final corporate verification]</div>
                <div><strong>Privacy Contact:</strong> privacy@cinnamonhotels.com / grand@cinnamonhotels.com [Designated DPO contact pending formal appointment]</div>
                <div><strong>Governing Law:</strong> Sri Lanka Personal Data Protection Act No. 9 of 2022 &amp; Amendment Act No. 22 of 2025</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">2. Personal Data We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>We collect and process only the minimal information required to manage your loyalty membership:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong>Identity &amp; Profile:</strong> Full name, title, date of birth (optional for birthday privileges), and corporate designation.</li>
                <li><strong>Contact Information:</strong> Primary and secondary mobile numbers, email addresses, and postal address.</li>
                <li><strong>Loyalty &amp; Account Details:</strong> Unique membership code, digital card identifiers, category tier, and privilege entitlements.</li>
                <li><strong>Transactional History:</strong> Discount and promotional offer redemptions, outlet bill numbers, saved amounts, and redemption timestamps.</li>
                <li><strong>Communication Preferences:</strong> Explicit opt-in records and timestamps for SMS, WhatsApp, and email direct marketing.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">3. Purposes &amp; Lawful Bases of Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Membership Contract Fulfillment</h4>
                <p>Generating your digital card, validating tier privileges at hotel outlets, applying discounts, and sending essential transaction confirmations.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Direct Marketing (Section 17 PDPA)</h4>
                <p>We send promotional offers, event invitations, and dining specials strictly when you have given <strong>affirmative, opt-in consent</strong>. You may withdraw your consent at any time without affecting your membership benefits.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Statutory Compliance &amp; Security</h4>
                <p>Preventing fraud, maintaining financial audit logs for statutory accounting, and safeguarding system integrity through role-based access controls.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">4. Your Statutory Data Subject Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>Under Part II of the Sri Lanka Personal Data Protection Act, you possess the following rights:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                  <strong className="block font-semibold text-sm mb-1">Right of Access (Sec. 13)</strong>
                  You can request confirmation and a portable copy of the personal data we hold about you.
                </div>
                <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                  <strong className="block font-semibold text-sm mb-1">Right to Rectification (Sec. 14)</strong>
                  You can request correction of inaccurate, incomplete, or outdated personal information.
                </div>
                <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                  <strong className="block font-semibold text-sm mb-1">Right to Erasure (Sec. 15)</strong>
                  You can request deletion or anonymization of your data when processing is no longer necessary.
                </div>
                <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                  <strong className="block font-semibold text-sm mb-1">Right to Object / Opt-Out (Sec. 17)</strong>
                  You have the unconditional right to opt out of promotional communications at any moment.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">5. Data Retention &amp; Security Measures</CardTitle>
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                  DRAFT - SCHEDULE PENDING LEGAL SIGN-OFF
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>Security:</strong> All communication uses TLS encryption. Passwords and credentials are cryptographically hashed using bcrypt (cost factor 12). Staff access to unmasked contact information is restricted and audited.
              </p>
              <p>
                <strong>Retention:</strong> Personal data is maintained during active membership. Inactive authentication tokens and one-time passwords (OTPs) are purged automatically after 30 days. Statutory financial records are preserved in accordance with applicable Sri Lankan tax and corporate laws [Exact retention schedule subject to legal confirmation].
              </p>
            </CardContent>
          </Card>
        </div>

        {/* DSAR Intake Form */}
        <div className="space-y-6">
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Submit a Rights Request
              </CardTitle>
              <CardDescription className="text-xs">
                Exercise your access, rectification, or erasure rights under Sri Lanka PDPA.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {submitted ? (
                <div className="text-center py-6 space-y-3">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                  <h4 className="font-semibold text-base">Request Submitted</h4>
                  <p className="text-xs text-muted-foreground">
                    Thank you. Your request has been logged in our Data Subject Rights registry. Under PDPA guidelines, we will verify your identity and respond within 30 calendar days.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                    Submit Another Request
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="req_type">Request Type</Label>
                    <Select 
                      value={formData.request_type} 
                      onValueChange={(val) => setFormData(p => ({ ...p, request_type: val }))}
                    >
                      <SelectTrigger id="req_type" className="text-xs">
                        <SelectValue placeholder="Select right to exercise" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="access">Access / Export Personal Data (Sec. 13)</SelectItem>
                        <SelectItem value="rectification">Correct / Rectify Inaccurate Data (Sec. 14)</SelectItem>
                        <SelectItem value="erasure">Erasure / Anonymization Request (Sec. 15)</SelectItem>
                        <SelectItem value="objection">Opt-Out / Direct Marketing Objection (Sec. 17)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="req_name">Full Name *</Label>
                    <Input 
                      id="req_name" 
                      placeholder="e.g. John Perera" 
                      value={formData.requester_name}
                      onChange={(e) => setFormData(p => ({ ...p, requester_name: e.target.value }))}
                      required 
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="req_email">Email Address</Label>
                    <Input 
                      id="req_email" 
                      type="email" 
                      placeholder="john@example.com" 
                      value={formData.requester_email}
                      onChange={(e) => setFormData(p => ({ ...p, requester_email: e.target.value }))}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="req_phone">Mobile Number</Label>
                    <Input 
                      id="req_phone" 
                      placeholder="07XXXXXXXX or +94 7X XXX XXXX" 
                      value={formData.requester_phone}
                      onChange={(e) => setFormData(p => ({ ...p, requester_phone: e.target.value }))}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="req_code">Member Code (if known)</Label>
                    <Input 
                      id="req_code" 
                      placeholder="e.g. CG100200..." 
                      value={formData.member_code}
                      onChange={(e) => setFormData(p => ({ ...p, member_code: e.target.value }))}
                      className="text-xs"
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" className="w-full text-xs font-semibold gap-2" disabled={submitting}>
                      <Send className="h-3.5 w-3.5" />
                      {submitting ? "Submitting..." : "Submit Statutory Request"}
                    </Button>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center">
                    Statutory response deadline: 30 days from verification.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Member Portal Self-Service Card */}
          <Card className="bg-slate-100 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Self-Service Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p>
                Are you already a Cinnamon Loyalty Member? You can download your personal data and adjust marketing toggles directly in your account:
              </p>
              <Link to="/member-portal" className="inline-block w-full">
                <Button variant="outline" size="sm" className="w-full text-xs mt-1">
                  Open Member Portal
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-slate-900 py-6 text-xs text-muted-foreground text-center">
        <p>&copy; {new Date().getFullYear()} Cinnamon Grand Colombo. All rights reserved.</p>
        <p className="mt-1">Technical privacy safeguards aligned with Sri Lanka PDPA No. 9 of 2022.</p>
      </footer>
    </div>
  );
}
