import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye, EyeOff, Gift, CheckCircle2, X, RotateCcw, Pencil, Save, Trash2, Trash, Ban, Building2, User, Check, ChevronsUpDown, Calendar, FileText, QrCode, Download } from "lucide-react";
import { staffApi } from "@/services/staffApi";
import { offerApi } from "@/services/offerApi";
import { companyApi } from "@/services/companyApi";
import { categoryApi } from "@/services/categoryApi";
import { auditApi } from "@/services/auditApi";
import { redemptionApi } from "@/services/redemptionApi";
import { toast } from "sonner";
import { maskPhoneNumber, formatPhoneForDisplay, validateAndNormalizeSriLankanMobile } from "@/utils/phoneUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { logCompanyActivity, logMemberActivity } from "@/utils/auditLogger";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StaffListProps {
  isReload?: boolean;
  selectedCompanyId?: string;
  onEdit?: (staff: any) => void;
  onDelete?: (id: string) => void;
}

export function StaffList({ isReload, selectedCompanyId, onEdit, onDelete }: StaffListProps) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrMember, setQrMember] = useState<any>(null);

  const handleDownloadQR = async (memberCode: string) => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(memberCode)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${memberCode}_qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("QR Code downloaded successfully!");
    } catch (error) {
      console.error("Failed to download QR code", error);
      toast.error("Failed to download QR code. Please try again.");
    }
  };
  const [memberOffers, setMemberOffers] = useState<any[]>([]);
  const [redeemedOffers, setRedeemedOffers] = useState<any[]>([]);
  const [discountRedemptions, setDiscountRedemptions] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [selectedRedemptionId, setSelectedRedemptionId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Form states for View/Edit Dialog (matching Member Registration page)
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyManagerName, setCompanyManagerName] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [openCompanySearch, setOpenCompanySearch] = useState(false);
  const [categoryOffers, setCategoryOffers] = useState<any[]>([]);
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [savingMember, setSavingMember] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showDeactivateAlert, setShowDeactivateAlert] = useState(false);
  const [deactivationNote, setDeactivationNote] = useState("");
  const [deactivatingMember, setDeactivatingMember] = useState(false);
  const [deletingMember, setDeletingMember] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteAlert, setShowBulkDeleteAlert] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        company_id: selectedCompanyId || undefined,
        is_active: showInactive ? undefined : true, // Only show active members by default
      };

      const response = await staffApi.getStaff(params);
      setStaff(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      }));
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to load staff members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    // Clear selections when filter changes
    setSelectedMemberIds(new Set());
  }, [pagination.page, pagination.limit, searchTerm, selectedCompanyId, isReload, showInactive]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset to first page when searching
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePhoneClick = async (memberId: string, phone: string) => {
    if (revealedPhones.has(memberId)) {
      // If already revealed, hide it
      setRevealedPhones(prev => {
        const newSet = new Set(prev);
        newSet.delete(memberId);
        return newSet;
      });
    } else {
      // Reveal and log to database
      try {
        // Get viewer information (in production, this would come from authenticated user)
        const viewerName = "Admin User"; // TODO: Replace with actual authenticated user name
        
        await auditApi.logPhoneView(memberId, viewerName);

        setRevealedPhones(prev => {
          const newSet = new Set(prev);
          newSet.add(memberId);
          return newSet;
        });
        toast.success(`Phone number revealed - View logged for ${viewerName}`);
      } catch (error) {
        console.error("Error logging phone view:", error);
        toast.error("Failed to log phone view");
      }
    }
  };

  const handleViewDetails = async (member: any) => {
    setSelectedMember(member);
    setIsDetailsOpen(true);
    
    // Fetch member's offers and redemptions
    setLoadingOffers(true);
    try {
      // Get selected offers
      const selectedOfferIds = Array.isArray(member.selected_offers) ? member.selected_offers : [];
      if (selectedOfferIds.length > 0) {
        const allOffers = await offerApi.getOffers();
        const offers = allOffers.filter((o: any) => selectedOfferIds.includes(o.id));
        setMemberOffers(offers || []);
      } else {
        setMemberOffers([]);
      }

      // Get ALL offer redemptions (both active and cancelled) to show full history
      const phoneFormats = [
        member.mobile,                    // Original format
        `+${member.mobile}`,              // With + prefix
        member.mobile.replace(/^\+/, ''), // Without + prefix
      ];
      
      console.log('Searching for redemptions with phone formats:', phoneFormats);
      
      const allRedemptions = await offerApi.getRedemptions();
      const redemptions = allRedemptions
        .filter((r: any) => phoneFormats.includes(r.customer_phone))
        .map((r: any) => ({
          ...r,
          offers: {
            id: r.offer_id,
            name: r.offer_name,
            description: r.offer_description || ''
          }
        }));
      
      console.log('Found all redemptions:', redemptions.length, redemptions);
      setRedeemedOffers(redemptions);

      // Get discount redemptions
      const transactions = await redemptionApi.getTransactions({
        searchTerm: member.mobile,
      });
      const discountRedemptions = transactions.filter((t: any) => t.type === 'discount');
      
      console.log('Found discount redemptions:', discountRedemptions.length);
      setDiscountRedemptions(discountRedemptions);
      
    } catch (error) {
      console.error('Error fetching member offers:', error);
      toast.error('Failed to load member offers');
    } finally {
      setLoadingOffers(false);
    }
  };

  const getCategoryBadgeVariant = (categoryName: string): "default" | "secondary" | "destructive" | "outline" => {
    const categoryColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'vip': 'default',
      'premium': 'default',
      'standard': 'secondary',
      'basic': 'outline',
      'corporate': 'secondary',
      'silver': 'outline',
      'gold': 'default',
      'platinum': 'destructive',
    };
    
    const normalized = categoryName?.toLowerCase() || '';
    for (const [key, variant] of Object.entries(categoryColors)) {
      if (normalized.includes(key)) {
        return variant;
      }
    }
    return 'outline';
  };

  const handleReactivateOffer = async (redemptionId: string) => {
    setSelectedRedemptionId(redemptionId);
    setReactivateDialogOpen(true);
  };

  const confirmReactivation = async () => {
    if (!selectedRedemptionId) return;

    setLoadingOffers(true);
    try {
      await offerApi.reactivateOffer(selectedRedemptionId, 'Admin User');
      
      toast.success('Offer reactivated successfully! Customer can use it again.');
      
      // Refresh the data
      if (selectedMember) {
        await handleViewDetails(selectedMember);
      }

      setReactivateDialogOpen(false);
      setSelectedRedemptionId(null);
    } catch (error) {
      console.error('Error reactivating offer:', error);
      toast.error('Failed to reactivate offer');
    } finally {
      setLoadingOffers(false);
    }
  };

  // Load offers when category changes in edit mode
  useEffect(() => {
    const loadEditCategoryOffers = async () => {
      if (isEditMode && editFormData?.category_id) {
        try {
          const offers = await offerApi.getOffersByCategory(editFormData.category_id);
          setCategoryOffers(offers);
          
          // If the category changed from the member's original category, auto-select all offers.
          // Otherwise, preserve the member's current selected offers.
          if (editFormData.category_id !== selectedMember?.category_id) {
            setSelectedOfferIds(offers.map(o => o.id));
          } else {
            setSelectedOfferIds(Array.isArray(selectedMember?.selected_offers) ? selectedMember.selected_offers : []);
          }
        } catch (error) {
          console.error('Error loading edit category offers:', error);
          setCategoryOffers([]);
          setSelectedOfferIds([]);
        }
      }
    };

    loadEditCategoryOffers();
  }, [editFormData?.category_id, isEditMode]);

  const handleEnterEditMode = async () => {
    if (!selectedMember) return;
    
    try {
      // Fetch companies and categories for the dropdowns
      const [companiesData, categoriesData] = await Promise.all([
        companyApi.searchCompanies({}),
        categoryApi.getCategories()
      ]);
      
      setCompanies(companiesData);
      setCategories(categoriesData);
      
      // Find current company details
      const currentCompany = companiesData.find(c => c.id === selectedMember.company_id);
      setSelectedCompany(currentCompany || null);
      setCompanyName(currentCompany?.name || '');
      setCompanyAddress(currentCompany?.address || '');
      setCompanyPhone(currentCompany?.phone || '');
      setCompanyEmail(currentCompany?.email || '');
      setCompanyManagerName(currentCompany?.manager_name || '');

      // Load offers for current category
      if (selectedMember.category_id) {
        const offers = await offerApi.getOffersByCategory(selectedMember.category_id);
        setCategoryOffers(offers);
      } else {
        setCategoryOffers([]);
      }
      setSelectedOfferIds(Array.isArray(selectedMember.selected_offers) ? selectedMember.selected_offers : []);
      
      // Initialize form data with current member data
      setEditFormData({
        title: selectedMember.title || '',
        first_name: selectedMember.first_name || '',
        last_name: selectedMember.last_name || '',
        mobile: selectedMember.mobile || '',
        email: selectedMember.email || '',
        address: selectedMember.address || '',
        designation: selectedMember.designation || '',
        company_id: selectedMember.company_id || '',
        category_id: selectedMember.category_id || '',
        discount_enabled: selectedMember.discount_enabled ?? true,
        discount_policy: selectedMember.discount_policy || 'percentage',
        discount_amount: selectedMember.discount_amount || 0,
        is_active: selectedMember.is_active ?? true,
        date_of_birth: selectedMember.date_of_birth ? selectedMember.date_of_birth.split('T')[0] : '',
        registered_date: selectedMember.registered_date ? selectedMember.registered_date.split('T')[0] : '',
        renew_date: selectedMember.renew_date ? selectedMember.renew_date.split('T')[0] : '',
      });
      
      setIsEditMode(true);
    } catch (error) {
      console.error('Error entering edit mode:', error);
      toast.error('Failed to load editing form');
    }
  };

  const handleSaveMember = async () => {
    if (!selectedMember || !editFormData) return;
    
    // Validate member fields
    if (!editFormData.title || !editFormData.first_name || !editFormData.last_name || 
        !editFormData.mobile || !editFormData.email) {
      toast.error('Please fill all required member fields');
      return;
    }

    // Validate and normalize mobile number
    const mobileValidation = validateAndNormalizeSriLankanMobile(editFormData.mobile);
    if (!mobileValidation.isValid) {
      toast.error(mobileValidation.error || "Invalid mobile number");
      return;
    }

    // Validate and normalize company phone if provided
    let normalizedCompanyPhone = companyPhone;
    if (companyPhone) {
      const companyPhoneValidation = validateAndNormalizeSriLankanMobile(companyPhone);
      if (!companyPhoneValidation.isValid) {
        toast.error("Invalid company phone number: " + companyPhoneValidation.error);
        return;
      }
      normalizedCompanyPhone = companyPhoneValidation.normalized!;
    }
    
    setSavingMember(true);
    try {
      // Step 1: Save or update company if name is provided
      let companyId = editFormData.company_id || null;
      
      if (companyName.trim()) {
        if (!selectedCompany?.id) {
          // Create new company
          const companyCode = `COMP${Date.now()}`;
          const newCompany = await companyApi.createCompany({
            company_code: companyCode,
            name: companyName,
            address: companyAddress || '',
            phone: normalizedCompanyPhone || '',
            email: companyEmail || '',
            manager_name: companyManagerName || '',
          });
          companyId = newCompany.id;
          
          await logCompanyActivity('create', companyName, companyId, {
            company_code: companyCode,
            manager: companyManagerName
          });
        } else {
          // Update existing company
          companyId = selectedCompany.id;
          await companyApi.updateCompany(companyId, {
            company_code: selectedCompany.company_code,
            name: companyName,
            address: companyAddress || undefined,
            phone: normalizedCompanyPhone || undefined,
            email: companyEmail || undefined,
            manager_name: companyManagerName || undefined,
          });
          
          await logCompanyActivity('update', companyName, companyId, {
            company_code: selectedCompany.company_code,
            manager: companyManagerName
          });
        }
      } else {
        // If company name is empty, disassociate company
        companyId = null;
      }

      // Step 2: Save member details
      const memberUpdateData = {
        title: editFormData.title,
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        mobile: mobileValidation.normalized!,
        email: editFormData.email,
        address: editFormData.address,
        designation: editFormData.designation,
        company_id: companyId || undefined,
        category_id: editFormData.category_id,
        discount_enabled: editFormData.discount_enabled,
        discount_policy: editFormData.discount_policy,
        discount_amount: Number(editFormData.discount_amount) || 0,
        is_active: editFormData.is_active,
        date_of_birth: editFormData.date_of_birth || null,
        registered_date: editFormData.registered_date || null,
        renew_date: editFormData.renew_date || null,
        selected_offers: selectedOfferIds,
      };

      await staffApi.updateStaff(selectedMember.id, memberUpdateData);
      
      toast.success('Member updated successfully');
      
      // Log member update activity
      await logMemberActivity(
        'update',
        `${editFormData.first_name} ${editFormData.last_name}`,
        selectedMember.id,
        {
          company: companyName || 'None',
          category: categories.find(c => c.id === editFormData.category_id)?.name,
          discount_policy: editFormData.discount_policy
        },
        {
          member_code: selectedMember.member_code,
          phone: mobileValidation.normalized!,
          name: `${editFormData.first_name} ${editFormData.last_name}`
        }
      );
      
      // Refresh the list and dialog
      fetchStaff();
      
      // Re-fetch updated member to make sure join tables are correctly populated
      const updatedMemberResponse = await staffApi.getStaff({
        page: 1,
        limit: 1,
        search: mobileValidation.normalized!
      });
      
      if (updatedMemberResponse.data.length > 0) {
        const updatedMember = updatedMemberResponse.data[0];
        setSelectedMember(updatedMember);
        await handleViewDetails(updatedMember);
      }
      
      setIsEditMode(false);
      setEditFormData(null);
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update member');
    } finally {
      setSavingMember(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData(null);
    setCompanyName("");
    setCompanyAddress("");
    setCompanyPhone("");
    setCompanyEmail("");
    setCompanyManagerName("");
    setSelectedCompany(null);
    setCategoryOffers([]);
    setSelectedOfferIds([]);
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    setDeletingMember(true);
    try {
      await staffApi.deleteStaff(selectedMember.id!);
      
      // Log the deletion activity
      await logMemberActivity(
        'update',
        `${selectedMember.first_name} ${selectedMember.last_name}`,
        selectedMember.id,
        {
          company: selectedMember.company_name,
          category: selectedMember.category_name,
          phone: selectedMember.mobile,
          action: 'deleted'
        },
        {
          member_code: selectedMember.member_code,
          phone: selectedMember.mobile,
          name: `${selectedMember.first_name} ${selectedMember.last_name}`
        },
        'Member Management - Delete',
        [{
          field: 'is_deleted',
          before: false,
          after: true
        }]
      );

      toast.success("Member deleted successfully");

      setIsDetailsOpen(false);
      setSelectedMember(null);
      setShowDeleteAlert(false);
      fetchStaff();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error("Failed to delete member");
    } finally {
      setDeletingMember(false);
    }
  };

  const handleDeactivateMember = async () => {
    if (!selectedMember) return;
    if (!deactivationNote.trim()) {
      toast.error("Deactivation note is mandatory");
      return;
    }

    setDeactivatingMember(true);
    try {
      await staffApi.updateStaff(selectedMember.id!, { is_active: false, deactivation_note: deactivationNote });
      
      // Log the deactivation activity
      await logMemberActivity(
        'update',
        `${selectedMember.first_name} ${selectedMember.last_name}`,
        selectedMember.id,
        {
          company: selectedMember.company_name,
          category: selectedMember.category_name,
          phone: selectedMember.mobile,
          action: 'deactivated',
          note: deactivationNote
        },
        {
          member_code: selectedMember.member_code,
          phone: selectedMember.mobile,
          name: `${selectedMember.first_name} ${selectedMember.last_name}`
        },
        'Member Management - Deactivate',
        [{
          field: 'is_active',
          before: true,
          after: false
        }]
      );

      toast.success("Member deactivated successfully");

      setIsDetailsOpen(false);
      setSelectedMember(null);
      setShowDeactivateAlert(false);
      setDeactivationNote("");
      fetchStaff();
    } catch (error) {
      console.error('Error deactivating member:', error);
      toast.error("Failed to deactivate member");
    } finally {
      setDeactivatingMember(false);
    }
  };

  const handleToggleSelectMember = (memberId: string) => {
    const member = staff.find(m => m.id === memberId);
    // Only allow selecting active members
    if (!member?.is_active) {
      toast.error("Cannot select inactive members for deactivation");
      return;
    }

    setSelectedMemberIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const handleToggleSelectAll = () => {
    // Only select active members
    const activeMembers = staff.filter(m => m.is_active);
    
    if (selectedMemberIds.size === activeMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(activeMembers.map(m => m.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMemberIds.size === 0) return;

    setDeletingBulk(true);
    try {
      const membersToDelete = staff.filter(m => selectedMemberIds.has(m.id));
      
      // Soft delete all selected members
      await Promise.all(
        Array.from(selectedMemberIds).map(id => staffApi.deleteStaff(id))
      );

      // Log deletion activity for each member
      await Promise.all(
        membersToDelete.map(member =>
          logMemberActivity(
            'update',
            `${member.first_name} ${member.last_name}`,
            member.id,
            {
              company: member.company_name,
              category: member.category_name,
              phone: member.mobile,
              bulk_delete: true,
              action: 'deactivated'
            },
            {
              member_code: member.member_code,
              phone: member.mobile,
              name: `${member.first_name} ${member.last_name}`
            },
            'Member Management - Bulk Deactivate',
            [{
              field: 'is_active',
              before: true,
              after: false
            }]
          )
        )
      );

      toast.success(`Successfully deactivated ${selectedMemberIds.size} member(s)`);
      
      setSelectedMemberIds(new Set());
      setShowBulkDeleteAlert(false);
      fetchStaff();
    } catch (error) {
      console.error('Error bulk deactivating members:', error);
      toast.error("Failed to deactivate some members");
    } finally {
      setDeletingBulk(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end">
        <form onSubmit={handleSearch} className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search members by name, email, or phone..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          {selectedMemberIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteAlert(true)}
              className="gap-2"
            >
              <Trash className="h-4 w-4" />
              Deactivate {selectedMemberIds.size} member{selectedMemberIds.size !== 1 ? 's' : ''}
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={(checked) => setShowInactive(checked as boolean)}
            />
            <label
              htmlFor="show-inactive"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show inactive
            </label>
          </div>
          <span className="text-sm text-muted-foreground">Show</span>
          <Select
            value={pagination.limit.toString()}
            onValueChange={(value) => setPagination(prev => ({ ...prev, limit: Number(value), page: 1 }))}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No members found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      staff.filter(m => m.is_active).length > 0 && 
                      selectedMemberIds.size === staff.filter(m => m.is_active).length
                    }
                    onCheckedChange={handleToggleSelectAll}
                    aria-label="Select all active members"
                  />
                </TableHead>
                <TableHead>Member Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedMemberIds.has(member.id)}
                      onCheckedChange={() => handleToggleSelectMember(member.id)}
                      disabled={!member.is_active}
                      aria-label={`Select ${member.first_name} ${member.last_name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-semibold">{member.member_code || 'N/A'}</TableCell>
                  <TableCell>{`${member.title || ''} ${member.first_name} ${member.last_name}`}</TableCell>
                  <TableCell>{member.company_name || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={getCategoryBadgeVariant(member.category_name)}>
                      {member.category_name || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handlePhoneClick(member.id, member.mobile)}
                      className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer font-mono"
                      title="Click to reveal/hide phone number"
                    >
                      {revealedPhones.has(member.id) ? (
                        <>
                          <Eye className="h-4 w-4" />
                          {formatPhoneForDisplay(member.mobile)}
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4" />
                          {maskPhoneNumber(member.mobile)}
                        </>
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.is_active ? "default" : "secondary"}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(member)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {member.member_code && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setQrMember(member);
                            setQrDialogOpen(true);
                          }}
                          className="text-primary hover:text-primary-foreground hover:bg-primary"
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          QR
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {staff.length} of {pagination.total} members
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Member Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 shrink-0">
            <div className="flex items-start justify-between">
              <DialogHeader>
                <DialogTitle>Member Details</DialogTitle>
                <DialogDescription>
                  Complete information for {selectedMember?.first_name} {selectedMember?.last_name}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2 shrink-0">
                {!isEditMode && selectedMember && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleEnterEditMode}
                      className="h-8 w-8"
                      title="Edit Member"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {selectedMember.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeactivateAlert(true)}
                        className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                        title="Deactivate Member"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteAlert(true)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete Member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {isEditMode && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveMember}
                      disabled={savingMember}
                      className="h-8"
                    >
                      {savingMember ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={savingMember}
                      className="h-8"
                    >
                      Cancel
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    setIsEditMode(false);
                    setEditFormData(null);
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1 overflow-auto">
            {selectedMember && !isEditMode && (
              <div className="space-y-6 px-6 py-4 pb-6">
                {/* Basic Information / Header status */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member Code</p>
                    <p className="text-lg font-mono font-bold text-foreground">{selectedMember.member_code || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right md:text-left">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
                      <Badge variant={selectedMember.is_active ? "default" : "secondary"} className="mt-1">
                        {selectedMember.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  {!selectedMember.is_active && selectedMember.deactivation_note && (
                    <div className="md:col-span-2 w-full bg-orange-500/10 border border-orange-500/20 dark:bg-orange-950/20 dark:border-orange-900 rounded-md p-3">
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Deactivation Note:</p>
                      <p className="text-sm text-foreground mt-0.5">{selectedMember.deactivation_note}</p>
                    </div>
                  )}
                </div>

                {/* Section 1: Personal Information */}
                <Card className="border border-border/60 shadow-sm bg-card/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Title</p>
                      <p className="text-sm font-semibold mt-1">{selectedMember.title || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">First Name</p>
                      <p className="text-sm font-semibold mt-1">{selectedMember.first_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Last Name</p>
                      <p className="text-sm font-semibold mt-1">{selectedMember.last_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
                      <p className="text-sm font-semibold mt-1">
                        {selectedMember.date_of_birth 
                          ? new Date(selectedMember.date_of_birth).toLocaleDateString() 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Email</p>
                      <p className="text-sm font-semibold mt-1 break-all">{selectedMember.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Mobile</p>
                      <button
                        onClick={() => selectedMember && handlePhoneClick(selectedMember.id, selectedMember.mobile)}
                        className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer font-mono text-sm font-semibold mt-1"
                        title="Click to reveal/hide phone number"
                      >
                        {revealedPhones.has(selectedMember.id) ? (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            {formatPhoneForDisplay(selectedMember.mobile)}
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            {maskPhoneNumber(selectedMember.mobile)}
                          </>
                        )}
                      </button>
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <p className="text-xs font-medium text-muted-foreground">Address</p>
                      <p className="text-sm font-semibold mt-1">{selectedMember.address || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 2: Company Information */}
                <Card className="border border-border/60 shadow-sm bg-card/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base font-semibold">Company Information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Company Name</p>
                      <p className="text-sm font-semibold mt-1">{selectedMember.company_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Designation</p>
                      <p className="text-sm font-semibold mt-1">{selectedMember.designation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Company Phone Number</p>
                      <p className="text-sm font-semibold mt-1 font-mono">{selectedMember.company_phone || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">Company Address</p>
                      <p className="text-sm font-semibold mt-1">{selectedMember.company_address || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Company Email</p>
                      <p className="text-sm font-semibold mt-1 break-all">{selectedMember.company_email || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 3: Membership & Other Information */}
                <Card className="border border-border/60 shadow-sm bg-card/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base font-semibold">Membership & Other Information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Member Category</p>
                      <Badge variant={getCategoryBadgeVariant(selectedMember.category_name)} className="mt-1">
                        {selectedMember.category_name || 'N/A'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Registration Date</p>
                      <p className="text-sm font-semibold mt-1">
                        {selectedMember.registered_date 
                          ? new Date(selectedMember.registered_date).toLocaleDateString() 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Renewal Date</p>
                      <p className="text-sm font-semibold mt-1">
                        {selectedMember.renew_date 
                          ? new Date(selectedMember.renew_date).toLocaleDateString() 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Manager Name</p>
                      <p className="text-sm font-semibold mt-1">{selectedMember.company_manager_name || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 4: Membership Benefits & Offers */}
                <Card className="border border-border/60 shadow-sm bg-card/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base font-semibold">Discount Redemptions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Discount redemptions history */}
                    <div className="space-y-3">
                      {/* <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Discount Redemptions ({discountRedemptions.length})
                      </h5> */}
                      
                      {loadingOffers ? (
                        <div className="flex items-center justify-center p-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : discountRedemptions.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {discountRedemptions.map((redemption: any) => (
                            <div key={redemption.id} className="p-3 border border-blue-200 dark:border-blue-900/30 rounded-lg bg-blue-500/5 dark:bg-blue-950/10 flex items-start justify-between gap-3">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                                  {redemption.discount_type === 'percentage' 
                                    ? `${redemption.discount_value}% Discount` 
                                    : `LKR ${redemption.discount_value?.toLocaleString()} Discount`}
                                </p>
                                {redemption.discount_amount && (
                                  <p className="text-xs font-bold text-green-600 dark:text-green-400">
                                    Saved: LKR {redemption.discount_amount?.toLocaleString()}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
                                  <span>Redeemed: {new Date(redemption.redeemed_at).toLocaleDateString()}</span>
                                  {redemption.bill_number && <span className="font-mono">Bill: {redemption.bill_number}</span>}
                                </div>
                              </div>
                              <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-[10px] shrink-0">Used</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic p-3 border rounded-lg bg-muted/10">No discount redemptions yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Edit Form */}
            {isEditMode && editFormData && (
              <div className="space-y-6 px-6 py-4 pb-6">
                <div className="space-y-6">
                  {/* Section 1: Personal Information */}
                  <Card className="border border-border/60 shadow-sm bg-card/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Select
                          value={editFormData.title}
                          onValueChange={(value) => setEditFormData({ ...editFormData, title: value })}
                        >
                          <SelectTrigger id="title">
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mr">Mr.</SelectItem>
                            <SelectItem value="Mrs">Mrs.</SelectItem>
                            <SelectItem value="Ms">Ms.</SelectItem>
                            <SelectItem value="Miss">Miss</SelectItem>
                            <SelectItem value="Dr">Dr.</SelectItem>
                            <SelectItem value="Prof">Prof.</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input
                          id="first_name"
                          value={editFormData.first_name || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                          placeholder="First name"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name *</Label>
                        <Input
                          id="last_name"
                          value={editFormData.last_name || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                          placeholder="Last name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={editFormData.date_of_birth || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editFormData.email || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                          placeholder="email@example.com"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile *</Label>
                        <Input
                          id="mobile"
                          value={editFormData.mobile || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                          placeholder="+94 77 123 4567"
                          required
                        />
                      </div>

                      <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={editFormData.address || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                          placeholder="Member address"
                        />
                      </div>

                      <div className="flex items-center gap-2.5 pt-6 pl-1">
                        <Switch
                          id="is_active"
                          checked={editFormData.is_active}
                          onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_active: checked })}
                        />
                        <div className="space-y-0.5">
                          <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                            Active Status
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {editFormData.is_active ? 'Member is active and can redeem offers' : 'Member is inactive'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 2: Company Information */}
                  <Card className="border border-border/60 shadow-sm bg-card/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base font-semibold">Company Information</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <div className="relative">
                          <Input
                            id="companyName"
                            value={companyName}
                            onChange={(e) => {
                              setCompanyName(e.target.value);
                              setSelectedCompany(null);
                              setEditFormData(prev => ({ ...prev, company_id: '' }));
                            }}
                            onFocus={() => setOpenCompanySearch(true)}
                            onBlur={() => setTimeout(() => setOpenCompanySearch(false), 200)}
                            placeholder="Search or enter company name..."
                            className="pr-10"
                          />
                          <ChevronsUpDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
                          {openCompanySearch && companyName && (
                            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto p-1">
                              {companies.filter(c => c.name.toLowerCase().includes(companyName.toLowerCase())).length > 0 ? (
                                companies
                                  .filter(c => c.name.toLowerCase().includes(companyName.toLowerCase()))
                                  .map((company) => (
                                    <div
                                      key={company.id}
                                      className="flex items-start gap-2 p-2 hover:bg-accent cursor-pointer rounded-sm"
                                      onClick={() => {
                                        setSelectedCompany(company);
                                        setCompanyName(company.name);
                                        setCompanyAddress(company.address || '');
                                        setCompanyPhone(company.phone || '');
                                        setCompanyEmail(company.email || '');
                                        setCompanyManagerName(company.manager_name || '');
                                        setEditFormData(prev => ({ ...prev, company_id: company.id }));
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "h-4 w-4 mt-0.5 pointer-events-none",
                                          selectedCompany?.id === company.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{company.name}</p>
                                        <p className="text-xs text-muted-foreground">{company.address}</p>
                                      </div>
                                    </div>
                                  ))
                              ) : (
                                <div className="p-2 text-sm text-muted-foreground">
                                  No matching companies. Continue typing to add new company.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="designation">Designation</Label>
                        <Input
                          id="designation"
                          value={editFormData.designation || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                          placeholder="e.g. Sales Manager"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companyPhone">Company Phone Number</Label>
                        <Input
                          id="companyPhone"
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          placeholder="Enter company phone number"
                        />
                      </div>

                      <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor="companyAddress">Company Address</Label>
                        <Input
                          id="companyAddress"
                          value={companyAddress}
                          onChange={(e) => setCompanyAddress(e.target.value)}
                          placeholder="Enter company address"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companyEmail">Company Email</Label>
                        <Input
                          id="companyEmail"
                          type="email"
                          value={companyEmail}
                          onChange={(e) => setCompanyEmail(e.target.value)}
                          placeholder="Enter company email"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 3: Membership & Other Information */}
                  <Card className="border border-border/60 shadow-sm bg-card/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base font-semibold">Membership & Other Information</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category_id">Member Category *</Label>
                        <Select
                          value={editFormData.category_id?.toString() || ''}
                          onValueChange={(value) => {
                            setEditFormData({ ...editFormData, category_id: value ? Number(value) : undefined });
                          }}
                        >
                          <SelectTrigger id="category_id">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="registered_date">Registration Date *</Label>
                        <Input
                          id="registered_date"
                          type="date"
                          value={editFormData.registered_date || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, registered_date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="renew_date">Renewal Date *</Label>
                        <Input
                          id="renew_date"
                          type="date"
                          value={editFormData.renew_date || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, renew_date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="managerName">Manager Name</Label>
                        <Input
                          id="managerName"
                          value={companyManagerName}
                          onChange={(e) => setCompanyManagerName(e.target.value)}
                          placeholder="Enter manager name"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 4: Membership Benefits & Offers */}
                  <Card className="border border-border/60 shadow-sm bg-card/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base font-semibold">Discount Redemptions</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Discount redemptions history */}
                      <div className="space-y-3">
                        {/* <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Discount Redemptions ({discountRedemptions.length})
                        </h5> */}
                        
                        {loadingOffers ? (
                          <div className="flex items-center justify-center p-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : discountRedemptions.length > 0 ? (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {discountRedemptions.map((redemption: any) => (
                              <div key={redemption.id} className="p-3 border border-blue-200 dark:border-blue-900/30 rounded-lg bg-blue-500/5 dark:bg-blue-950/10 flex items-start justify-between gap-3">
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                                    {redemption.discount_type === 'percentage' 
                                      ? `${redemption.discount_value}% Discount` 
                                      : `LKR ${redemption.discount_value?.toLocaleString()} Discount`}
                                  </p>
                                  {redemption.discount_amount && (
                                    <p className="text-xs font-bold text-green-600 dark:text-green-400">
                                      Saved: LKR {redemption.discount_amount?.toLocaleString()}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
                                    <span>Redeemed: {new Date(redemption.redeemed_at).toLocaleDateString()}</span>
                                    {redemption.bill_number && <span className="font-mono">Bill: {redemption.bill_number}</span>}
                                  </div>
                                </div>
                                <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-[10px] shrink-0">Used</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic p-3 border rounded-lg bg-muted/10">No discount redemptions yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedMember?.first_name} {selectedMember?.last_name}</span>? 
              This will mark the member as deleted. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingMember}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              disabled={deletingMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingMember ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Member'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateAlert} onOpenChange={(open) => {
        setShowDeactivateAlert(open);
        if (!open) setDeactivationNote("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Member</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>
                Are you sure you want to deactivate <span className="font-semibold">{selectedMember?.first_name} {selectedMember?.last_name}</span>?
              </span>
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="deactivation-reason" className="text-foreground">Deactivation Note *</Label>
                <Input
                  id="deactivation-reason"
                  placeholder="Enter reason for deactivation (mandatory)..."
                  value={deactivationNote}
                  onChange={(e) => setDeactivationNote(e.target.value)}
                  className="w-full text-foreground"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivatingMember} onClick={() => setDeactivationNote("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateMember}
              disabled={deactivatingMember || !deactivationNote.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {deactivatingMember ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteAlert} onOpenChange={setShowBulkDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Multiple Members</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <span className="font-semibold">{selectedMemberIds.size} member{selectedMemberIds.size !== 1 ? 's' : ''}</span>? 
              These members will be marked as inactive but their data will be preserved. You can reactivate them later by editing their profiles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBulk}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deletingBulk}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBulk ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deactivating...
                </>
              ) : (
                `Deactivate ${selectedMemberIds.size} Member${selectedMemberIds.size !== 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivation Confirmation Dialog */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Offer Reactivation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate this offer? The member will be able to redeem this offer again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReactivation}>
              Confirm Reactivation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md flex flex-col items-center p-6 gap-4">
          <DialogHeader className="w-full text-center">
            <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Member QR Code
            </DialogTitle>
            <DialogDescription className="text-sm text-center">
              QR Code for {qrMember?.first_name} {qrMember?.last_name}
            </DialogDescription>
          </DialogHeader>

          {qrMember && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="bg-white p-4 rounded-xl border-2 border-border shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrMember.member_code)}`}
                  alt={`QR code for ${qrMember.member_code}`}
                  className="w-[200px] h-[200px]"
                />
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Member Code</p>
                <p className="text-lg font-mono font-bold text-primary">{qrMember.member_code}</p>
              </div>

              <Button
                onClick={() => handleDownloadQR(qrMember.member_code)}
                className="w-full mt-2 gap-2"
              >
                <Download className="h-4 w-4" />
                Download QR Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
