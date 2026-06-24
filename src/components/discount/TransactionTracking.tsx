import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Filter, ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  bill_number: string;
  customer_phone: string;
  member_name: string;
  company_name: string;
  category_name: string;
  discount_amount: number;
  discount_type: string;
  discount_value: number;
  redeemed_at: string;
  type: "discount" | "offer";
  offer_name?: string;
}

const TransactionTracking = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
  const [offers, setOffers] = useState<Array<{ id: string; name: string }>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [offerFilter, setOfferFilter] = useState<string>("all");
  
  // Popover open states for calendars
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  
  // Set default date range: 1st of current month to today
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dateTo, setDateTo] = useState<Date | undefined>(() => new Date());
  
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  // Fetch available categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_categories')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
      } else if (data) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch available offers, optionally filtered by category
  const fetchOffers = async (categoryId?: string) => {
    try {
      if (!categoryId || categoryId === 'all') {
        const { data, error } = await supabase
          .from('offers')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching offers:', error);
        } else if (data) {
          setOffers(data);
        }
      } else {
        const { data, error } = await supabase
          .from('offer_categories')
          .select(`
            offers (
              id,
              name,
              is_active
            )
          `)
          .eq('category_id', parseInt(categoryId));

        if (error) {
          console.error('Error fetching offers for category:', error);
        } else if (data) {
          const filteredOffers = data
            .map((item: any) => item.offers)
            .filter((offer: any) => offer && offer.is_active)
            .map((offer: any) => ({ id: offer.id, name: offer.name }));
          filteredOffers.sort((a, b) => a.name.localeCompare(b.name));
          setOffers(filteredOffers);
        }
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  // Fetch transactions from Supabase
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const from = 0;
      const to = 1000; // Fetch all matching records

      // Fetch discount redemptions
      let discountQuery = supabase
        .from('discount_redemptions')
        .select(
          categoryFilter !== 'all'
            ? `
              id,
              bill_number,
              customer_phone,
              discount_amount,
              discount_type,
              discount_value,
              redeemed_at,
              members!discount_redemptions_member_id_fkey!inner (
                first_name,
                last_name,
                category_id,
                companies (name),
                customer_categories (name)
              )
            `
            : `
              id,
              bill_number,
              customer_phone,
              discount_amount,
              discount_type,
              discount_value,
              redeemed_at,
              members!discount_redemptions_member_id_fkey (
                first_name,
                last_name,
                category_id,
                companies (name),
                customer_categories (name)
              )
            `,
          { count: 'exact' }
        )
        .order('redeemed_at', { ascending: false });

      // Apply category filter to discount redemptions query if selected
      if (categoryFilter !== 'all') {
        discountQuery = discountQuery.eq('members.category_id', parseInt(categoryFilter));
      }

      // Apply search filter
      if (searchTerm) {
        discountQuery = discountQuery.or(`bill_number.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`);
      }

      // Apply date range filters
      if (dateFrom) {
        discountQuery = discountQuery.gte('redeemed_at', dateFrom.toISOString());
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        discountQuery = discountQuery.lte('redeemed_at', endOfDay.toISOString());
      }

      // Fetch offer redemptions
      let offerQuery = supabase
        .from('offer_redemptions')
        .select(`
          id,
          bill_number,
          customer_phone,
          redeemed_at,
          offers (
            id,
            name
          )
        `, { count: 'exact' })
        .order('redeemed_at', { ascending: false });

      // Apply search filter
      if (searchTerm) {
        offerQuery = offerQuery.or(`bill_number.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`);
      }

      // Apply date range filters
      if (dateFrom) {
        offerQuery = offerQuery.gte('redeemed_at', dateFrom.toISOString());
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        offerQuery = offerQuery.lte('redeemed_at', endOfDay.toISOString());
      }

      let allTransactions: Transaction[] = [];

      // Always fetch both discounts and offers
      const shouldFetchDiscounts = true;
      const shouldFetchOffers = true;

      // Fetch discounts
      if (shouldFetchDiscounts) {
        const { data: discountData, error: discountError } = await discountQuery.range(from, to);
        
        if (discountError) {
          console.error('Error fetching discount redemptions:', discountError);
          toast.error('Failed to fetch discount transactions');
        } else if (discountData) {
          const discountTransactions: Transaction[] = discountData.map((item: any) => ({
            id: item.id,
            bill_number: item.bill_number,
            customer_phone: item.customer_phone,
            member_name: item.members ? `${item.members.first_name} ${item.members.last_name}` : 'Unknown',
            company_name: item.members?.companies?.name || 'N/A',
            category_name: item.members?.customer_categories?.name || 'N/A',
            discount_amount: item.discount_amount,
            discount_type: item.discount_type,
            discount_value: item.discount_value,
            redeemed_at: item.redeemed_at,
            type: 'discount'
          }));
          allTransactions = [...allTransactions, ...discountTransactions];
        }
      }

      // Fetch offers
      if (shouldFetchOffers) {
        // Apply offer filter if selected
        if (offerFilter !== 'all') {
          offerQuery = offerQuery.eq('offer_id', offerFilter);
        }

        const { data: offerData, error: offerError } = await offerQuery.range(from, to);
        
        if (offerError) {
          console.error('Error fetching offer redemptions:', offerError);
          toast.error('Failed to fetch offer transactions');
        } else if (offerData && offerData.length > 0) {
          // Get unique phone numbers and prepare variations for matching
          const phoneNumbers = [...new Set(offerData.map((item: any) => item.customer_phone))];
          
          // Create all phone number variations for better matching
          const allPhoneVariations: string[] = [];
          phoneNumbers.forEach(phone => {
            allPhoneVariations.push(phone);
            // Add with + prefix if not present
            if (!phone.startsWith('+')) {
              allPhoneVariations.push('+' + phone);
            }
            // Add without + if present
            if (phone.startsWith('+')) {
              allPhoneVariations.push(phone.substring(1));
            }
          });

          // Fetch member data for these phone numbers with all variations
          const { data: membersData } = await supabase
            .from('members')
            .select(`
              mobile,
              first_name,
              last_name,
              category_id,
              companies (name),
              customer_categories (name)
            `)
            .in('mobile', allPhoneVariations);

          // Create a map for quick lookup with normalized phone numbers
          const memberMap = new Map();
          if (membersData) {
            membersData.forEach((member: any) => {
              // Normalize phone number (remove + and leading zeros)
              const normalizedPhone = member.mobile.replace(/^\+/, '').replace(/^0+/, '');
              memberMap.set(normalizedPhone, member);
              // Also store with original format
              memberMap.set(member.mobile, member);
            });
          }

          // Helper function to find member by phone with fuzzy matching
          const findMember = (phone: string) => {
            // Try exact match first
            if (memberMap.has(phone)) return memberMap.get(phone);
            
            // Try with + prefix
            if (memberMap.has('+' + phone)) return memberMap.get('+' + phone);
            
            // Try without + prefix
            if (phone.startsWith('+') && memberMap.has(phone.substring(1))) {
              return memberMap.get(phone.substring(1));
            }
            
            // Try normalized version (remove + and leading zeros)
            const normalizedPhone = phone.replace(/^\+/, '').replace(/^0+/, '');
            if (memberMap.has(normalizedPhone)) return memberMap.get(normalizedPhone);
            
            return null;
          };

          const offerTransactions: Transaction[] = offerData
            .filter((item: any) => item.offers)
            .map((item: any) => {
              const memberData = findMember(item.customer_phone);
              
              // If filtering by a specific category, we must have a matching member of that category
              if (categoryFilter !== 'all') {
                if (!memberData || memberData.category_id?.toString() !== categoryFilter) {
                  return null;
                }
              }

              const mData = memberData || {};
              return {
                id: item.id,
                bill_number: item.bill_number || 'N/A',
                customer_phone: item.customer_phone,
                member_name: mData.first_name ? `${mData.first_name} ${mData.last_name}` : 'Unknown',
                company_name: mData.companies?.name || 'N/A',
                category_name: mData.customer_categories?.name || 'N/A',
                discount_amount: 0,
                discount_type: 'offer',
                discount_value: 0,
                redeemed_at: item.redeemed_at,
                type: 'offer',
                offer_name: item.offers?.name || 'N/A'
              };
            })
            .filter(Boolean) as Transaction[];
          allTransactions = [...allTransactions, ...offerTransactions];
        }
      }

      // Sort by date
      allTransactions.sort((a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime());

      setAllTransactions(allTransactions);
      
      // Calculate pagination
      const total = allTransactions.length;
      const totalPages = Math.ceil(total / pageSize);
      
      setPagination({
        page: currentPage,
        limit: pageSize,
        total,
        totalPages
      });

      // Update displayed transactions based on current page
      updateDisplayedTransactions(allTransactions, currentPage, pageSize);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Update displayed transactions for current page
  const updateDisplayedTransactions = (transactions: Transaction[], page: number, size: number) => {
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    setDisplayedTransactions(transactions.slice(startIndex, endIndex));
  };

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
  }, []);

  useEffect(() => {
    fetchOffers(categoryFilter);
    setOfferFilter('all');
  }, [categoryFilter]);

  useEffect(() => {
    setCurrentPage(1);
    fetchTransactions();
  }, [categoryFilter, offerFilter, dateFrom, dateTo]);

  useEffect(() => {
    updateDisplayedTransactions(allTransactions, currentPage, pageSize);
    setPagination(prev => ({
      ...prev,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(allTransactions.length / pageSize)
    }));
  }, [currentPage, pageSize, allTransactions]);

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant={type === 'discount' ? 'default' : 'secondary'} className="capitalize">
        {type}
      </Badge>
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  // Export functions
  const exportToCSV = () => {
    const headers = ['Bill No', 'Member', 'Phone', 'Company', 'Category', 'Type', 'Details', 'Date & Time'];
    const csvData = allTransactions.map(t => [
      t.bill_number,
      t.member_name,
      t.customer_phone,
      t.company_name,
      t.category_name,
      t.type,
      t.type === 'discount' 
        ? `${t.discount_type === 'percentage' ? t.discount_value + '%' : 'Rs ' + t.discount_value}${t.discount_amount > 0 ? ' (Saved: Rs ' + t.discount_amount.toFixed(2) + ')' : ''}`
        : t.offer_name,
      new Date(t.redeemed_at).toLocaleString()
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      allTransactions.map(t => ({
        'Bill No': t.bill_number,
        'Member': t.member_name,
        'Phone': t.customer_phone,
        'Company': t.company_name,
        'Category': t.category_name,
        'Type': t.type,
        'Details': t.type === 'discount' 
          ? `${t.discount_type === 'percentage' ? t.discount_value + '%' : 'Rs ' + t.discount_value}${t.discount_amount > 0 ? ' (Saved: Rs ' + t.discount_amount.toFixed(2) + ')' : ''}`
          : t.offer_name,
        'Date & Time': new Date(t.redeemed_at).toLocaleString()
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, `transactions_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel exported successfully');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Transaction Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 22);

    const tableData = allTransactions.map(t => [
      t.bill_number,
      t.member_name,
      t.company_name,
      t.category_name,
      t.type,
      t.type === 'discount' 
        ? `${t.discount_type === 'percentage' ? t.discount_value + '%' : 'Rs ' + t.discount_value}`
        : t.offer_name,
      format(new Date(t.redeemed_at), 'PP')
    ]);

    autoTable(doc, {
      head: [['Bill No', 'Member', 'Company', 'Category', 'Type', 'Details', 'Date']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] }
    });

    doc.save(`transactions_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exported successfully');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="font-serif">Transaction History</CardTitle>
        </div>
        <CardDescription>
          Track all discount redemptions and transaction details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="space-y-4">
          {/* Date Range Filters and Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label>
                <CalendarIcon className="inline h-4 w-4 mr-1" />
                From Date
              </Label>
              <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => {
                      setDateFrom(date);
                      setFromDateOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>
                <CalendarIcon className="inline h-4 w-4 mr-1" />
                To Date
              </Label>
              <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => {
                      setDateTo(date);
                      setToDateOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    disabled={(date) => dateFrom ? date < dateFrom : false}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">
                <Search className="inline h-4 w-4 mr-1" />
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search by bill number or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchTransactions();
                  }
                }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Member Category Filter with Offer Filter and Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="category">
                <Filter className="inline h-4 w-4 mr-1" />
                Member Category
              </Label>
              <Select 
                value={categoryFilter} 
                onValueChange={setCategoryFilter}
                disabled={loading}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer">
                <Filter className="inline h-4 w-4 mr-1" />
                Offer
              </Label>
              <Select 
                value={offerFilter} 
                onValueChange={setOfferFilter}
                disabled={loading}
              >
                <SelectTrigger id="offer">
                  <SelectValue placeholder="Select offer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offers</SelectItem>
                  {offers.map((offer) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(dateFrom || dateTo) && (
              <Button
                variant="outline"
                className="h-10"
                onClick={() => {
                  setDateFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                  setDateTo(new Date());
                }}
              >
                Clear Filters
              </Button>
            )}

            <Button 
              className="h-10"
              onClick={() => fetchTransactions()}
              disabled={loading}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={loading || allTransactions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={loading || allTransactions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={loading || allTransactions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading transactions...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : displayedTransactions.length > 0 ? (
                displayedTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{transaction.bill_number}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{transaction.member_name}</span>
                        <span className="text-xs text-muted-foreground">{transaction.customer_phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.company_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.category_name}</Badge>
                    </TableCell>
                    <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                    <TableCell>
                      {transaction.type === 'discount' ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {transaction.discount_type === 'percentage' 
                              ? `${transaction.discount_value}%` 
                              : `Rs ${transaction.discount_value}`}
                          </span>
                          {transaction.discount_amount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Saved: Rs {transaction.discount_amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">{transaction.offer_name}</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(transaction.redeemed_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> transactions
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="pageSize" className="text-sm">Rows per page:</Label>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger id="pageSize" className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {currentPage} of {pagination.totalPages}
              </div>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages || loading}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionTracking;