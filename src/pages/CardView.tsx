import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CreditCard, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import cinnamonLogo from "@/assets/cinnamon-logo.png";

export default function CardView() {
  const { token } = useParams<{ token: string }>();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchMember() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("members")
          .select(`
            *,
            customer_categories(name)
          `)
          .eq("card_token", token)
          .maybeSingle();

        if (error) throw error;
        setMember(data);
      } catch (error) {
        console.error("Failed to load member card:", error);
        toast.error("Could not fetch membership card details.");
      } finally {
        setLoading(false);
      }
    }
    fetchMember();
  }, [token]);

  const handleDownload = async () => {
    if (!cardRef.current || !member) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      
      // Wait for any images to load completely
      await document.fonts.ready;
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High resolution
        backgroundColor: null,
        useCORS: true,
        logging: false,
        allowTaint: true
      });

      const link = document.createElement("a");
      const memberCode = member.member_code || "membership";
      link.download = `${memberCode}_membership_card.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Card downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download card. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#150229] text-white p-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#f0c040] mb-4" />
        <p className="font-serif text-[#f0e6d3] text-lg tracking-wider animate-pulse">
          Loading Your Digital Card...
        </p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#150229] text-white p-4 select-none relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-950/20 blur-[100px] pointer-events-none" />
        
        <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-2xl relative z-10">
          <ShieldAlert className="h-16 w-16 mx-auto text-red-500 animate-bounce" />
          <h2 className="text-2xl font-bold font-serif text-[#f0c040] tracking-wider">
            Card Not Found
          </h2>
          <p className="text-sm text-[#f0e6d3]/70 leading-relaxed font-sans">
            The membership card link you are trying to access is invalid or has expired. Please contact Cinnamon Grand Colombo administration to reissue your digital card.
          </p>
        </div>
      </div>
    );
  }

  const memberName = `${member.title || ""} ${member.first_name} ${member.last_name}`.trim();
  const categoryName = member.customer_categories?.name || "Member";
  const expiryDate = member.renew_date
    ? new Date(member.renew_date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "N/A";
  const memberCode = member.member_code || "N/A";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#150229] p-4 relative overflow-hidden select-none font-sans">
      {/* Premium background styling */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#3d1a6e]/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#f0c040]/5 blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full flex flex-col items-center gap-8 relative z-10 animate-fade-in duration-700">
        
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-serif text-[#f0c040] font-bold tracking-widest drop-shadow-md">
            Cinnamon Grand
          </h1>
          <p className="text-xs text-[#f0e6d3]/60 uppercase tracking-[6px] font-medium font-sans">
            Colombo
          </p>
        </div>

        {/* Card Display Area (with scaling for mobile viewports) */}
        <div className="w-full flex justify-center py-4 overflow-visible">
          <div className="scale-[0.78] xs:scale-[0.88] sm:scale-100 origin-center transition-transform duration-200 hover:scale-[1.02] sm:hover:scale-[1.02] ease-out duration-300">
            <div
              ref={cardRef}
              className="membership-card flex flex-col justify-between"
              style={{
                width: "420px",
                height: "260px",
                borderRadius: "16px",
                position: "relative",
                overflow: "hidden",
                fontFamily: "'Playfair Display', 'Georgia', serif",
                boxShadow: "0 25px 65px rgba(61, 26, 110, 0.5), 0 10px 30px rgba(0,0,0,0.3)",
              }}
            >
              {/* Background with gradient */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, #1a0533 0%, #2d1058 25%, #3d1a6e 50%, #4a1f7f 75%, #2d1058 100%)",
                }}
              />

              {/* Diagonal texture pattern */}
              <div
                style={{
                  position: "absolute",
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
                  position: "absolute",
                  bottom: "-60px",
                  left: "-40px",
                  width: "220px",
                  height: "220px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #d4a012 0%, #f0c040 40%, #e8a808 70%, #c89010 100%)",
                  opacity: 0.9,
                }}
              />

              {/* Second gold arc - bottom left (smaller) */}
              <div
                style={{
                  position: "absolute",
                  bottom: "-80px",
                  left: "20px",
                  width: "180px",
                  height: "180px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3d1a6e 0%, #2d1058 100%)",
                }}
              />

              {/* Gold decorative arc - top right */}
              <div
                style={{
                  position: "absolute",
                  top: "-30px",
                  right: "-30px",
                  width: "130px",
                  height: "130px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #d4a012 0%, #f0c040 50%, #e8a808 100%)",
                  opacity: 0.85,
                }}
              />

              {/* Smaller accent circle top right */}
              <div
                style={{
                  position: "absolute",
                  top: "30px",
                  right: "-20px",
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3d1a6e 0%, #4a1f7f 100%)",
                }}
              />

              {/* Gold accent line - bottom right */}
              <div
                style={{
                  position: "absolute",
                  bottom: "-20px",
                  right: "-20px",
                  width: "160px",
                  height: "160px",
                  borderRadius: "50%",
                  border: "3px solid rgba(212, 160, 18, 0.4)",
                  background: "transparent",
                }}
              />

              {/* Content Layer */}
              <div
                style={{
                  position: "relative",
                  zIndex: 10,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px 24px",
                }}
              >
                {/* Top: Logo */}
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                  >
                    <img
                      src={cinnamonLogo}
                      alt="Cinnamon Grand Colombo"
                      style={{
                        height: "36px",
                        width: "auto",
                        objectFit: "contain",
                      }}
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>

                {/* Middle: Membership Type */}
                <div style={{ marginTop: "14px", flex: 1 }}>
                  <p
                    style={{
                      fontSize: "20px",
                      fontWeight: 400,
                      color: "#ffffff",
                      letterSpacing: "4px",
                      textTransform: "uppercase",
                      fontFamily: "'Playfair Display', 'Georgia', serif",
                      textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    {categoryName.toUpperCase()} MEMBERSHIP
                  </p>
                </div>

                {/* Bottom: Member Details + QR Code */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginTop: "auto",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#f0e6d3",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginBottom: "2px",
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      {memberName}
                    </p>
                    <p
                      style={{
                        fontSize: "9px",
                        color: "rgba(240, 230, 211, 0.8)",
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      MEMBERSHIP NO: {memberCode}
                    </p>
                    <p
                      style={{
                        fontSize: "9px",
                        color: "rgba(240, 230, 211, 0.8)",
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      EXPIRY DATE: {expiryDate}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div
                    style={{
                      backgroundColor: "rgba(255,255,255,0.95)",
                      borderRadius: "8px",
                      padding: "4px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        memberCode
                      )}`}
                      alt="QR Code"
                      style={{ width: "60px", height: "60px", display: "block" }}
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full flex flex-col items-center gap-4">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full sm:w-[280px] h-12 bg-gradient-to-r from-[#d4a012] via-[#f0c040] to-[#e8a808] hover:from-[#c89010] hover:to-[#d4a012] text-[#1a0533] font-bold text-base tracking-wide rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all duration-300 gap-2 border-0"
          >
            {downloading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download Now
              </>
            )}
          </Button>

          <p className="text-xs text-[#f0e6d3]/40 font-sans text-center max-w-[280px] leading-relaxed">
            Please present this digital card or scan the QR code at any Cinnamon Grand outlet to verify your membership.
          </p>
        </div>
      </div>
    </div>
  );
}
