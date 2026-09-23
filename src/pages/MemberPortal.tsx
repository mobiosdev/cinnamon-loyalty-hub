import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { AppDispatch, RootState } from "@/store";
import { logout } from "@/store/slices/authSlice";
import { logActivity } from "@/utils/auditLogger";
import { staffApi, MemberPortalData, PortalOffer } from "@/services/staffApi";
import { MembershipCard } from "@/components/discount/MembershipCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User, ChevronDown, LogOut, CreditCard, Gift, History, Phone, Mail, Building2,
  Sparkles, CalendarDays, Receipt, Percent, RefreshCw,
} from "lucide-react";
import cinnamonLogo from "@/assets/cinnamon-logo.png";

const formatDate = (value?: string | null, pattern = "dd MMM yyyy") => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : format(d, pattern);
};

const formatLkr = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `LKR ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

// Mirrors the staff Redemption screen so members see the same status the counter sees
type OfferStatus = "Active" | "Upcoming" | "Used" | "Expired";

const getBenefitDates = (offer: PortalOffer) => {
  const now = Date.now();
  const start = offer.valid_from ? startOfDay(parseISO(offer.valid_from)).getTime() : -Infinity;
  const end = offer.valid_to ? endOfDay(parseISO(offer.valid_to)).getTime() : Infinity;
  return { start, isUpcoming: start > now, isExpired: end < now };
};

const getOfferStatus = (offer: PortalOffer): OfferStatus => {
  const { isUpcoming, isExpired } = getBenefitDates(offer);
  if (isExpired) return "Expired";
  if (offer.is_redeemed) return "Used";
  if (isUpcoming) return "Upcoming";
  return "Active";
};

const recurrenceText = (offer: PortalOffer) => {
  const used = offer.redemptions_count || 0;
  if (offer.is_recurrent) {
    return offer.usage_limit !== null
      ? `Recurrent (${used} used, ${Math.max(0, offer.usage_limit - used)} available)`
      : `Recurrent (Unlimited - ${used} used)`;
  }
  return `One-time (${used} used, ${offer.is_redeemed ? 0 : 1} available)`;
};

const validityText = (offer: PortalOffer) => {
  if (offer.valid_from && offer.valid_to) return `Validity: ${formatDate(offer.valid_from)} - ${formatDate(offer.valid_to)}`;
  if (offer.valid_to) return `Expires: ${formatDate(offer.valid_to)}`;
  if (offer.valid_from) return `Valid From: ${formatDate(offer.valid_from)}`;
  return "Validity: Unlimited / No Expiry";
};

const statusStyles: Record<OfferStatus, { card: string; title: string; badge: string }> = {
  Active: {
    card: "border-green-200 dark:border-green-900/30 bg-green-500/5 dark:bg-green-950/10",
    title: "text-green-700 dark:text-green-400",
    badge: "bg-green-600 text-white hover:bg-green-700",
  },
  Used: {
    card: "border-red-200 dark:border-red-900/30 bg-red-500/5 dark:bg-red-950/10 opacity-90",
    title: "text-red-700 dark:text-red-400 line-through",
    badge: "bg-red-600 text-white hover:bg-red-700",
  },
  Upcoming: {
    card: "border-border bg-muted/30",
    title: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground hover:bg-muted",
  },
  Expired: {
    card: "border-border bg-muted/30",
    title: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground hover:bg-muted",
  },
};

const statusHint: Record<OfferStatus, string> = {
  Active: "Ready to redeem",
  Upcoming: "Not yet active",
  Used: "Redeemed",
  Expired: "Expired",
};

const MemberPortal = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const isMember = user?.role === "customer" || user?.is_customer === true;

  const [data, setData] = useState<MemberPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCardOpen, setIsCardOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login-member", { replace: true });
    else if (!isMember) navigate("/", { replace: true });
  }, [isAuthenticated, isMember, navigate]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      setData(await staffApi.getMemberPortalData(user.id));
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || "Unable to load your member portal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isMember) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isMember, user?.id]);

  const handleLogout = () => {
    if (user?.username) {
      logActivity({
        activityType: "user_authentication",
        entityType: "user",
        action: "logout",
        performedBy: user.username,
        details: { event: "logout" },
      });
    }
    dispatch(logout());
    navigate("/login-member", { replace: true });
  };

  if (!isAuthenticated || !isMember) return null;

  const member = data?.member || user?.member_data || null;
  const fullName = member
    ? `${member.title || ""} ${member.first_name || ""} ${member.last_name || ""}`.trim()
    : user?.full_name || "Member";
  const memberCode = member?.member_code || user?.member_code || "";
  const discount = data?.privilege_discount;
  const offers = data?.offers || [];
  const history = data?.history || [];
  // Current = active + upcoming (active first, upcoming by start date); past = used or expired
  const pastOffers = offers.filter((o) => ["Used", "Expired"].includes(getOfferStatus(o)));
  const currentOffers = offers
    .filter((o) => !pastOffers.includes(o))
    .sort((a, b) => {
      const first = getBenefitDates(a);
      const second = getBenefitDates(b);
      return Number(first.isUpcoming) - Number(second.isUpcoming)
        || (first.isUpcoming && second.isUpcoming ? first.start - second.start : 0);
    });
  const availableCount = currentOffers.filter((o) => getOfferStatus(o) === "Active").length;

  const discountLabel = discount
    ? discount.percentage && discount.percentage > 0
      ? `${discount.percentage}%`
      : discount.amount && discount.amount > 0
        ? formatLkr(discount.amount)
        : null
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src={cinnamonLogo} alt="Cinnamon Grand Colombo" className="h-10 sm:h-12 w-auto object-contain shrink-0" />
            <div className="min-w-0 border-l border-border pl-3">
              <h1 className="text-base sm:text-xl font-serif font-semibold leading-tight truncate">
                Welcome, {member?.first_name || fullName}
              </h1>
              {memberCode && (
                <Badge variant="outline" className="mt-1 font-mono text-[10px] sm:text-xs">
                  {memberCode}
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 shrink-0">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-semibold">{fullName}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email || memberCode}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsCardOpen(true)} className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                My Membership Card
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 space-y-6 max-w-5xl">
        {/* Membership card */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 sm:p-7 text-white shadow-xl"
          style={{ background: "linear-gradient(135deg, #1a0533 0%, #2d1058 50%, #4a1f7f 100%)" }}
        >
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#f0c040]/10 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#f0c040] font-semibold">
                  Cinnamon Grand · Privilege Card
                </span>
                {member?.is_active === false && (
                  <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                )}
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-serif font-semibold leading-tight">{fullName}</p>
                <p className="font-mono text-sm sm:text-base tracking-widest text-[#f0c040] mt-1">{memberCode || "—"}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:text-sm text-white/80">
                <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-[#f0c040]" />{member?.category_name || "Member"}</span>
                {member?.company_name && (
                  <span className="flex items-center gap-2 min-w-0"><Building2 className="h-3.5 w-3.5 text-[#f0c040] shrink-0" /><span className="truncate">{member.company_name}</span></span>
                )}
                {member?.mobile && (
                  <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[#f0c040]" />{member.mobile}</span>
                )}
                {member?.email && (
                  <span className="flex items-center gap-2 min-w-0"><Mail className="h-3.5 w-3.5 text-[#f0c040] shrink-0" /><span className="truncate">{member.email}</span></span>
                )}
                {member?.renew_date && (
                  <span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-[#f0c040]" />Valid until {formatDate(member.renew_date)}</span>
                )}
              </div>
            </div>

            <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end">
              {/* {discountLabel && discount?.enabled && (
                <div className="text-left sm:text-right">
                  <p className="text-[10px] uppercase tracking-widest text-white/60">Privilege Discount</p>
                  <p className="text-3xl font-bold text-[#f0c040] leading-none">{discountLabel}</p>
                </div>
              )} */}
              <Button
                onClick={() => setIsCardOpen(true)}
                className="bg-gradient-to-r from-[#d4a012] via-[#f0c040] to-[#e8a808] text-[#1a0533] font-bold hover:brightness-110"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                View &amp; Download Card
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="py-4 flex items-center justify-between gap-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="offers">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="offers" className="text-xs sm:text-sm">
              <Gift className="mr-2 h-4 w-4" />
              Offers &amp; Privileges{!loading && ` (${availableCount})`}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <History className="mr-2 h-4 w-4" />
              Redeemed History{!loading && ` (${history.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Available offers */}
          <TabsContent value="offers" className="space-y-4 mt-4">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : (
              <>
                {/* {discount?.enabled && discountLabel && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="py-4 flex items-center gap-4">
                      <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <Percent className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{discountLabel} privilege discount</p>
                        <p className="text-sm text-muted-foreground">
                          Present your membership card at any participating outlet to enjoy your discount on every bill.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )} */}

                <Tabs defaultValue="available">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="available">Available Benefits ({currentOffers.length})</TabsTrigger>
                    <TabsTrigger value="past">Past Benefits ({pastOffers.length})</TabsTrigger>
                  </TabsList>
                  {(["available", "past"] as const).map((benefitsTab) => {
                    const list = benefitsTab === "available" ? currentOffers : pastOffers;
                    return (
                      <TabsContent key={benefitsTab} value={benefitsTab} className="space-y-3 mt-4">
                        {list.length === 0 ? (
                          <EmptyState
                            icon={<Gift className="h-10 w-10" />}
                            title={benefitsTab === "available" ? "No offers available right now" : "No past benefits"}
                            description={
                              benefitsTab === "available"
                                ? "New offers assigned to you will appear here."
                                : "Offers you have fully used or that have expired will appear here."
                            }
                          />
                        ) : (
                          list.map((offer) => <OfferCard key={offer.id} offer={offer} />)
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </>
            )}
          </TabsContent>

          {/* Redemption history */}
          <TabsContent value="history" className="mt-4">
            {loading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : history.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-10 w-10" />}
                title="No redemptions yet"
                description="Discounts and offers you redeem at our outlets will be listed here."
              />
            ) : (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date &amp; Time</TableHead>
                        <TableHead>Offer / Privilege</TableHead>
                        <TableHead>Bill No.</TableHead>
                        <TableHead className="text-right">Saved</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h) => (
                        <TableRow key={`${h.type}-${h.id}`}>
                          <TableCell className="whitespace-nowrap text-sm">{formatDate(h.redeemed_at, "dd MMM yyyy, hh:mm a")}</TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium">{h.title}</div>
                            {h.type === "discount" && h.discount_value !== null && (
                              <div className="text-xs text-muted-foreground">
                                {h.discount_type === "percentage" ? `${h.discount_value}%` : formatLkr(h.discount_value)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{h.bill_number || "—"}</TableCell>
                          <TableCell className="text-right text-sm whitespace-nowrap">{formatLkr(h.discount_amount)}</TableCell>
                          <TableCell>
                            <Badge variant={h.status === "reversed" ? "destructive" : "secondary"} className="capitalize">
                              {h.status === "active" ? "Redeemed" : h.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MembershipCard
        open={isCardOpen}
        onOpenChange={setIsCardOpen}
        member={
          member
            ? { ...member, member_code: memberCode }
            : {
                id: user?.id,
                first_name: user?.full_name?.split(" ")[0] || "Member",
                last_name: user?.full_name?.split(" ").slice(1).join(" ") || "",
                member_code: memberCode,
                email: user?.email,
                mobile: user?.mobile,
                is_active: true,
              }
        }
      />
    </div>
  );
};

const OfferCard = ({ offer }: { offer: PortalOffer }) => {
  const status = getOfferStatus(offer);
  const styles = statusStyles[status];
  const hasMinBill = offer.min_bill_value !== null && offer.min_bill_value > 0;
  const hasMaxDiscount = offer.max_discount_amount !== null && offer.max_discount_amount > 0;

  return (
    <Card className={`border transition-colors ${styles.card}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3 flex-1 min-w-0">
            <div className="rounded-full bg-secondary/10 p-2 h-fit shrink-0">
              <Gift className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`font-semibold text-sm ${styles.title}`}>{offer.name}</h4>
                <Badge className={`text-[10px] py-0 px-1.5 font-semibold ${styles.badge}`}>{status}</Badge>
              </div>
              {offer.description && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{offer.description}</p>
              )}
              <div className="flex flex-col gap-1 mt-2 text-[11px] text-muted-foreground">
                <p className="font-medium text-foreground/80">{recurrenceText(offer)}</p>
                <p>{validityText(offer)}</p>
                {(hasMinBill || hasMaxDiscount) && (
                  <p className="space-x-2">
                    {hasMinBill && <span>Min Bill: {formatLkr(offer.min_bill_value)}</span>}
                    {hasMinBill && hasMaxDiscount && <span>•</span>}
                    {hasMaxDiscount && <span>Max Discount: {formatLkr(offer.max_discount_amount)}</span>}
                  </p>
                )}
              </div>

              {offer.redemptions?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed border-border/60">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Redemption History
                  </p>
                  <div className="space-y-1">
                    {offer.redemptions.map((r) => (
                      <div key={r.id} className="flex justify-between items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded">
                        <span>Redeemed: {formatDate(r.redeemed_at)}</span>
                        {r.bill_number && <span className="font-mono">Bill: #{r.bill_number}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <span
            className={`hidden sm:inline-flex shrink-0 items-center rounded-md border px-3 py-1.5 text-xs font-semibold ${
              status === "Active"
                ? "border-green-300 text-green-700 dark:text-green-400"
                : status === "Used"
                  ? "border-red-300 text-red-600 dark:text-red-400"
                  : "border-border text-muted-foreground"
            }`}
          >
            {statusHint[status]}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
    <div className="opacity-40 mb-3">{icon}</div>
    <h3 className="font-semibold">{title}</h3>
    <p className="text-sm mt-1">{description}</p>
  </div>
);

export default MemberPortal;
