import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { logout } from "@/store/slices/authSlice";
import { logActivity } from "@/utils/auditLogger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, FileText, BarChart3, Settings, ChevronDown, Gift, Users, Shield, MessageSquare, UserCog, LogOut, User, Sparkles, CheckCircle2, Phone, Mail, Download } from "lucide-react";
import CompanyRegistration from "./discount/CompanyRegistration";
import Redemption from "./discount/Redemption";
import TransactionTracking from "./discount/TransactionTracking";
import ReportsAnalytics from "./discount/ReportsAnalytics";
import OfferManagement from "./discount/OfferManagement";
import CustomerCategoryManagement from "./discount/CustomerCategoryManagement";
import { AuditTrail } from "./discount/AuditTrail";
import SendNotifications from "./discount/SendNotifications";
import UserManagement from "./discount/UserManagement";
import ProfileDialog from "./discount/ProfileDialog";
import { MembershipCard } from "./discount/MembershipCard";
import cinnamonLogo from "@/assets/cinnamon-logo.png";
import { staffApi } from "@/services/staffApi";

const DiscountManagement = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const permissions = user?.permissions;
  const isSuperAdmin = user?.role === "superadmin";
  const isMember = user?.role === "customer" || user?.is_customer === true;

  // Real-time member details for Member Portal view
  const [memberDetails, setMemberDetails] = useState<any>(user?.member_data || null);

  useEffect(() => {
    if (isMember && user?.id) {
      staffApi.getMemberById(user.id)
        .then((fresh) => {
          if (fresh) setMemberDetails(fresh);
        })
        .catch(() => {
          // Keep existing user.member_data fallback
        });
    }
  }, [isMember, user?.id]);

  // Determine first accessible tab
  const getDefaultTab = () => {
    if (isMember) return "redemption";
    if (isSuperAdmin || permissions?.registration) return "registration";
    if (permissions?.redemption) return "redemption";
    if (permissions?.transactions) return "transactions";
    if (permissions?.reports) return "reports";
    if (permissions?.settings_categories) return "categories";
    if (permissions?.settings_offers) return "offers";
    if (permissions?.settings_notifications) return "notifications";
    if (permissions?.settings_audit) return "audit";
    return "registration";
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);

  const canAccess = (tab: string): boolean => {
    if (isMember) return tab === "redemption";
    if (isSuperAdmin) return true;
    if (!permissions) return false;
    switch (tab) {
      case "registration": return permissions.registration;
      case "redemption": return permissions.redemption;
      case "transactions": return permissions.transactions;
      case "reports": return permissions.reports;
      case "offers": return permissions.settings_offers;
      case "categories": return permissions.settings_categories;
      case "notifications": return permissions.settings_notifications;
      case "audit": return permissions.settings_audit;
      case "usermanagement": return false;
      default: return false;
    }
  };

  const hasSettings = !isMember && (
    isSuperAdmin || 
    permissions?.settings_categories || 
    permissions?.settings_offers || 
    permissions?.settings_notifications || 
    permissions?.settings_audit
  );

  const handleTabChange = (tab: string) => {
    if (canAccess(tab)) setActiveTab(tab);
  };

  const handleLogout = () => {
    if (user?.username) {
      logActivity({
        activityType: 'user_authentication',
        entityType: 'user',
        action: 'logout',
        performedBy: user.username,
        details: { event: 'logout' }
      });
    }
    dispatch(logout());
    window.location.href = isMember ? "/login-member" : "/login";
  };

  const settingsActive = ["offers", "categories", "audit", "notifications", "usermanagement"].includes(activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <img
                src={cinnamonLogo}
                alt="Cinnamon Grand Colombo"
                className="h-10 sm:h-12 w-auto object-contain shrink-0"
              />
              <div className="min-w-0 border-l border-border pl-3 sm:pl-4">
                <h1 className="text-lg sm:text-2xl font-serif font-semibold text-foreground leading-tight">
                  {isMember ? "Member Portal" : "Discount Management"}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-tight">
                  {isMember ? "Cinnamon Grand Colombo Loyalty Club" : "Corporate Benefits & Member Discount System"}
                </p>
              </div>
            </div>

            {/* User info + Logout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between gap-2 sm:w-auto sm:justify-start">
                  <User className="h-4 w-4" />
                  <div className="text-left min-w-0 flex-1 sm:flex-none">
                    <div className="text-xs font-semibold leading-none">{user?.full_name || user?.username}</div>
                    <div className="text-xs text-muted-foreground capitalize truncate">
                      {isMember
                        ? "Loyalty Member"
                        : user?.role === "superadmin"
                        ? "Super Admin"
                        : "Staff"}
                    </div>
                  </div>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {isMember ? `#${memberDetails?.member_code || user?.member_code || "Member"}` : `@${user?.username}`}
                </div>
                {!isMember && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer">
                      <UserCog className="mr-2 h-4 w-4" />
                      My Profile
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {isMember ? (
          // ==========================================
          // DEDICATED MEMBER PORTAL VIEW
          // Navigation bar hidden, top card with details + Redemption below
          // ==========================================
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Loyalty Member Top Card - Cinnamon Grand Purple Theme */}
            <Card className="relative overflow-hidden border border-purple-400/30 bg-gradient-to-br from-[#1a0533] via-[#2d1058] to-[#4a1f7f] text-white shadow-[0_20px_60px_rgba(61,26,110,0.35)] rounded-2xl">
              {/* Subtle luxury diagonal texture */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)`
                }}
              />
              {/* Ambient purple & gold radial glows */}
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-purple-600/25 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-1/3 bottom-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <CardContent className="p-6 sm:p-8 relative z-10 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-purple-300/20 pb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold tracking-wider text-amber-300 uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Cinnamon Grand Loyalty Membership
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        ● Active Member
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                      {memberDetails?.first_name} {memberDetails?.last_name}
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {memberDetails?.category_name && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-900/60 text-amber-200 border border-amber-300/30">
                          {memberDetails.category_name}
                        </span>
                      )}
                      {memberDetails?.company_name && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-purple-200 bg-purple-950/50 px-2.5 py-0.5 rounded-md border border-purple-400/20">
                          <Building2 className="w-3.5 h-3.5 text-purple-300" />
                          {memberDetails.company_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Membership Number Box & Card Actions */}
                  <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
                    <div className="bg-purple-950/60 backdrop-blur-md rounded-xl p-4 sm:p-5 border border-purple-300/30 text-left md:text-right shadow-lg w-full md:w-auto">
                      <p className="text-xs uppercase tracking-wider text-purple-200/80 font-medium">Membership Code</p>
                      <p className="text-2xl sm:text-3xl font-mono font-bold text-amber-300 tracking-wider mt-0.5">
                        {memberDetails?.member_code || user?.member_code || "N/A"}
                      </p>
                      {memberDetails?.discount_percentage > 0 && (
                        <p className="text-xs font-medium text-emerald-300 mt-1 flex items-center md:justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {memberDetails.discount_percentage}% Privilege Discount
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={() => setIsCardOpen(true)}
                      size="sm"
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold shadow-md flex items-center gap-2 border border-amber-300/50 w-full md:w-auto justify-center transition-all hover:scale-102 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-purple-950" />
                      View &amp; Download Card
                      <Download className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                    </Button>
                  </div>
                </div>

                {/* Member Contact & Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs text-purple-100">
                  <div className="bg-purple-950/40 backdrop-blur-sm p-3.5 rounded-xl border border-purple-300/20 space-y-1">
                    <p className="text-purple-300 font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-300" />
                      Primary Mobile
                    </p>
                    <p className="text-sm font-mono text-white font-medium">
                      {memberDetails?.mobile || "Not specified"}
                    </p>
                  </div>

                  {memberDetails?.secondary_mobile && (
                    <div className="bg-purple-950/40 backdrop-blur-sm p-3.5 rounded-xl border border-purple-300/20 space-y-1">
                      <p className="text-purple-300 font-medium flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-fuchsia-300" />
                        Secondary Mobile
                      </p>
                      <p className="text-sm font-mono text-white font-medium">
                        {memberDetails.secondary_mobile}
                      </p>
                    </div>
                  )}

                  <div className="bg-purple-950/40 backdrop-blur-sm p-3.5 rounded-xl border border-purple-300/20 space-y-1">
                    <p className="text-purple-300 font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-300" />                      Email Address
                    </p>
                    <p className="text-sm text-white truncate font-medium">
                      {memberDetails?.email || user?.email || "Not specified"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Redemption & Reversal Section */}
            <div className="space-y-4">
              <Redemption />
            </div>
          </div>
        ) : (
          // ==========================================
          // ADMIN / STAFF VIEW WITH FULL NAVIGATION TABS
          // ==========================================
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <div className="flex flex-col gap-2 bg-muted p-1 rounded-lg sm:flex-row sm:items-center">
              <TabsList
                className="flex-1 grid w-full bg-transparent p-0 h-auto overflow-x-auto sm:overflow-visible"
                style={{ gridTemplateColumns: `repeat(${[isSuperAdmin || permissions?.registration, isSuperAdmin || permissions?.redemption, isSuperAdmin || permissions?.transactions, isSuperAdmin || permissions?.reports].filter(Boolean).length}, minmax(0, 1fr))` }}
              >
                {(isSuperAdmin || permissions?.registration) && (
                  <TabsTrigger
                    value="registration"
                    className="min-w-0 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span className="truncate">Registration</span>
                  </TabsTrigger>
                )}
                {(isSuperAdmin || permissions?.redemption) && (
                  <TabsTrigger
                    value="redemption"
                    className="min-w-0 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span className="truncate">Redemption</span>
                  </TabsTrigger>
                )}
                {(isSuperAdmin || permissions?.transactions) && (
                  <TabsTrigger
                    value="transactions"
                    className="min-w-0 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span className="truncate">Transactions</span>
                  </TabsTrigger>
                )}
                {(isSuperAdmin || permissions?.reports) && (
                  <TabsTrigger
                    value="reports"
                    className="min-w-0 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span className="truncate">Reports</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {hasSettings && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={settingsActive ? "default" : "ghost"}
                      className="w-full justify-between gap-2 sm:w-auto sm:justify-start"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {(isSuperAdmin || permissions?.settings_categories) && (
                      <DropdownMenuItem onClick={() => setActiveTab("categories")} className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        Member Categories
                      </DropdownMenuItem>
                    )}
                    {(isSuperAdmin || permissions?.settings_offers) && (
                      <DropdownMenuItem onClick={() => setActiveTab("offers")} className="cursor-pointer">
                        <Gift className="mr-2 h-4 w-4" />
                        Offers
                      </DropdownMenuItem>
                    )}
                    {(isSuperAdmin || permissions?.settings_notifications) && (
                      <DropdownMenuItem onClick={() => setActiveTab("notifications")} className="cursor-pointer">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send Notifications
                      </DropdownMenuItem>
                    )}
                    {(isSuperAdmin || permissions?.settings_audit) && (
                      <DropdownMenuItem onClick={() => setActiveTab("audit")} className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Audit Trail
                      </DropdownMenuItem>
                    )}
                    {isSuperAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setActiveTab("usermanagement")} className="cursor-pointer font-medium">
                          <UserCog className="mr-2 h-4 w-4" />
                          User Management
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <TabsContent value="registration" className="space-y-4">
              {canAccess("registration") ? <CompanyRegistration /> : <AccessDenied />}
            </TabsContent>

            <TabsContent value="redemption" className="space-y-4">
              {canAccess("redemption") ? <Redemption /> : <AccessDenied />}
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              {canAccess("transactions") ? <TransactionTracking activeTab={activeTab} /> : <AccessDenied />}
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              {canAccess("reports") ? <ReportsAnalytics activeTab={activeTab} /> : <AccessDenied />}
            </TabsContent>

            <TabsContent value="offers" className="space-y-4">
              {canAccess("offers") ? <OfferManagement /> : <AccessDenied />}
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              {canAccess("categories") ? <CustomerCategoryManagement /> : <AccessDenied />}
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              {canAccess("audit") ? <AuditTrail parentActiveTab={activeTab} /> : <AccessDenied />}
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              {canAccess("notifications") ? <SendNotifications /> : <AccessDenied />}
            </TabsContent>

            <TabsContent value="usermanagement" className="space-y-4">
              {isSuperAdmin ? <UserManagement /> : <AccessDenied />}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />

      {isMember && (
        <MembershipCard
          open={isCardOpen}
          onOpenChange={setIsCardOpen}
          member={memberDetails || user?.member_data || {
            id: user?.id,
            first_name: user?.full_name?.split(' ')[0] || "Member",
            last_name: user?.full_name?.split(' ').slice(1).join(' ') || "",
            member_code: user?.member_code || "",
            category_name: "Privilege Member",
            email: user?.email,
            mobile: user?.mobile,
            is_active: true,
          }}
        />
      )}
    </div>
  );
};

const AccessDenied = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <Shield className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
    <h3 className="text-lg font-semibold text-muted-foreground">Access Restricted</h3>
    <p className="text-sm text-muted-foreground mt-1">You don&apos;t have permission to view this section.</p>
  </div>
);

export default DiscountManagement;
