import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { logout } from "@/store/slices/authSlice";
import { logActivity } from "@/utils/auditLogger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, FileText, BarChart3, Settings, ChevronDown, Gift, Users, Shield, MessageSquare, UserCog, LogOut, User } from "lucide-react";
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
import cinnamonLogo from "@/assets/cinnamon-logo.png";

const DiscountManagement = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const permissions = user?.permissions;
  const isSuperAdmin = user?.role === "superadmin";

  // Determine first accessible tab
  const getDefaultTab = () => {
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

  const canAccess = (tab: string): boolean => {
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

  const hasSettings = isSuperAdmin || 
    permissions?.settings_categories || 
    permissions?.settings_offers || 
    permissions?.settings_notifications || 
    permissions?.settings_audit;

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
    window.location.href = "/login";
  };

  const settingsActive = ["offers", "categories", "audit", "notifications", "usermanagement"].includes(activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={cinnamonLogo}
                alt="Cinnamon Grand Colombo"
                className="h-12 object-contain"
              />
              <div className="border-l border-border pl-4">
                <h1 className="text-2xl font-serif font-semibold text-foreground">
                  Discount Management
                </h1>
                <p className="text-sm text-muted-foreground">
                  Corporate Benefits &amp; Member Discount System
                </p>
              </div>
            </div>

            {/* User info + Logout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-semibold leading-none">{user?.full_name || user?.username}</div>
                    <div className="text-xs text-muted-foreground capitalize">{user?.role === "superadmin" ? "Super Admin" : "User"}</div>
                  </div>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2 text-xs text-muted-foreground">@{user?.username}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer">
                  <UserCog className="mr-2 h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
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
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <TabsList className="flex-1 grid bg-transparent p-0 h-auto" style={{ gridTemplateColumns: `repeat(${[isSuperAdmin || permissions?.registration, isSuperAdmin || permissions?.redemption, isSuperAdmin || permissions?.transactions, isSuperAdmin || permissions?.reports].filter(Boolean).length}, 1fr)` }}>
              {(isSuperAdmin || permissions?.registration) && (
                <TabsTrigger
                  value="registration"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Registration
                </TabsTrigger>
              )}
              {(isSuperAdmin || permissions?.redemption) && (
                <TabsTrigger
                  value="redemption"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Redemption
                </TabsTrigger>
              )}
              {(isSuperAdmin || permissions?.transactions) && (
                <TabsTrigger
                  value="transactions"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Transactions
                </TabsTrigger>
              )}
              {(isSuperAdmin || permissions?.reports) && (
                <TabsTrigger
                  value="reports"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Reports
                </TabsTrigger>
              )}
            </TabsList>

            {hasSettings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={settingsActive ? "default" : "ghost"}
                    className="gap-2"
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
      </main>

      <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />
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

