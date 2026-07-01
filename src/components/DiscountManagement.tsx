import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, FileText, BarChart3, Settings, ChevronDown, Gift, Users, Shield, MessageSquare } from "lucide-react";
import CompanyRegistration from "./discount/CompanyRegistration";
import Redemption from "./discount/Redemption";
import TransactionTracking from "./discount/TransactionTracking";
import ReportsAnalytics from "./discount/ReportsAnalytics";
import OfferManagement from "./discount/OfferManagement";
import CustomerCategoryManagement from "./discount/CustomerCategoryManagement";
import { AuditTrail } from "./discount/AuditTrail";
import SendNotifications from "./discount/SendNotifications";
import cinnamonLogo from "@/assets/cinnamon-logo.png";

const DiscountManagement = () => {
  const [activeTab, setActiveTab] = useState("registration");

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
                  Member Portal
                </h1>
                {/* <p className="text-sm text-muted-foreground">
                  Corporate Benefits & Member Discount System
                </p> */}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <TabsList className="flex-1 grid grid-cols-4 bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="registration" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Building2 className="mr-2 h-4 w-4" />
                Registration
              </TabsTrigger>
              <TabsTrigger 
                value="redemption"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Redemption
              </TabsTrigger>
              <TabsTrigger 
                value="transactions"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="mr-2 h-4 w-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger 
                value="reports"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Reports
              </TabsTrigger>
            </TabsList>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={activeTab === "offers" || activeTab === "categories" || activeTab === "audit" || activeTab === "notifications" ? "default" : "ghost"}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setActiveTab("offers")} className="cursor-pointer">
                  <Gift className="mr-2 h-4 w-4" />
                  Offers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("categories")} className="cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  Member Categories
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("notifications")} className="cursor-pointer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("audit")} className="cursor-pointer">
                  <Shield className="mr-2 h-4 w-4" />
                  Audit Trail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="registration" className="space-y-4">
            <CompanyRegistration />
          </TabsContent>

          <TabsContent value="redemption" className="space-y-4">
            <Redemption />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <TransactionTracking />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <ReportsAnalytics />
          </TabsContent>

          <TabsContent value="offers" className="space-y-4">
            <OfferManagement />
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <CustomerCategoryManagement />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditTrail />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <SendNotifications />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DiscountManagement;
