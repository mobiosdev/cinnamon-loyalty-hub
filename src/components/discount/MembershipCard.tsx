import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, CreditCard, Share2, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import cinnamonLogo from "@/assets/cinnamon-logo.png";
import { supabase } from "@/integrations/supabase/client";

interface MembershipCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    title?: string;
    first_name: string;
    last_name: string;
    member_code: string;
    category_name?: string;
    renew_date?: string;
    registered_date?: string;
    email?: string;
  } | null;
}

export function MembershipCard({ open, onOpenChange, member }: MembershipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);

  if (!member) return null;

  const memberName = `${member.title || ''} ${member.first_name} ${member.last_name}`.trim();
  const memberCode = member.member_code || 'N/A';
  const categoryName = member.category_name || 'Member';
  const expiryDate = member.renew_date
    ? new Date(member.renew_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'N/A';

  const getCardCanvas = async () => {
    const cardElement = cardRef.current;
    if (!cardElement) return null;
    const { default: html2canvas } = await import('html2canvas');
    return html2canvas(cardElement, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      logging: false,
    });
  };

  const handleDownloadCard = async () => {
    try {
      const canvas = await getCardCanvas();
      if (!canvas) return;

      const link = document.createElement('a');
      link.download = `${memberCode}_membership_card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success("Membership card downloaded successfully!");
    } catch (error) {
      console.error("Failed to download membership card:", error);
      try {
        const qrDownloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(memberCode)}`;
        const response = await fetch(qrDownloadUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${memberCode}_qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("QR Code downloaded (card download requires html2canvas)");
      } catch (fallbackError) {
        toast.error("Failed to download. Please try again.");
      }
    }
  };

  const handleShare = async () => {
    try {
      // Try using the Web Share API (works on mobile and modern browsers)
      if (navigator.share) {
        const canvas = await getCardCanvas();
        if (canvas) {
          canvas.toBlob(async (blob) => {
            if (!blob) {
              toast.error("Failed to generate card image for sharing.");
              return;
            }
            const file = new File([blob], `${memberCode}_membership_card.png`, { type: 'image/png' });
            
            try {
              await navigator.share({
                title: `${categoryName} Membership Card - Cinnamon Grand`,
                text: `Membership Card for ${memberName}\nMembership No: ${memberCode}\nExpiry: ${expiryDate}`,
                files: [file],
              });
              toast.success("Shared successfully!");
            } catch (shareErr: any) {
              // User cancelled share or files not supported, try without files
              if (shareErr.name !== 'AbortError') {
                try {
                  await navigator.share({
                    title: `${categoryName} Membership Card - Cinnamon Grand`,
                    text: `Membership Card for ${memberName}\nMembership No: ${memberCode}\nExpiry: ${expiryDate}`,
                  });
                  toast.success("Shared successfully!");
                } catch {
                  toast.error("Sharing cancelled.");
                }
              }
            }
          }, 'image/png');
        }
      } else {
        // Fallback: Copy card details to clipboard
        const cardText = `🏨 Cinnamon Grand Colombo\n${categoryName} Membership\n\n👤 ${memberName}\n🔢 Membership No: ${memberCode}\n📅 Expiry: ${expiryDate}`;
        
        await navigator.clipboard.writeText(cardText);
        toast.success("Card details copied to clipboard!");
      }
    } catch (error) {
      console.error("Share failed:", error);
      // Last fallback: copy to clipboard
      try {
        const cardText = `Cinnamon Grand Colombo - ${categoryName} Membership\nName: ${memberName}\nMembership No: ${memberCode}\nExpiry: ${expiryDate}`;
        await navigator.clipboard.writeText(cardText);
        toast.success("Card details copied to clipboard!");
      } catch {
        toast.error("Failed to share. Please try again.");
      }
    }
  };

  const handleSendEmail = async () => {
    const targetEmail = emailAddress.trim() || member.email;

    if (!targetEmail) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSendingEmail(true);
    setEmailSent(false);

    try {
      const { data, error } = await supabase.functions.invoke('send-membership-card', {
        body: {
          to_email: targetEmail,
          member_name: memberName,
          member_code: memberCode,
          category_name: categoryName,
          expiry_date: expiryDate,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to send email');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setEmailSent(true);
      toast.success(`Membership card sent to ${targetEmail}`);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setEmailSent(false);
        setShowEmailInput(false);
      }, 3000);
    } catch (error: any) {
      console.error("Failed to send membership card email:", error);
      const errorMessage = error?.message || "Failed to send email";
      
      if (errorMessage.includes('RESEND_API_KEY')) {
        toast.error("Email service not configured. Please set up RESEND_API_KEY in Supabase secrets.", {
          duration: 6000,
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSendingEmail(false);
    }
  };

  const handleOpenEmailInput = () => {
    setShowEmailInput(true);
    setEmailAddress(member.email || "");
    setEmailSent(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setShowEmailInput(false);
        setEmailSent(false);
        setEmailAddress("");
      }
    }}>
      <DialogContent className="sm:max-w-lg flex flex-col items-center p-6 gap-4">
        <DialogHeader className="w-full text-center">
          <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Membership Card
          </DialogTitle>
          <DialogDescription className="text-sm text-center">
            Digital membership card for {member.first_name} {member.last_name}
          </DialogDescription>
        </DialogHeader>

        {/* Membership Card */}
        <div className="w-full flex justify-center">
          <div
            ref={cardRef}
            className="membership-card"
            style={{
              width: '420px',
              height: '260px',
              borderRadius: '16px',
              position: 'relative',
              overflow: 'hidden',
              fontFamily: "'Playfair Display', 'Georgia', serif",
              boxShadow: '0 20px 60px rgba(61, 26, 110, 0.4), 0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            {/* Background with gradient */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #1a0533 0%, #2d1058 25%, #3d1a6e 50%, #4a1f7f 75%, #2d1058 100%)',
              }}
            />

            {/* Diagonal texture pattern */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 8px,
                  rgba(255,255,255,0.02) 8px,
                  rgba(255,255,255,0.02) 16px
                )`,
              }}
            />

            {/* Gold decorative arc - bottom left */}
            <div
              style={{
                position: 'absolute',
                bottom: '-60px',
                left: '-40px',
                width: '220px',
                height: '220px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #d4a012 0%, #f0c040 40%, #e8a808 70%, #c89010 100%)',
                opacity: 0.9,
              }}
            />

            {/* Second gold arc - bottom left (smaller) */}
            <div
              style={{
                position: 'absolute',
                bottom: '-80px',
                left: '20px',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3d1a6e 0%, #2d1058 100%)',
              }}
            />

            {/* Gold decorative arc - top right */}
            <div
              style={{
                position: 'absolute',
                top: '-30px',
                right: '-30px',
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #d4a012 0%, #f0c040 50%, #e8a808 100%)',
                opacity: 0.85,
              }}
            />

            {/* Smaller accent circle top right */}
            <div
              style={{
                position: 'absolute',
                top: '30px',
                right: '-20px',
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3d1a6e 0%, #4a1f7f 100%)',
              }}
            />

            {/* Gold accent line - bottom right */}
            <div
              style={{
                position: 'absolute',
                bottom: '-20px',
                right: '-20px',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                border: '3px solid rgba(212, 160, 18, 0.4)',
                background: 'transparent',
              }}
            />

            {/* Content Layer */}
            <div
              style={{
                position: 'relative',
                zIndex: 10,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 24px',
              }}
            >
              {/* Top Row: Logo + QR */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {/* Logo area */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '2px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                  <img 
                    src={cinnamonLogo} 
                    alt="Cinnamon Grand Colombo" 
                    style={{ 
                      height: '36px', 
                      width: 'auto',
                      objectFit: 'contain',
                    }} 
                  />
                </div>

                {/* QR Code */}
                <div
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderRadius: '8px',
                    padding: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(memberCode)}`}
                    alt="QR Code"
                    style={{ width: '60px', height: '60px' }}
                    crossOrigin="anonymous"
                  />
                </div>
              </div>

              {/* Middle: Membership Type */}
              <div style={{ marginTop: '14px', flex: 1 }}>
                <p
                  style={{
                    fontSize: '20px',
                    fontWeight: 400,
                    color: '#ffffff',
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    fontFamily: "'Playfair Display', 'Georgia', serif",
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  {categoryName.toUpperCase()} MEMBERSHIP
                </p>
              </div>

              {/* Bottom: Member Details */}
              <div style={{ marginTop: 'auto' }}>
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#f0e6d3',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  {memberName}
                </p>
                <p
                  style={{
                    fontSize: '10px',
                    color: 'rgba(240, 230, 211, 0.8)',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  MEMBERSHIP NO: {memberCode}
                </p>
                <p
                  style={{
                    fontSize: '10px',
                    color: 'rgba(240, 230, 211, 0.8)',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  EXPIRY DATE: {expiryDate}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-[420px] flex gap-2">
          <Button
            onClick={handleDownloadCard}
            className="flex-1 gap-2"
            variant="default"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            onClick={handleShare}
            className="flex-1 gap-2"
            variant="outline"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            onClick={handleOpenEmailInput}
            className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            variant="default"
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
        </div>

        {/* Email Input Section */}
        {showEmailInput && (
          <div className="w-full max-w-[420px] space-y-3 p-4 border border-border rounded-lg bg-muted/30 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="h-4 w-4 text-amber-600" />
              Send Membership Card via Email
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-email" className="text-xs text-muted-foreground">
                Recipient Email Address
              </Label>
              <Input
                id="card-email"
                type="email"
                placeholder="Enter email address..."
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                disabled={sendingEmail || emailSent}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendEmail();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || emailSent || !emailAddress.trim()}
                className={`flex-1 gap-2 ${emailSent ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'} text-white`}
                variant="default"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : emailSent ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Sent Successfully!
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Card
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowEmailInput(false);
                  setEmailSent(false);
                }}
                variant="outline"
                size="sm"
                disabled={sendingEmail}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
