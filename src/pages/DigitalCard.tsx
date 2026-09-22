import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Download, 
  Share2, 
  Copy, 
  Check, 
  QrCode, 
  Maximize2, 
  Minimize2, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  MapPin, 
  Phone, 
  Gift, 
  ChevronRight, 
  ExternalLink,
  Calendar,
  CreditCard,
  Building2,
  Hotel
} from "lucide-react";
import { toast } from "sonner";
import cinnamonLogo from "@/assets/cinnamon-logo.png";
import { staffApi } from "@/services/staffApi";

interface PublicCardData {
  id: string;
  title?: string;
  first_name: string;
  last_name: string;
  member_code: string;
  registered_date?: string;
  renew_date?: string;
  is_active: boolean;
  discount_enabled: boolean;
  discount_percentage?: number;
  discount_amount?: number;
  discount_policy?: string;
  company_name?: string;
  category_name?: string;
  category_id?: number;
  offers?: Array<{
    id: number;
    title: string;
    description?: string;
    discount_percentage?: number;
    terms?: string;
    valid_until?: string;
  }>;
}

export default function DigitalCard() {
  const { id } = useParams<{ id: string }>();
  const cardRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<PublicCardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("No card identifier provided.");
      setLoading(false);
      return;
    }

    const fetchCard = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await staffApi.getPublicCard(id);
        if (data) {
          setMember(data);
        } else {
          setError("Digital card details could not be found.");
        }
      } catch (err: any) {
        console.error("Failed to load digital membership card:", err);
        const msg = err?.response?.data?.message || err?.message || "Invalid or expired membership card link.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [id]);

  const memberName = member 
    ? `${member.title || ''} ${member.first_name} ${member.last_name}`.trim()
    : "";
  const memberCode = member?.member_code || "N/A";
  const categoryName = member?.category_name || "Member";
  const expiryDate = member?.renew_date
    ? new Date(member.renew_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : "Perpetual";
  const isActive = member?.is_active !== false;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(memberCode)}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(memberCode);
      setCopiedCode(true);
      toast.success("Membership Number copied to clipboard");
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Card link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${categoryName} Membership Card - Cinnamon Grand Colombo`,
          text: `Cinnamon Grand Colombo Digital Pass for ${memberName}\nMembership No: ${memberCode}\nExpiry Date: ${expiryDate}`,
          url: window.location.href,
        });
        toast.success("Shared successfully!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `${memberCode}_Cinnamon_Grand_Card.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Membership card downloaded successfully!");
    } catch (err) {
      console.error("Card download failed:", err);
      // Fallback: download QR directly
      try {
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${memberCode}_qr.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success("QR Code downloaded.");
      } catch {
        toast.error("Failed to download card. Please try taking a screenshot.");
      }
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#110321] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#9333ea]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-[#f0c040]/30 border-t-[#f0c040] rounded-full animate-spin" />
          <p className="text-[#f0e6d3] font-serif text-lg tracking-wider">Loading your digital membership card...</p>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-[#110321] text-white flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-md w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-serif text-[#f0c040] font-semibold mb-2">Card Not Found</h1>
          <p className="text-white/70 text-sm mb-6 leading-relaxed">
            {error || "The requested membership card could not be found or has expired. Please verify your membership link or contact the front desk."}
          </p>
          <div className="space-y-3">
            <a 
              href="/"
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#d4a012] via-[#f0c040] to-[#e8a808] text-[#1a0533] font-bold text-sm tracking-wide uppercase transition hover:brightness-110 shadow-lg shadow-[#f0c040]/20"
            >
              Return to Portal
            </a>
            <p className="text-xs text-white/40 pt-2">
              Cinnamon Grand Colombo • Concierge: +94 11 249 7200
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0219] text-[#fbf8f3] flex flex-col items-center py-6 px-4 sm:px-6 relative overflow-x-hidden selection:bg-[#f0c040] selection:text-[#1a0533]">
      {/* Dynamic ambient backdrop lights */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-[#6b21a8]/30 via-[#3b0764]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[500px] -right-32 w-80 h-80 bg-[#d4a012]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main container */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        
        {/* Top Header */}
        <header className="w-full text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-[#f0c040]/30 backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#f0c040]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#f0c040]">
              Official Digital Pass
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-wider text-white font-medium">
            Cinnamon Grand Colombo
          </h1>
          <p className="text-xs uppercase tracking-[3px] text-white/60 mt-1">
            Loyalty & Privileges
          </p>
        </header>

        {/* Deactivated Notice if applicable */}
        {!isActive && (
          <div className="w-full mb-4 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-3 backdrop-blur-md">
            <ShieldAlert className="w-5 h-5 shrink-0 text-red-400" />
            <div>
              <p className="font-bold text-red-200">Account Deactivated</p>
              <p className="text-[11px] text-red-300/80">This card is currently inactive. Benefits and discount redemptions cannot be processed.</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* DIGITAL MEMBERSHIP CARD (Rendered element for export/view) */}
        {/* ============================================================ */}
        <div 
          ref={cardRef}
          className="w-full aspect-[1.586/1] rounded-2xl relative overflow-hidden shadow-2xl border border-[#f0c040]/40 transition-all duration-300 select-none group"
          style={{
            background: 'linear-gradient(135deg, #16042b 0%, #2f1254 45%, #1d0738 100%)',
            boxShadow: '0 20px 40px -15px rgba(212, 160, 18, 0.25), 0 0 25px rgba(74, 20, 140, 0.4)',
          }}
        >
          {/* Card luxury aesthetic layers */}
          <div 
            className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(240, 192, 64, 0.35) 0%, rgba(212, 160, 18, 0.1) 60%, transparent 80%)',
            }}
          />
          <div 
            className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)',
            }}
          />
          {/* Golden accent curved rings */}
          <div 
            className="absolute top-0 right-0 w-36 h-36 border-r-2 border-t-2 border-[#f0c040]/30 rounded-tr-2xl pointer-events-none" 
          />
          <div 
            className="absolute bottom-0 right-12 w-28 h-28 rounded-full border border-[#f0c040]/20 pointer-events-none" 
          />

          {/* Card inner content */}
          <div className="relative z-10 h-full p-5 sm:p-6 flex flex-col justify-between">
            {/* Top row: Brand & Status */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/95 rounded-lg p-1.5 shadow-md flex items-center justify-center">
                  <img 
                    src={cinnamonLogo} 
                    alt="Cinnamon Grand Colombo" 
                    className="h-8 sm:h-9 w-auto object-contain"
                  />
                </div>
                <div>
                  <p className="text-[#f0c040] font-serif text-sm sm:text-base font-semibold tracking-wide">
                    Cinnamon Grand
                  </p>
                  <p className="text-white/60 text-[9px] uppercase tracking-[2px]">
                    Colombo • Sri Lanka
                  </p>
                </div>
              </div>

              {/* Category Badge */}
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[#d4a012]/30 to-[#f0c040]/20 border border-[#f0c040]/50 backdrop-blur-md">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#f0c040]">
                  {categoryName}
                </span>
              </div>
            </div>

            {/* Middle: Membership Tier Banner */}
            <div className="my-auto py-1">
              <p className="text-[11px] uppercase tracking-[3px] text-white/50 font-medium">
                {member.company_name ? `${member.company_name} • ` : ""}Membership Privilege
              </p>
              <h2 className="text-xl sm:text-2xl font-serif tracking-widest text-white uppercase font-normal drop-shadow">
                {categoryName} CARD
              </h2>
            </div>

            {/* Bottom Row: Member details & QR code */}
            <div className="flex items-end justify-between gap-2 pt-2 border-t border-white/10">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-sm sm:text-base font-bold text-[#f7e7ce] tracking-wide uppercase truncate">
                  {memberName}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] sm:text-[11px] text-white/70 font-mono">
                  <span>NO: <strong className="text-white font-semibold">{memberCode}</strong></span>
                  <span>EXP: <strong className="text-white font-semibold">{expiryDate}</strong></span>
                </div>
              </div>

              {/* QR Code thumbnail */}
              <button
                type="button"
                onClick={() => setQrFullscreen(true)}
                className="shrink-0 bg-white p-1.5 rounded-lg shadow-lg border border-[#f0c040]/40 transition hover:scale-105 active:scale-95 group/qr"
                title="Tap to enlarge QR code for scanning"
              >
                <img 
                  src={qrUrl}
                  alt={`QR for ${memberCode}`} 
                  className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                  crossOrigin="anonymous"
                />
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* QUICK ACTIONS BAR */}
        {/* ============================================================ */}
        <div className="w-full grid grid-cols-3 gap-2 sm:gap-3 mt-4">
          <button
            onClick={() => setQrFullscreen(true)}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition active:scale-95 text-white gap-1.5 backdrop-blur-md"
          >
            <QrCode className="w-5 h-5 text-[#f0c040]" />
            <span className="text-[11px] font-medium tracking-wide">Show QR</span>
          </button>

          <button
            onClick={handleDownloadCard}
            disabled={downloading}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition active:scale-95 text-white gap-1.5 backdrop-blur-md disabled:opacity-50"
          >
            <Download className="w-5 h-5 text-[#f0c040]" />
            <span className="text-[11px] font-medium tracking-wide">
              {downloading ? "Saving..." : "Save Card"}
            </span>
          </button>

          <button
            onClick={handleShare}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition active:scale-95 text-white gap-1.5 backdrop-blur-md"
          >
            <Share2 className="w-5 h-5 text-[#f0c040]" />
            <span className="text-[11px] font-medium tracking-wide">Share</span>
          </button>
        </div>

        {/* Member Code Copy Banner */}
        <div className="w-full mt-4 p-3.5 rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-[#f0c040]/30 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-[#f0c040]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Membership Identification</p>
              <p className="text-sm font-mono font-bold text-[#f0c040]">{memberCode}</p>
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-medium flex items-center gap-1.5 transition active:scale-95"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-white/70" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* ============================================================ */}
        {/* EXCLUSIVE PRIVILEGES & OFFERS SECTION */}
        {/* ============================================================ */}
        <section className="w-full mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#f0c040]" />
              <h3 className="text-sm font-semibold tracking-wide uppercase text-white">
                Exclusive Privileges
              </h3>
            </div>
            {member.discount_percentage ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f0c040]/20 text-[#f0c040] border border-[#f0c040]/40">
                {member.discount_percentage}% Base Discount
              </span>
            ) : null}
          </div>

          {member.offers && member.offers.length > 0 ? (
            <div className="space-y-2.5">
              {member.offers.map((offer) => (
                <div 
                  key={offer.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-[#f0c040]/40 transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-[#f0c040] transition">
                        {offer.title}
                      </h4>
                      {offer.description && (
                        <p className="text-xs text-white/70 leading-relaxed">
                          {offer.description}
                        </p>
                      )}
                    </div>
                    {offer.discount_percentage && (
                      <span className="shrink-0 px-2.5 py-1 rounded-lg bg-gradient-to-br from-[#d4a012] to-[#f0c040] text-[#1a0533] font-bold text-xs tracking-wider shadow">
                        {offer.discount_percentage}% OFF
                      </span>
                    )}
                  </div>
                  {offer.terms && (
                    <p className="text-[10px] text-white/40 mt-2 pt-2 border-t border-white/5">
                      Terms: {offer.terms}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center backdrop-blur-md">
              <p className="text-xs text-white/70">
                Member entitlements include special corporate & dining privileges at Cinnamon Grand Colombo.
              </p>
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/* HOW TO REDEEM INSTRUCTIONS */}
        {/* ============================================================ */}
        <section className="w-full mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f0c040] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#f0c040]" />
            How to Redeem at Hotel Outlets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5 p-2 rounded-lg bg-white/5">
              <span className="w-6 h-6 rounded-full bg-[#f0c040]/20 text-[#f0c040] text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <p className="text-xs text-white/80">Present this digital pass or QR code at bill settlement</p>
            </div>
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5 p-2 rounded-lg bg-white/5">
              <span className="w-6 h-6 rounded-full bg-[#f0c040]/20 text-[#f0c040] text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <p className="text-xs text-white/80">Cashier will scan the QR or verify membership number</p>
            </div>
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5 p-2 rounded-lg bg-white/5">
              <span className="w-6 h-6 rounded-full bg-[#f0c040]/20 text-[#f0c040] text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <p className="text-xs text-white/80">Enjoy your exclusive hospitality privilege</p>
            </div>
          </div>
        </section>

        {/* Hotel Information & Concierge */}
        <footer className="w-full mt-6 p-4 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 text-center space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#f0c040] font-medium">
            <Hotel className="w-4 h-4" />
            <span>Cinnamon Grand Colombo</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#f0c040]" /> 77 Galle Road, Colombo 03
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#f0c040]" /> +94 11 249 7200
            </span>
          </div>
          <p className="text-[10px] text-white/40 pt-2 border-t border-white/5">
            © {new Date().getFullYear()} Cinnamon Hotels & Resorts. All rights reserved.
          </p>
        </footer>

      </div>

      {/* ============================================================ */}
      {/* FULLSCREEN QR CODE MODAL FOR ULTRA-EASY CASHIER SCANNING */}
      {/* ============================================================ */}
      {qrFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-200"
          onClick={() => setQrFullscreen(false)}
        >
          <div 
            className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#1a0533]">
                {categoryName} Membership
              </span>
              <button 
                onClick={() => setQrFullscreen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-2 rounded-2xl shadow-inner border-2 border-gray-200">
              <img 
                src={qrUrl}
                alt={`QR code for ${memberCode}`}
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
                crossOrigin="anonymous"
              />
            </div>

            <p className="text-xl font-mono font-bold text-[#1a0533] mt-4 tracking-wider">
              {memberCode}
            </p>
            <p className="text-sm font-semibold text-gray-700 uppercase mt-0.5">
              {memberName}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Present this high-brightness QR code to the cashier scanner.
            </p>

            <button
              onClick={() => setQrFullscreen(false)}
              className="mt-6 w-full py-3 rounded-xl bg-[#1a0533] hover:bg-[#2d1058] text-[#f0c040] font-bold text-sm tracking-wide uppercase transition"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
