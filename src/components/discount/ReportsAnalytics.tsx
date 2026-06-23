import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, Download, TrendingUp, Users, DollarSign, 
  Calendar as CalendarIcon, Package, FileText, PieChart, Activity, AlertCircle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, eachDayOfInterval, startOfDay } from "date-fns";
import { 
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportStats {
  totalMembers: number;
  activeMembers: number;
  totalTransactions: number;
  totalDiscountValue: number;
  totalOfferRedemptions: number;
  averageDiscount: number;
  topCompany: string;
  topCategory: string;
  memberGrowth: number;
}

interface TrendData {
  date: string;
  discounts: number;
  offers: number;
  amount: number;
}

interface CategoryData {
  name: string;
  value: number;
  members: number;
}

interface CompanyData {
  name: string;
  transactions: number;
  amount: number;
}

interface OfferData {
  name: string;
  redemptions: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];
const COMPANY_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c026d3', '#d946ef', '#e879f9', '#f0abfc', '#f5d0fe'];

const CustomLabel = (props: any) => {
  const { x, y, width, height, value, name } = props;
  
  // Only show label if bar is tall enough
  if (height < 60) return null;
  
  return (
    <text 
      x={x + width / 2} 
      y={y + height - 10} 
      fill="#fff" 
      textAnchor="start" 
      fontSize="11"
      fontWeight="600"
      transform={`rotate(-90, ${x + width / 2}, ${y + height - 10})`}
    >
      {name}
    </text>
  );
};

const CustomCompanyLabel = (props: any) => {
  const { x, y, width, height, value, name } = props;
  
  // Only show label if bar is tall enough
  if (height < 60) return null;
  
  return (
    <text 
      x={x + width / 2} 
      y={y + height - 10} 
      fill="#fff" 
      textAnchor="start" 
      fontSize="11"
      fontWeight="600"
      transform={`rotate(-90, ${x + width / 2}, ${y + height - 10})`}
    >
      {name}
    </text>
  );
};

const ReportsAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats>({
    totalMembers: 0,
    activeMembers: 0,
    totalTransactions: 0,
    totalDiscountValue: 0,
    totalOfferRedemptions: 0,
    averageDiscount: 0,
    topCompany: '',
    topCategory: '',
    memberGrowth: 0
  });

  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [companyData, setCompanyData] = useState<CompanyData[]>([]);
  const [offerData, setOfferData] = useState<OfferData[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<{ name: string; value: number }[]>([]);
  const [memberOfferAudit, setMemberOfferAudit] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Date range states
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dateTo, setDateTo] = useState<Date | undefined>(() => new Date());

  // Fetch all report data
  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Build date filter
      const fromDate = dateFrom ? startOfDay(dateFrom).toISOString() : undefined;
      const toDate = dateTo ? new Date(dateTo.setHours(23, 59, 59, 999)).toISOString() : undefined;

      // Fetch member stats
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*, companies(name), customer_categories(name)');

      if (membersError) throw membersError;

      // Fetch discount redemptions
      let discountQuery = supabase
        .from('discount_redemptions')
        .select('*, members(first_name, last_name, companies(name), customer_categories(name))');
      
      if (fromDate) discountQuery = discountQuery.gte('redeemed_at', fromDate);
      if (toDate) discountQuery = discountQuery.lte('redeemed_at', toDate);

      const { data: discounts, error: discountsError } = await discountQuery;
      if (discountsError) throw discountsError;

      // Fetch offer redemptions
      let offerQuery = supabase
        .from('offer_redemptions')
        .select('*, offers(name)');
      
      if (fromDate) offerQuery = offerQuery.gte('redeemed_at', fromDate);
      if (toDate) offerQuery = offerQuery.lte('redeemed_at', toDate);

      const { data: offers, error: offersError } = await offerQuery;
      if (offersError) throw offersError;

      // Calculate stats
      const totalDiscountValue = discounts?.reduce((sum, d) => sum + (Number(d.discount_amount) || 0), 0) || 0;
      const totalTransactions = (discounts?.length || 0) + (offers?.length || 0);
      const averageDiscount = discounts?.length ? totalDiscountValue / discounts.length : 0;
      const activeMembers = members?.filter(m => m.is_active).length || 0;

      // Company analysis
      const companyMap = new Map<string, { transactions: number; amount: number }>();
      discounts?.forEach(d => {
        const companyName = d.members?.companies?.name || 'Unknown';
        const current = companyMap.get(companyName) || { transactions: 0, amount: 0 };
        companyMap.set(companyName, {
          transactions: current.transactions + 1,
          amount: current.amount + (Number(d.discount_amount) || 0)
        });
      });

      const companiesArray = Array.from(companyMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.transactions - a.transactions)
        .slice(0, 5);

      // Category analysis
      const categoryMap = new Map<string, { value: number; members: number }>();
      members?.forEach(m => {
        const categoryName = m.customer_categories?.name || 'Unknown';
        const current = categoryMap.get(categoryName) || { value: 0, members: 0 };
        categoryMap.set(categoryName, {
          value: current.value,
          members: current.members + 1
        });
      });

      discounts?.forEach(d => {
        const categoryName = d.members?.customer_categories?.name || 'Unknown';
        const current = categoryMap.get(categoryName) || { value: 0, members: 0 };
        
        // Calculate actual discount value based on type
        let discountValue = 0;
        if (d.discount_type === 'fixed') {
          discountValue = Number(d.discount_value) || 0;
        } else if (d.discount_type === 'percentage' && d.discount_amount) {
          // Use discount_amount if available
          discountValue = Number(d.discount_amount) || 0;
        }
        // Note: For percentage discounts without bill amount, we can't calculate the actual value
        
        categoryMap.set(categoryName, {
          value: current.value + discountValue,
          members: current.members
        });
      });

      const categoriesArray = Array.from(categoryMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.value - a.value);

      // Offer analysis
      const offerMap = new Map<string, number>();
      offers?.forEach(o => {
        const offerName = o.offers?.name || 'Unknown';
        offerMap.set(offerName, (offerMap.get(offerName) || 0) + 1);
      });

      const offersArray = Array.from(offerMap.entries())
        .map(([name, redemptions]) => ({ name, redemptions }))
        .sort((a, b) => b.redemptions - a.redemptions)
        .slice(0, 5);

      // Trend data (daily aggregation)
      if (dateFrom && dateTo) {
        const days = eachDayOfInterval({ start: dateFrom, end: dateTo });
        const trendsArray = days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayDiscounts = discounts?.filter(d => 
            format(new Date(d.redeemed_at), 'yyyy-MM-dd') === dayStr
          ) || [];
          const dayOffers = offers?.filter(o => 
            format(new Date(o.redeemed_at), 'yyyy-MM-dd') === dayStr
          ) || [];
          
          return {
            date: format(day, 'MMM dd'),
            discounts: dayDiscounts.length,
            offers: dayOffers.length,
            amount: dayDiscounts.reduce((sum, d) => sum + (Number(d.discount_amount) || 0), 0)
          };
        });
        setTrendData(trendsArray);
      }

      // Type distribution
      setTypeDistribution([
        { name: 'Discounts', value: discounts?.length || 0 },
        { name: 'Offers', value: offers?.length || 0 }
      ]);

      setStats({
        totalMembers: members?.length || 0,
        activeMembers,
        totalTransactions,
        totalDiscountValue,
        totalOfferRedemptions: offers?.length || 0,
        averageDiscount,
        topCompany: companiesArray[0]?.name || 'N/A',
        topCategory: categoriesArray[0]?.name || 'N/A',
        memberGrowth: 0
      });

      setCompanyData(companiesArray);
      setCategoryData(categoriesArray);
      setOfferData(offersArray);

      // Fetch member-offer audit data
      const { data: allOffers, error: allOffersError } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true);

      if (allOffersError) throw allOffersError;

      const { data: offerCategories, error: offerCategoriesError } = await supabase
        .from('offer_categories')
        .select('*');

      if (offerCategoriesError) throw offerCategoriesError;

      // Fetch offer redemptions for member audit with full details
      const { data: offerRedemptionsData, error: offerRedemptionsError } = await supabase
        .from('offer_redemptions')
        .select('customer_phone, offer_id, redeemed_at, bill_number');

      if (offerRedemptionsError) throw offerRedemptionsError;

      // Fetch discount redemptions for member audit
      const { data: discountRedemptionsData, error: discountRedemptionsError } = await supabase
        .from('discount_redemptions')
        .select('customer_phone, discount_type, discount_value, redeemed_at, bill_number');

      if (discountRedemptionsError) throw discountRedemptionsError;

      // Build audit data
      const auditData = members?.map(member => {
        const memberOffers = Array.isArray(member.selected_offers) 
          ? member.selected_offers as string[] 
          : [];
        
        const categoryOfferIds = offerCategories
          ?.filter(oc => oc.category_id === member.category_id)
          .map(oc => oc.offer_id) || [];
        
        // Normalize member phone for comparison - remove + and spaces
        const normalizedMemberPhone = member.mobile?.replace(/[\s+]/g, '').trim();
        
        const assignedOffers = memberOffers
          .map(offerId => {
            const offer = allOffers?.find(o => o.id === offerId);
            if (!offer) return null;
            
            // Get all redemptions for this member and offer with normalized phone comparison
            const redemptions = offerRedemptionsData?.filter(r => {
              const normalizedRedemptionPhone = r.customer_phone?.replace(/[\s+]/g, '').trim();
              return normalizedRedemptionPhone === normalizedMemberPhone && r.offer_id === offerId;
            }) || [];
            
            // Check if offer is expiring soon (within 7 days)
            const validTo = new Date(offer.valid_to);
            const daysUntilExpiry = Math.ceil((validTo.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
            
            return {
              id: offer.id,
              name: offer.name,
              redemptionCount: redemptions.length,
              redemptions: redemptions.map(r => ({
                date: r.redeemed_at,
                billNumber: r.bill_number
              })),
              maxDiscountAmount: offer.max_discount_amount,
              minBillValue: offer.min_bill_value,
              validTo: offer.valid_to,
              isExpiringSoon,
              daysUntilExpiry
            };
          })
          .filter(Boolean);
        
        // Get discount redemptions for this member
        const memberDiscountRedemptions = discountRedemptionsData?.filter(r => {
          const normalizedRedemptionPhone = r.customer_phone?.replace(/[\s+]/g, '').trim();
          return normalizedRedemptionPhone === normalizedMemberPhone;
        }) || [];
        
        const extraOffers = assignedOffers.filter(
          offer => !categoryOfferIds.includes(offer!.id)
        );
        
        return {
          memberId: member.id,
          memberCode: member.member_code,
          firstName: member.first_name,
          lastName: member.last_name,
          mobile: member.mobile,
          categoryId: member.category_id,
          categoryName: member.customer_categories?.name || 'No Category',
          isActive: member.is_active,
          assignedOffers: assignedOffers,
          discountRedemptions: memberDiscountRedemptions.map(d => ({
            discountType: d.discount_type,
            discountValue: d.discount_value,
            date: d.redeemed_at,
            billNumber: d.bill_number
          })),
          discountPercentage: member.discount_percentage,
          discountAmount: member.discount_amount,
          discountPolicy: member.discount_policy,
          extraOffers: extraOffers.map(o => o!.name),
          status: extraOffers.length === 0 ? 'Match' : 'Mismatch'
        };
      }) || [];

      setMemberOfferAudit(auditData);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    setCurrentPage(1);
  }, [dateFrom, dateTo]);

  // Export functions
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Members', stats.totalMembers],
      ['Active Members', stats.activeMembers],
      ['Total Transactions', stats.totalTransactions],
      ['Total Discount Value', `Rs ${stats.totalDiscountValue.toFixed(2)}`],
      ['Total Offer Redemptions', stats.totalOfferRedemptions],
      ['Average Discount', `Rs ${stats.averageDiscount.toFixed(2)}`],
      ['Top Company', stats.topCompany],
      ['Top Category', stats.topCategory]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Company data sheet
    if (companyData.length > 0) {
      const companySheet = XLSX.utils.json_to_sheet(companyData);
      XLSX.utils.book_append_sheet(wb, companySheet, 'Companies');
    }

    // Category data sheet
    if (categoryData.length > 0) {
      const categorySheet = XLSX.utils.json_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, categorySheet, 'Categories');
    }

    // Offer data sheet
    if (offerData.length > 0) {
      const offerSheet = XLSX.utils.json_to_sheet(offerData);
      XLSX.utils.book_append_sheet(wb, offerSheet, 'Offers');
    }

    XLSX.writeFile(wb, `report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel report exported successfully');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Comprehensive Analytics Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 28);
    doc.text(`Period: ${dateFrom ? format(dateFrom, 'PP') : 'All'} - ${dateTo ? format(dateTo, 'PP') : 'All'}`, 14, 34);

    // Summary stats
    doc.setFontSize(14);
    doc.text('Summary Statistics', 14, 44);
    
    autoTable(doc, {
      startY: 48,
      head: [['Metric', 'Value']],
      body: [
        ['Total Members', stats.totalMembers.toString()],
        ['Active Members', stats.activeMembers.toString()],
        ['Total Transactions', stats.totalTransactions.toString()],
        ['Total Discount Value', `Rs ${stats.totalDiscountValue.toFixed(2)}`],
        ['Offer Redemptions', stats.totalOfferRedemptions.toString()],
        ['Average Discount', `Rs ${stats.averageDiscount.toFixed(2)}`],
        ['Top Company', stats.topCompany],
        ['Top Category', stats.topCategory]
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] }
    });

    // Top Companies
    if (companyData.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Top Companies by Transactions', 14, 20);
      
      autoTable(doc, {
        startY: 25,
        head: [['Company', 'Transactions', 'Amount']],
        body: companyData.map(c => [c.name, c.transactions.toString(), `Rs ${c.amount.toFixed(2)}`]),
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] }
      });
    }

    // Categories
    if (categoryData.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Category Analysis', 14, 20);
      
      autoTable(doc, {
        startY: 25,
        head: [['Category', 'Members', 'Total Value']],
        body: categoryData.map(c => [c.name, c.members.toString(), `Rs ${c.value.toFixed(2)}`]),
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] }
      });
    }

    doc.save(`report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF report exported successfully');
  };

  const fixMemberOffers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fix-member-offers', {
        method: 'POST'
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Fixed ${data.fixed_count} members with missing offers`);
        await fetchReportData();
      } else {
        throw new Error(data?.error || 'Failed to fix offers');
      }
    } catch (error) {
      console.error('Error fixing member offers:', error);
      toast.error('Failed to fix member offers');
    }
  };

  const exportMemberOfferAudit = () => {
    const wb = XLSX.utils.book_new();
    
    const auditData = memberOfferAudit.map(member => {
      const offerNames = member.assignedOffers.map((o: any) => o.name).join(', ');
      const offerRedemptions = member.assignedOffers.reduce((sum: number, o: any) => sum + o.redemptionCount, 0);
      
      return {
        'Member Code': member.memberCode,
        'Name': `${member.firstName} ${member.lastName}`,
        'Mobile': member.mobile,
        'Category': member.categoryName,
        'Status': member.isActive ? 'Active' : 'Inactive',
        'Assigned Offers': offerNames || 'None',
        'Total Offer Redemptions': offerRedemptions,
        'Discount Policy': member.discountPolicy,
        'Discount Value': member.discountPolicy === 'percentage' 
          ? `${member.discountPercentage}%` 
          : `Rs ${member.discountAmount}`,
        'Total Discount Redemptions': member.discountRedemptions.length,
        'Match Status': member.status
      };
    });

    const sheet = XLSX.utils.json_to_sheet(auditData);
    XLSX.utils.book_append_sheet(wb, sheet, 'Member-Offer Assignment');
    XLSX.writeFile(wb, `Member_Offer_Assignment_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Member-Offer assignment exported successfully');
  };

  const exportToCSV = () => {
    const csvData = [
      ['Comprehensive Analytics Report'],
      [`Generated: ${format(new Date(), 'PPpp')}`],
      [`Period: ${dateFrom ? format(dateFrom, 'PP') : 'All'} - ${dateTo ? format(dateTo, 'PP') : 'All'}`],
      [],
      ['Summary Statistics'],
      ['Metric', 'Value'],
      ['Total Members', stats.totalMembers],
      ['Active Members', stats.activeMembers],
      ['Total Transactions', stats.totalTransactions],
      ['Total Discount Value', `Rs ${stats.totalDiscountValue.toFixed(2)}`],
      ['Offer Redemptions', stats.totalOfferRedemptions],
      ['Average Discount', `Rs ${stats.averageDiscount.toFixed(2)}`],
      ['Top Company', stats.topCompany],
      ['Top Category', stats.topCategory],
      [],
      ['Top Companies'],
      ['Company', 'Transactions', 'Amount'],
      ...companyData.map(c => [c.name, c.transactions, `Rs ${c.amount.toFixed(2)}`])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('CSV report exported successfully');
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="analytics" className="w-full">
        <Card className="mt-4">
          <TabsList className="grid w-full grid-cols-2 h-auto p-0 bg-transparent border-b rounded-none">
            <TabsTrigger 
              value="analytics" 
              className="rounded-none rounded-tl-lg data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=inactive]:bg-muted/50 py-3 border-r border-b-0"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="member-offer" 
              className="rounded-none rounded-tr-lg data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=inactive]:bg-muted/50 py-3 border-b-0"
            >
              Member-Offer Assignment
            </TabsTrigger>
          </TabsList>

          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => {
                        setDateFrom(date);
                        setFromDateOpen(false);
                      }}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => {
                        setDateTo(date);
                        setToDateOpen(false);
                      }}
                      disabled={(date) => dateFrom ? date < dateFrom : false}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  className="bg-muted hover:bg-muted/80 text-foreground border border-border"
                  onClick={() => {
                    setDateFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                    setDateTo(new Date());
                  }}
                >
                  Reset to This Month
                </Button>
              </div>
            </CardContent>
        </Card>

        <TabsContent value="analytics" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Members</p>
                    <p className="text-3xl font-bold">
                      {loading ? '...' : stats.totalMembers}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.activeMembers} active
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-3xl font-bold">
                      {loading ? '...' : stats.totalTransactions}
                    </p>
                    <p className="text-xs text-success flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Active period
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Discount Value</p>
                    <p className="text-2xl font-bold">
                      {loading ? '...' : `Rs ${stats.totalDiscountValue.toFixed(0)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avg: Rs {stats.averageDiscount.toFixed(0)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Offer Redemptions</p>
                    <p className="text-3xl font-bold">
                      {loading ? '...' : stats.totalOfferRedemptions}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Top: {stats.topCategory}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transaction Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Transaction Trends
                </CardTitle>
                <CardDescription>Daily transaction volume over time</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="discounts" stroke="#0088FE" name="Discounts" />
                    <Line type="monotone" dataKey="offers" stroke="#00C49F" name="Offers" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Transaction Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Transaction Types
                </CardTitle>
                <CardDescription>Distribution of discount vs offer redemptions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Companies */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Companies
                </CardTitle>
                <CardDescription>Companies by transaction volume</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={companyData} margin={{ top: 10, right: 20, left: -10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name"
                      hide={true}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="square"
                      wrapperStyle={{ paddingTop: '15px' }}
                      payload={[{ value: 'Company type', type: 'square', color: '#6366f1' }]}
                    />
                    <Bar dataKey="transactions" fill="#0088FE" name="Transactions">
                      {companyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COMPANY_COLORS[index % COMPANY_COLORS.length]} />
                      ))}
                      <LabelList 
                        dataKey="name" 
                        content={CustomCompanyLabel}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Offers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Top Offers
                </CardTitle>
                <CardDescription>Most redeemed offers</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={offerData} margin={{ top: 10, right: 20, left: -10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name"
                      hide={true}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="square"
                      wrapperStyle={{ paddingTop: '15px' }}
                      payload={[{ value: 'Offer type', type: 'square', color: '#8884d8' }]}
                    />
                    <Bar dataKey="redemptions" name="Redemptions">
                      {offerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <LabelList 
                        dataKey="name" 
                        content={CustomLabel}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Category Analysis
              </CardTitle>
              <CardDescription>Member distribution and discount value by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryData.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-12 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-muted-foreground">{category.members} members</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="font-semibold">Rs {category.value.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Reports
              </CardTitle>
              <CardDescription>Download comprehensive reports in various formats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={exportToCSV} variant="outline" disabled={loading}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button onClick={exportToExcel} variant="outline" disabled={loading}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
                <Button onClick={exportToPDF} variant="outline" disabled={loading}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="member-offer" className="mt-6">
          {/* Member-Offer Assignment Report */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Member-Offer Assignment</CardTitle>
                  <CardDescription>
                    View offer assignments and redemptions per member
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={fixMemberOffers} variant="outline" size="sm">
                    Fix Missing Offers
                  </Button>
                  <Button onClick={exportMemberOfferAudit} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Total Members</div>
                      <div className="text-2xl font-bold">{memberOfferAudit.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Active Members</div>
                      <div className="text-2xl font-bold">
                        {memberOfferAudit.filter(m => m.isActive).length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Members with Redemptions</div>
                      <div className="text-2xl font-bold text-green-600">
                        {memberOfferAudit.filter(m => m.assignedOffers.some((o: any) => o.redemptionCount > 0)).length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Audit Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-3 border-b">Member</th>
                          <th className="text-left p-3 border-b">Category</th>
                          <th className="text-left p-3 border-b">Assigned Offers</th>
                          <th className="text-left p-3 border-b">Discount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberOfferAudit
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((member) => (
                          <tr key={member.memberId} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div>
                                <div className="font-medium">
                                  {member.firstName} {member.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {member.mobile}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {member.memberCode}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">{member.categoryName}</Badge>
                            </td>
                            <td className="p-3">
                              <div className="text-xs">
                                {member.assignedOffers.length > 0 ? (
                                  <ul className="space-y-2">
                                    {member.assignedOffers.map((offer: any, idx: number) => (
                                      <li key={idx}>
                                        <div>
                                          <span 
                                            className="flex items-center gap-1 font-semibold"
                                            style={{ color: offer.redemptionCount > 0 ? '#059669' : '#374151' }}
                                          >
                                            {offer.name} {offer.redemptionCount > 0 && `(${offer.redemptionCount}x)`}
                                            {offer.isExpiringSoon && (
                                              <span title={`Expires in ${offer.daysUntilExpiry} days`}>
                                                <AlertCircle className="h-3 w-3 text-orange-500" />
                                              </span>
                                            )}
                                          </span>
                                          {offer.redemptionCount > 0 && (
                                            <div className="mt-1 space-y-0.5 ml-2">
                                              {offer.redemptions.map((redemption: any, rIdx: number) => (
                                                <div 
                                                  key={rIdx} 
                                                  className="text-[10px] font-medium"
                                                  style={{ color: '#2563EB' }}
                                                >
                                                  ({format(new Date(redemption.date), 'dd MMM yyyy')} - Bill: {redemption.billNumber})
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-muted-foreground">None</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-xs">
                                {member.discountRedemptions && member.discountRedemptions.length > 0 ? (
                                  <div>
                                    <div 
                                      className="font-semibold"
                                      style={{ color: '#059669' }}
                                    >
                                      {member.discountPolicy === 'percentage' 
                                        ? `${member.discountPercentage}%` 
                                        : `Rs ${member.discountAmount}`}
                                    </div>
                                    <div className="mt-1 space-y-0.5 ml-2">
                                      {member.discountRedemptions.map((redemption: any, rIdx: number) => (
                                        <div 
                                          key={rIdx} 
                                          className="text-[10px] font-medium"
                                          style={{ color: '#2563EB' }}
                                        >
                                          ({format(new Date(redemption.date), 'dd MMM yyyy')} - Bill: {redemption.billNumber})
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    className="font-semibold"
                                    style={{ color: '#6B7280' }}
                                  >
                                    {member.discountPolicy === 'percentage' 
                                      ? `${member.discountPercentage}%` 
                                      : `Rs ${member.discountAmount}`}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, memberOfferAudit.length)} of {memberOfferAudit.length} members
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(memberOfferAudit.length / itemsPerPage) }, (_, i) => i + 1)
                          .filter(page => {
                            return page === 1 || 
                                   page === Math.ceil(memberOfferAudit.length / itemsPerPage) ||
                                   Math.abs(page - currentPage) <= 1;
                          })
                          .map((page, idx, arr) => {
                            const prevPage = arr[idx - 1];
                            const showEllipsis = prevPage && page - prevPage > 1;
                            
                            return (
                              <div key={page} className="flex items-center gap-1">
                                {showEllipsis && <span className="px-2">...</span>}
                                <Button
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(memberOfferAudit.length / itemsPerPage), prev + 1))}
                        disabled={currentPage >= Math.ceil(memberOfferAudit.length / itemsPerPage)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsAnalytics;
