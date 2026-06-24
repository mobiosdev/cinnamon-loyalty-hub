import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye, EyeOff, Gift, CheckCircle2, X, RotateCcw, Pencil, Save, Trash2, Trash, Ban } from "lucide-react";
import { staffApi } from "@/services/staffApi";
import { offerApi } from "@/services/offerApi";
import { companyApi } from "@/services/companyApi";
import { categoryApi } from "@/services/categoryApi";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { maskPhoneNumber, formatPhoneForDisplay } from "@/utils/phoneUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { logMemberActivity } from "@/utils/auditLogger";
import { Checkbox } from "@/components/ui/checkbox";

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
        const viewerTimestamp = new Date().toLocaleString();
        
        const { error } = await supabase
          .from('phone_number_views')
          .insert({
            member_id: memberId,
            viewer_info: viewerName,
            viewed_at: new Date().toISOString()
          });

        if (error) {
          console.error("Error logging phone view:", error);
          toast.error("Failed to log phone view");
          return;
        }

        setRevealedPhones(prev => new Set(prev).add(memberId));
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
        const { data: offers, error: offersError } = await supabase
          .from('offers')
          .select('id, name, description, valid_from, valid_to')
          .in('id', selectedOfferIds);
        
        if (offersError) throw offersError;
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
      
      const { data: redemptions, error: redemptionsError } = await supabase
        .from('offer_redemptions')
        .select(`
          id,
          redeemed_at,
          bill_number,
          customer_phone,
          status,
          reactivated_at,
          reactivated_by,
          offers (
            id,
            name,
            description
          )
        `)
        .in('customer_phone', phoneFormats)
        .order('redeemed_at', { ascending: false });
      
      if (redemptionsError) throw redemptionsError;
      
      console.log('Found all redemptions:', redemptions?.length || 0, redemptions);
      console.log('Selected offers:', memberOffers);
      
      setRedeemedOffers(redemptions || []);

      // Get discount redemptions
      const { data: discountRedemptions, error: discountError } = await supabase
        .from('discount_redemptions')
        .select('*')
        .in('customer_phone', phoneFormats)
        .order('redeemed_at', { ascending: false });
      
      if (discountError) throw discountError;
      
      console.log('Found discount redemptions:', discountRedemptions?.length || 0);
      
      setDiscountRedemptions(discountRedemptions || []);
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
        date_of_birth: selectedMember.date_of_birth || '',
      });
      
      setIsEditMode(true);
    } catch (error) {
      console.error('Error entering edit mode:', error);
      toast.error('Failed to load editing form');
    }
  };

  const handleSaveMember = async () => {
    if (!selectedMember || !editFormData) return;
    
    setSavingMember(true);
    try {
      await staffApi.updateStaff(selectedMember.id, editFormData);
      
      toast.success('Member updated successfully');
      
      // Refresh the member data
      const updatedMemberResponse = await staffApi.getStaff({
        page: 1,
        limit: 1,
        search: selectedMember.mobile
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
      toast.error('Failed to update member');
    } finally {
      setSavingMember(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData(null);
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
      await staffApi.deactivateStaff(selectedMember.id!, deactivationNote);
      
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(member)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
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
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Member Code</p>
                  <p className="text-base font-mono font-semibold">{selectedMember.member_code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={selectedMember.is_active ? "default" : "secondary"}>
                    {selectedMember.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {!selectedMember.is_active && selectedMember.deactivation_note && (
                  <div className="col-span-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-md p-3">
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Deactivation Note:</p>
                    <p className="text-sm text-foreground mt-0.5">{selectedMember.deactivation_note}</p>
                  </div>
                )}
              </div>

              {/* Personal Details */}
              <div>
                <h4 className="font-semibold mb-3 pb-2 border-b">Personal Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="text-base">{selectedMember.title} {selectedMember.first_name} {selectedMember.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Designation</p>
                    <p className="text-base">{selectedMember.designation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p className="text-base">
                      {selectedMember.date_of_birth 
                        ? new Date(selectedMember.date_of_birth).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                    <button
                      onClick={() => selectedMember && handlePhoneClick(selectedMember.id, selectedMember.mobile)}
                      className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer font-mono text-base"
                      title="Click to reveal/hide phone number"
                    >
                      {revealedPhones.has(selectedMember.id) ? (
                        <>
                          <Eye className="h-4 w-4" />
                          {formatPhoneForDisplay(selectedMember.mobile)}
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4" />
                          {maskPhoneNumber(selectedMember.mobile)}
                        </>
                      )}
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-base">{selectedMember.email || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="text-base">{selectedMember.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div>
                <h4 className="font-semibold mb-3 pb-2 border-b">Company Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                    <p className="text-base">{selectedMember.company_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Member Category</p>
                    <Badge variant={getCategoryBadgeVariant(selectedMember.category_name)} className="mt-1">
                      {selectedMember.category_name || 'N/A'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Membership Details */}
              <div>
                <h4 className="font-semibold mb-3 pb-2 border-b">Membership Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Registered Date</p>
                    <p className="text-base">{selectedMember.registered_date ? new Date(selectedMember.registered_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Renewal Date</p>
                    <p className="text-base">{selectedMember.renew_date ? new Date(selectedMember.renew_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Discount Information */}
              <div>
                <h4 className="font-semibold mb-3 pb-2 border-b">Discount Benefits</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Discount Enabled</p>
                    <Badge variant={selectedMember.discount_enabled ? "default" : "secondary"}>
                      {selectedMember.discount_enabled ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Discount Policy</p>
                    <p className="text-base capitalize">{selectedMember.discount_policy || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Discount Amount</p>
                    <p className="text-base font-semibold">
                      {selectedMember.discount_policy === 'percentage' 
                        ? `${selectedMember.discount_amount}%`
                        : `LKR ${selectedMember.discount_amount}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Offers */}
              <div>
                <h4 className="font-semibold mb-3 pb-2 border-b flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Selected Offers ({memberOffers.length})
                </h4>
                {loadingOffers ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : memberOffers.length > 0 ? (
                  <div className="space-y-3">
                    {memberOffers.map((offer: any) => {
                      // Get all redemptions for this offer
                      const offerRedemptions = redeemedOffers.filter(
                        (r: any) => r.offers?.id === offer.id
                      );
                      // Check if there's an active redemption
                      const activeRedemption = offerRedemptions.find((r: any) => r.status === 'active');
                      const isCurrentlyRedeemed = !!activeRedemption;
                      const hasHistory = offerRedemptions.length > 0;
                      
                      return (
                        <div 
                          key={offer.id} 
                          className={`p-3 rounded-lg border-2 ${
                            isCurrentlyRedeemed 
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' 
                              : 'bg-muted/30 border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className={`font-medium ${isCurrentlyRedeemed ? 'text-green-700 dark:text-green-400' : ''}`}>
                                  {offer.name}
                                </p>
                                {isCurrentlyRedeemed && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Valid: {new Date(offer.valid_from).toLocaleDateString()} - {new Date(offer.valid_to).toLocaleDateString()}
                              </p>
                              
                              {/* Show redemption history */}
                              {hasHistory && (
                                <div className="mt-3 pt-3 border-t space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground">Redemption History:</p>
                                   {offerRedemptions.map((redemption: any) => (
                                    <div 
                                      key={redemption.id} 
                                      className={`text-xs p-2 rounded ${
                                        redemption.status === 'active' 
                                          ? 'bg-green-100 dark:bg-green-950/40' 
                                          : 'bg-muted/50'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <p className="font-medium">
                                            Redeemed: {format(new Date(redemption.redeemed_at), 'MMM dd, yyyy')} at {format(new Date(redemption.redeemed_at), 'HH:mm')}
                                          </p>
                                          {redemption.bill_number && (
                                            <p className="font-mono text-muted-foreground">Bill: {redemption.bill_number}</p>
                                          )}
                                          {redemption.status === 'cancelled' && redemption.reactivated_at && (
                                            <div className="mt-1 pt-1 border-t">
                                              <p className="font-medium text-orange-600 dark:text-orange-400">
                                                Reactivated: {format(new Date(redemption.reactivated_at), 'MMM dd, yyyy')} at {format(new Date(redemption.reactivated_at), 'HH:mm')}
                                              </p>
                                              {redemption.reactivated_by && (
                                                <p className="text-muted-foreground">By: {redemption.reactivated_by}</p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge 
                                            variant={redemption.status === 'active' ? 'default' : 'outline'}
                                            className="text-xs"
                                          >
                                            {redemption.status === 'active' ? 'Active' : 'Reactivated'}
                                          </Badge>
                                          {redemption.status === 'active' && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => handleReactivateOffer(redemption.id)}
                                              disabled={loadingOffers}
                                              className="h-6 px-2"
                                              title="Reactivation"
                                            >
                                              Reactivation
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {isCurrentlyRedeemed ? (
                                <Badge className="shrink-0 bg-green-600 hover:bg-green-700 text-white">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Redeemed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="shrink-0">
                                  <Gift className="h-3 w-3 mr-1" />
                                  Available
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/20">
                    No offers selected
                  </p>
                )}
              </div>

              {/* Discount Redemptions */}
              <div>
                <h4 className="font-semibold mb-3 pb-2 border-b flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Discount Redemptions ({discountRedemptions.length})
                </h4>
                {loadingOffers ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : discountRedemptions.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {discountRedemptions.map((redemption: any) => (
                      <div key={redemption.id} className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-blue-700 dark:text-blue-400">
                                {redemption.discount_type === 'percentage' 
                                  ? `${redemption.discount_value}% Discount` 
                                  : `LKR ${redemption.discount_value} Discount`}
                              </p>
                            </div>
                            {redemption.discount_amount && (
                              <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                                Saved: LKR {redemption.discount_amount}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>Redeemed: {new Date(redemption.redeemed_at).toLocaleDateString()}</span>
                              {redemption.bill_number && (
                                <span className="font-mono">Bill: {redemption.bill_number}</span>
                              )}
                            </div>
                          </div>
                          <Badge className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Used
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/20">
                    No discount redemptions yet
                  </p>
                )}
              </div>
            </div>
            )}

            {/* Edit Form */}
            {isEditMode && editFormData && (
              <div className="space-y-6 px-6 py-4 pb-6">
                <div>
                  <h4 className="font-semibold mb-4 pb-2 border-b">Edit Member Information</h4>
                  
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Select
                          value={editFormData.title}
                          onValueChange={(value) => setEditFormData({ ...editFormData, title: value })}
                        >
                          <SelectTrigger id="title">
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mr">Mr</SelectItem>
                            <SelectItem value="Mrs">Mrs</SelectItem>
                            <SelectItem value="Miss">Miss</SelectItem>
                            <SelectItem value="Dr">Dr</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="is_active">Status</Label>
                        <Switch
                          id="is_active"
                          checked={editFormData.is_active}
                          onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_active: checked })}
                        />
                        <span className="text-sm text-muted-foreground">
                          {editFormData.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input
                          id="first_name"
                          value={editFormData.first_name}
                          onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Last Name *</Label>
                        <Input
                          id="last_name"
                          value={editFormData.last_name}
                          onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="mobile">Mobile *</Label>
                        <Input
                          id="mobile"
                          value={editFormData.mobile}
                          onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editFormData.email}
                          onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="designation">Designation</Label>
                        <Input
                          id="designation"
                          value={editFormData.designation}
                          onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={editFormData.date_of_birth || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={editFormData.address}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company_id">Company</Label>
                        <Select
                          value={editFormData.company_id}
                          onValueChange={(value) => setEditFormData({ ...editFormData, company_id: value })}
                        >
                          <SelectTrigger id="company_id">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="category_id">Category</Label>
                        <Select
                          value={editFormData.category_id?.toString()}
                          onValueChange={(value) => setEditFormData({ ...editFormData, category_id: Number(value) })}
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
                    </div>
                  </div>
                </div>

                {/* Discount Benefits */}
                <div>
                  <h4 className="font-semibold mb-4 pb-2 border-b">Discount Benefits</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="discount_enabled">Discount Enabled</Label>
                      <Switch
                        id="discount_enabled"
                        checked={editFormData.discount_enabled}
                        onCheckedChange={(checked) => setEditFormData({ ...editFormData, discount_enabled: checked })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {editFormData.discount_enabled ? 'Yes' : 'No'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="discount_policy">Discount Policy</Label>
                        <Select
                          value={editFormData.discount_policy}
                          onValueChange={(value) => setEditFormData({ ...editFormData, discount_policy: value })}
                        >
                          <SelectTrigger id="discount_policy">
                            <SelectValue placeholder="Select policy" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="discount_amount">
                          {editFormData.discount_policy === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                        </Label>
                        <Input
                          id="discount_amount"
                          type="number"
                          value={editFormData.discount_amount}
                          onChange={(e) => setEditFormData({ ...editFormData, discount_amount: Number(e.target.value) })}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
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
    </div>
  );
}
