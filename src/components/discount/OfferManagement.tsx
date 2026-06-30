import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Plus, Pencil, Trash2, Trash, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { offerApi, serializeOfferDescription, parseOfferDescription } from "@/services/offerApi";
import { categoryApi } from "@/services/categoryApi";
import { logOfferActivity } from "@/utils/auditLogger";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const OfferManagement = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [editSelectedCategoryIds, setEditSelectedCategoryIds] = useState<number[]>([]);
  const [categorySettings, setCategorySettings] = useState<Record<number, {
    is_recurrent: boolean;
    hasUsageLimit: boolean;
    usage_limit: string;
  }>>({});
  const [editCategorySettings, setEditCategorySettings] = useState<Record<number, {
    is_recurrent: boolean;
    hasUsageLimit: boolean;
    usage_limit: string;
  }>>({});
  const [selectedOfferIds, setSelectedOfferIds] = useState<Set<string>>(new Set());
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showBulkDeleteAlert, setShowBulkDeleteAlert] = useState(false);
  const [deletingOffer, setDeletingOffer] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<any>(null);
  const [selectedPastOfferIds, setSelectedPastOfferIds] = useState<Set<string>>(new Set());
  const [showPastDeleteAlert, setShowPastDeleteAlert] = useState(false);
  const [showPastBulkDeleteAlert, setShowPastBulkDeleteAlert] = useState(false);
  const [deletingPastOffer, setDeletingPastOffer] = useState(false);
  const [deletingPastBulk, setDeletingPastBulk] = useState(false);
  const [pastOfferToDelete, setPastOfferToDelete] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    valid_from: "",
    valid_until: "",
    hasMinBillValue: false,
    min_bill_value: "",
    hasMaxDiscount: false,
    max_discount_amount: "",
    applyToExistingMembers: false,
    is_recurrent: false,
    hasUsageLimit: false,
    usage_limit: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    valid_from: "",
    valid_to: "",
    hasMinBillValue: false,
    min_bill_value: "",
    hasMaxDiscount: false,
    max_discount_amount: "",
    is_recurrent: false,
    hasUsageLimit: false,
    usage_limit: "",
  });

  useEffect(() => {
    loadOffers();
    loadCategories();
  }, []);

  const handleCategoryToggle = (catId: number, checked: boolean) => {
    if (checked) {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
      if (!categorySettings[catId]) {
        setCategorySettings(prev => ({
          ...prev,
          [catId]: {
            is_recurrent: false,
            hasUsageLimit: false,
            usage_limit: "",
          }
        }));
      }
    } else {
      setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== catId));
    }
  };

  const handleEditCategoryToggle = (catId: number, checked: boolean) => {
    if (checked) {
      setEditSelectedCategoryIds([...editSelectedCategoryIds, catId]);
      if (!editCategorySettings[catId]) {
        setEditCategorySettings(prev => ({
          ...prev,
          [catId]: {
            is_recurrent: false,
            hasUsageLimit: false,
            usage_limit: "",
          }
        }));
      }
    } else {
      setEditSelectedCategoryIds(editSelectedCategoryIds.filter(id => id !== catId));
    }
  };

  const loadOffers = async () => {
    try {
      const data = await offerApi.getOffers();
      setOffers(data);
    } catch (error) {
      toast.error("Failed to load offers");
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryApi.getCategories();
      setCategories(data);
    } catch (error) {
      toast.error("Failed to load categories");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.valid_from || !formData.valid_until || selectedCategoryIds.length === 0) {
      toast.error("Please fill all required fields (Name, Valid Dates, and Category)");
      return;
    }

    // Validate discount policy fields
    if (formData.hasMinBillValue && (!formData.min_bill_value || parseFloat(formData.min_bill_value) <= 0)) {
      toast.error("Please enter a valid minimum bill value");
      return;
    }
    if (formData.hasMaxDiscount && (!formData.max_discount_amount || parseFloat(formData.max_discount_amount) <= 0)) {
      toast.error("Please enter a valid maximum discount amount");
      return;
    }

    // Validate recurrence settings for each selected category
    for (const catId of selectedCategoryIds) {
      const settings = categorySettings[catId];
      if (settings?.is_recurrent && settings.hasUsageLimit) {
        const limitVal = parseInt(settings.usage_limit);
        const catName = categories.find(c => c.id === catId)?.name || `Category ${catId}`;
        if (isNaN(limitVal) || limitVal <= 0) {
          toast.error(`Please enter a valid usage limit (minimum 1) for ${catName}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      // Serialize the recurrence settings for all selected categories into the description
      const serializedDescription = serializeOfferDescription(formData.description, categorySettings);

      // Use the settings of the first category as default values for the offers table columns
      const firstCatId = selectedCategoryIds[0];
      const defaultSettings = categorySettings[firstCatId] || {
        is_recurrent: false,
        hasUsageLimit: false,
        usage_limit: "",
      };

      const createdOffer = await offerApi.createOffer({
        name: formData.name,
        description: serializedDescription,
        valid_from: formData.valid_from,
        valid_to: formData.valid_until,
        is_active: true,
        category_ids: selectedCategoryIds, // Associate with ALL selected categories!
        category_id: firstCatId,
        min_bill_value: formData.hasMinBillValue ? parseFloat(formData.min_bill_value) : undefined,
        max_discount_amount: formData.hasMaxDiscount ? parseFloat(formData.max_discount_amount) : undefined,
        is_recurrent: defaultSettings.is_recurrent,
        usage_limit: defaultSettings.is_recurrent && defaultSettings.hasUsageLimit ? parseInt(defaultSettings.usage_limit) : null,
      });

      // Log offer activity
      const catNames = selectedCategoryIds
        .map(id => categories.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      await logOfferActivity('create', formData.name, createdOffer.id, {
        categories: catNames,
        valid_from: formData.valid_from,
        valid_to: formData.valid_until,
        min_bill_value: formData.hasMinBillValue ? formData.min_bill_value : null,
        max_discount_amount: formData.hasMaxDiscount ? formData.max_discount_amount : null,
      });

      // If apply to existing members is checked, assign the offer
      if (formData.applyToExistingMembers) {
        try {
          const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7050/api';
          await fetch(`${apiBase}/offers/assign-to-members`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              offer_id: createdOffer.id,
              category_ids: selectedCategoryIds,
            }),
          });
        } catch (assignError) {
          console.error(`Error assigning offer to members:`, assignError);
        }
      }

      toast.success("Offer created successfully");
      
      setFormData({ 
        name: "", 
        description: "", 
        valid_from: "", 
        valid_until: "",
        hasMinBillValue: false,
        min_bill_value: "",
        hasMaxDiscount: false,
        max_discount_amount: "",
        applyToExistingMembers: false,
        is_recurrent: false,
        hasUsageLimit: false,
        usage_limit: "",
      });
      setSelectedCategoryIds([]);
      setCategorySettings({});
      loadOffers();
    } catch (error) {
      toast.error("Failed to create offer");
    } finally {
      setLoading(false);
    }
  };

  const toggleOfferStatus = async (id: string, currentStatus: boolean) => {
    try {
      const offer = offers.find(o => o.id === id);
      await offerApi.updateOffer(id, { is_active: !currentStatus });
      
      // Log offer status change
      if (offer) {
        await logOfferActivity('update', offer.name, id, {
          action: !currentStatus ? 'enabled' : 'disabled',
          status: !currentStatus ? 'active' : 'inactive'
        });
      }
      
      toast.success(`Offer ${!currentStatus ? "enabled" : "disabled"}`);
      loadOffers();
    } catch (error) {
      toast.error("Failed to update offer");
    }
  };

  const handleEditClick = async (offer: any) => {
    setEditingOffer(offer);
    
    // Parse description and recurrence settings
    const { description: cleanDescription, category_recurrence } = parseOfferDescription(offer.description);

    setEditFormData({
      name: offer.name,
      description: cleanDescription || "",
      valid_from: offer.valid_from || "",
      valid_to: offer.valid_to || "",
      hasMinBillValue: !!offer.min_bill_value,
      min_bill_value: offer.min_bill_value?.toString() || "",
      hasMaxDiscount: !!offer.max_discount_amount,
      max_discount_amount: offer.max_discount_amount?.toString() || "",
      is_recurrent: !!offer.is_recurrent,
      hasUsageLimit: offer.usage_limit !== null && offer.usage_limit !== undefined,
      usage_limit: offer.usage_limit?.toString() || "",
    });
    
    // Load categories for this offer
    try {
      const categoryIds = await offerApi.getOfferCategories(offer.id);
      setEditSelectedCategoryIds(categoryIds);

      // Initialize settings for all categories belonging to this offer
      const initialSettings: Record<number, { is_recurrent: boolean; hasUsageLimit: boolean; usage_limit: string }> = {};
      categoryIds.forEach(id => {
        // If there are saved settings in the description for this category, use them!
        if (category_recurrence && category_recurrence[id]) {
          initialSettings[id] = {
            is_recurrent: !!category_recurrence[id].is_recurrent,
            hasUsageLimit: !!category_recurrence[id].hasUsageLimit,
            usage_limit: category_recurrence[id].usage_limit?.toString() || "",
          };
        } else {
          // Otherwise, fall back to the offer's own settings
          initialSettings[id] = {
            is_recurrent: !!offer.is_recurrent,
            hasUsageLimit: offer.usage_limit !== null && offer.usage_limit !== undefined,
            usage_limit: offer.usage_limit?.toString() || "",
          };
        }
      });
      setEditCategorySettings(initialSettings);
    } catch (error) {
      console.error('Error loading offer categories:', error);
      setEditSelectedCategoryIds([]);
      setEditCategorySettings({});
    }
    
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.valid_from || !editFormData.valid_to || editSelectedCategoryIds.length === 0) {
      toast.error("Please fill all required fields (Name, Valid Dates, and Category)");
      return;
    }

    // Validate discount policy fields
    if (editFormData.hasMinBillValue && (!editFormData.min_bill_value || parseFloat(editFormData.min_bill_value) <= 0)) {
      toast.error("Please enter a valid minimum bill value");
      return;
    }
    if (editFormData.hasMaxDiscount && (!editFormData.max_discount_amount || parseFloat(editFormData.max_discount_amount) <= 0)) {
      toast.error("Please enter a valid maximum discount amount");
      return;
    }

    // Validate recurrence settings for each selected category in Edit Form
    for (const catId of editSelectedCategoryIds) {
      const settings = editCategorySettings[catId];
      if (settings?.is_recurrent && settings.hasUsageLimit) {
        const limitVal = parseInt(settings.usage_limit);
        const catName = categories.find(c => c.id === catId)?.name || `Category ${catId}`;
        if (isNaN(limitVal) || limitVal <= 0) {
          toast.error(`Please enter a valid usage limit (minimum 1) for ${catName}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      // Serialize the recurrence settings for all selected categories into the description
      const serializedDescription = serializeOfferDescription(editFormData.description, editCategorySettings);

      // Use the settings of the first category as the default values for the offers table columns
      const firstCatId = editSelectedCategoryIds[0];
      const defaultSettings = editCategorySettings[firstCatId] || {
        is_recurrent: false,
        hasUsageLimit: false,
        usage_limit: "",
      };

      await offerApi.updateOffer(editingOffer.id, {
        name: editFormData.name,
        description: serializedDescription,
        valid_from: editFormData.valid_from,
        valid_to: editFormData.valid_to,
        category_ids: editSelectedCategoryIds, // Associate with ALL selected categories!
        category_id: firstCatId,
        min_bill_value: editFormData.hasMinBillValue ? parseFloat(editFormData.min_bill_value) : null,
        max_discount_amount: editFormData.hasMaxDiscount ? parseFloat(editFormData.max_discount_amount) : null,
        is_recurrent: defaultSettings.is_recurrent,
        usage_limit: defaultSettings.is_recurrent && defaultSettings.hasUsageLimit ? parseInt(defaultSettings.usage_limit) : null,
      });

      // Log offer update
      await logOfferActivity('update', editFormData.name, editingOffer.id, {
        categories: editSelectedCategoryIds.map(id => categories.find(c => c.id === id)?.name).join(', '),
        valid_from: editFormData.valid_from,
        valid_to: editFormData.valid_to,
        previous_name: editingOffer.name,
      });
      
      toast.success("Offer updated successfully");
      setIsEditDialogOpen(false);
      setEditingOffer(null);
      setEditSelectedCategoryIds([]);
      loadOffers();
    } catch (error) {
      toast.error("Failed to update offer");
    } finally {
      setLoading(false);
    }
  };

  const activeOffers = offers.filter(offer => offer.is_active);
  const pastOffers = offers.filter(offer => !offer.is_active);

  const handleToggleSelectOffer = (offerId: string) => {
    setSelectedOfferIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(offerId)) {
        newSet.delete(offerId);
      } else {
        newSet.add(offerId);
      }
      return newSet;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedOfferIds.size === activeOffers.length) {
      setSelectedOfferIds(new Set());
    } else {
      setSelectedOfferIds(new Set(activeOffers.map(o => o.id)));
    }
  };

  const handleToggleSelectPastOffer = (offerId: string) => {
    setSelectedPastOfferIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(offerId)) {
        newSet.delete(offerId);
      } else {
        newSet.add(offerId);
      }
      return newSet;
    });
  };

  const handleToggleSelectAllPast = () => {
    if (selectedPastOfferIds.size === pastOffers.length) {
      setSelectedPastOfferIds(new Set());
    } else {
      setSelectedPastOfferIds(new Set(pastOffers.map(o => o.id)));
    }
  };

  const handleDeleteClick = (offer: any) => {
    setOfferToDelete(offer);
    setShowDeleteAlert(true);
  };

  const handleDeleteOffer = async () => {
    if (!offerToDelete) return;

    setDeletingOffer(true);
    try {
      await offerApi.deleteOffer(offerToDelete.id);
      
      await logOfferActivity('update', offerToDelete.name, offerToDelete.id, {
        action: 'deactivated',
        status: 'inactive'
      });

      toast.success("Offer deactivated successfully");
      setShowDeleteAlert(false);
      setOfferToDelete(null);
      loadOffers();
    } catch (error) {
      console.error('Error deactivating offer:', error);
      toast.error("Failed to deactivate offer");
    } finally {
      setDeletingOffer(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOfferIds.size === 0) return;

    setDeletingBulk(true);
    try {
      const offersToDelete = activeOffers.filter(o => selectedOfferIds.has(o.id));
      
      await Promise.all(
        Array.from(selectedOfferIds).map(id => offerApi.deleteOffer(id))
      );

      await Promise.all(
        offersToDelete.map(offer =>
          logOfferActivity('update', offer.name, offer.id, {
            action: 'deactivated',
            status: 'inactive',
            bulk_delete: true
          })
        )
      );

      toast.success(`Successfully deactivated ${selectedOfferIds.size} offer(s)`);
      
      setSelectedOfferIds(new Set());
      setShowBulkDeleteAlert(false);
      loadOffers();
    } catch (error) {
      console.error('Error bulk deactivating offers:', error);
      toast.error("Failed to deactivate some offers");
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleDeletePastClick = (offer: any) => {
    setPastOfferToDelete(offer);
    setShowPastDeleteAlert(true);
  };

  const handleDeletePastOffer = async () => {
    if (!pastOfferToDelete) return;

    setDeletingPastOffer(true);
    try {
      await offerApi.deleteOffer(pastOfferToDelete.id);
      
      await logOfferActivity('update', pastOfferToDelete.name, pastOfferToDelete.id, {
        action: 'deactivated',
        status: 'inactive',
        note: 'Already inactive offer marked for deletion'
      });

      toast.success("Offer marked as deleted successfully");
      setShowPastDeleteAlert(false);
      setPastOfferToDelete(null);
      loadOffers();
    } catch (error) {
      console.error('Error marking past offer as deleted:', error);
      toast.error("Failed to process offer deletion");
    } finally {
      setDeletingPastOffer(false);
    }
  };

  const handleBulkDeletePast = async () => {
    if (selectedPastOfferIds.size === 0) return;

    setDeletingPastBulk(true);
    try {
      const offersToDelete = pastOffers.filter(o => selectedPastOfferIds.has(o.id));
      
      await Promise.all(
        Array.from(selectedPastOfferIds).map(id => offerApi.deleteOffer(id))
      );

      await Promise.all(
        offersToDelete.map(offer =>
          logOfferActivity('update', offer.name, offer.id, {
            action: 'deactivated',
            status: 'inactive',
            bulk_delete: true,
            note: 'Already inactive offer marked for deletion'
          })
        )
      );

      toast.success(`Successfully processed ${selectedPastOfferIds.size} offer(s)`);
      
      setSelectedPastOfferIds(new Set());
      setShowPastBulkDeleteAlert(false);
      loadOffers();
    } catch (error) {
      console.error('Error bulk processing past offers:', error);
      toast.error("Failed to process some offers");
    } finally {
      setDeletingPastBulk(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create-offer" className="w-full">
        <Card className="mt-4">
          <TabsList className="grid w-full grid-cols-3 h-auto p-0 bg-transparent border-b rounded-none">
            <TabsTrigger 
              value="create-offer" 
              className="rounded-none rounded-tl-lg data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=inactive]:bg-muted/50 py-3 border-r border-b-0"
            >
              Create Offer
            </TabsTrigger>
            <TabsTrigger 
              value="active-offers" 
              className="rounded-none data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=inactive]:bg-muted/50 py-3 border-r border-b-0"
            >
              Active Offers
            </TabsTrigger>
            <TabsTrigger 
              value="past-offers" 
              className="rounded-none rounded-tr-lg data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=inactive]:bg-muted/50 py-3 border-b-0"
            >
              Past Offers
            </TabsTrigger>
          </TabsList>
        </Card>

        <TabsContent value="create-offer" className="mt-6">
          <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle>Create Offer</CardTitle>
          </div>
          <CardDescription>Create offers for member categories</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Offer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Birthday Cake, Dinner Voucher"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details about the offer"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valid_from">Valid From *</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="valid_until">Valid Until *</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Member Categories *</Label>
              <div className="border rounded-md p-4 space-y-4 bg-background mt-2">
                <p className="text-sm text-muted-foreground">Select one or more categories and configure their recurrence settings</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    const settings = categorySettings[cat.id] || {
                      is_recurrent: false,
                      hasUsageLimit: false,
                      usage_limit: "",
                    };
                    return (
                      <div
                        key={cat.id}
                        className={`border rounded-lg p-4 transition-all duration-200 ${
                          isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-accent/30"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`cat-${cat.id}`}
                            checked={isSelected}
                            onChange={(e) => handleCategoryToggle(cat.id, e.target.checked)}
                            className="h-4 w-4 rounded border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                          />
                          <Label htmlFor={`cat-${cat.id}`} className="font-semibold text-base cursor-pointer">
                            {cat.name}
                          </Label>
                        </div>

                        {isSelected && (
                          <div className="mt-3 pl-6 border-l-2 border-primary/20 space-y-3 animate-fadeIn">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`recurrent-${cat.id}`}
                                checked={settings.is_recurrent}
                                onChange={(e) => {
                                  setCategorySettings(prev => ({
                                    ...prev,
                                    [cat.id]: {
                                      ...settings,
                                      is_recurrent: e.target.checked
                                    }
                                  }));
                                }}
                                className="h-4 w-4 rounded border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                              />
                              <Label htmlFor={`recurrent-${cat.id}`} className="cursor-pointer text-sm font-medium">
                                Recurrent Offer
                              </Label>
                            </div>

                            {settings.is_recurrent && (
                              <div className="mt-2 pl-6 space-y-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id={`limit-unlimited-${cat.id}`}
                                    name={`usage-limit-type-${cat.id}`}
                                    checked={!settings.hasUsageLimit}
                                    onChange={() => {
                                      setCategorySettings(prev => ({
                                        ...prev,
                                        [cat.id]: {
                                          ...settings,
                                          hasUsageLimit: false
                                        }
                                      }));
                                    }}
                                    className="h-4 w-4 border-primary text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                                  />
                                  <Label htmlFor={`limit-unlimited-${cat.id}`} className="cursor-pointer font-normal text-xs text-muted-foreground">
                                    Unlimited Redemptions
                                  </Label>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id={`limit-defined-${cat.id}`}
                                      name={`usage-limit-type-${cat.id}`}
                                      checked={settings.hasUsageLimit}
                                      onChange={() => {
                                        setCategorySettings(prev => ({
                                          ...prev,
                                          [cat.id]: {
                                            ...settings,
                                            hasUsageLimit: true
                                          }
                                        }));
                                      }}
                                      className="h-4 w-4 border-primary text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                                    />
                                    <Label htmlFor={`limit-defined-${cat.id}`} className="cursor-pointer font-normal text-xs text-muted-foreground">
                                      Define Redemption Limit
                                    </Label>
                                  </div>

                                  {settings.hasUsageLimit && (
                                    <Input
                                      type="number"
                                      min="1"
                                      step="1"
                                      placeholder="Limit (e.g., 3)"
                                      value={settings.usage_limit}
                                      onChange={(e) => {
                                        setCategorySettings(prev => ({
                                          ...prev,
                                          [cat.id]: {
                                            ...settings,
                                            usage_limit: e.target.value
                                          }
                                        }));
                                      }}
                                      className="w-full max-w-[180px] h-8 text-xs mt-1"
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedCategoryIds.length === 0 && (
                  <p className="text-sm text-destructive">Please select at least one category</p>
                )}
              </div>
            </div>

            <div>
              <Label>Discount Policy (Optional)</Label>
              <div className="border rounded-md p-4 space-y-4 bg-background mt-2">
                <p className="text-sm text-muted-foreground">Configure discount restrictions for this offer</p>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="hasMinBillValue"
                      checked={formData.hasMinBillValue}
                      onChange={(e) => setFormData({ ...formData, hasMinBillValue: e.target.checked })}
                      className="h-4 w-4 mt-1 rounded border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <div className="flex-1">
                      <Label htmlFor="hasMinBillValue" className="cursor-pointer">Minimum Bill Value</Label>
                      {formData.hasMinBillValue && (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter minimum bill amount"
                          value={formData.min_bill_value}
                          onChange={(e) => setFormData({ ...formData, min_bill_value: e.target.value })}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="hasMaxDiscount"
                      checked={formData.hasMaxDiscount}
                      onChange={(e) => setFormData({ ...formData, hasMaxDiscount: e.target.checked })}
                      className="h-4 w-4 mt-1 rounded border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <div className="flex-1">
                      <Label htmlFor="hasMaxDiscount" className="cursor-pointer">Maximum Discount Amount (for percentage discounts)</Label>
                      {formData.hasMaxDiscount && (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter maximum discount cap"
                          value={formData.max_discount_amount}
                          onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            

            <div className="border rounded-md p-4 bg-muted/50">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="applyToExistingMembers"
                  checked={formData.applyToExistingMembers}
                  onChange={(e) => setFormData({ ...formData, applyToExistingMembers: e.target.checked })}
                  className="h-4 w-4 mt-1 rounded border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                />
                <div className="flex-1">
                  <Label htmlFor="applyToExistingMembers" className="cursor-pointer font-medium">
                    Apply to All Member Categories
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically assign this offer to all members in the selected categories
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {loading ? "Creating..." : "Create Offer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="active-offers" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Offers</CardTitle>
                <CardDescription>Manage All Existing Offers</CardDescription>
              </div>
              {selectedOfferIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteAlert(true)}
                  className="gap-2"
                >
                  <Trash className="h-4 w-4" />
                  Deactivate {selectedOfferIds.size} offer{selectedOfferIds.size !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={activeOffers.length > 0 && selectedOfferIds.size === activeOffers.length}
                      onCheckedChange={handleToggleSelectAll}
                      aria-label="Select all active offers"
                    />
                  </TableHead>
                  <TableHead>Offer Name</TableHead>
                  <TableHead>Member Categories</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type & Limit</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeOffers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOfferIds.has(offer.id)}
                        onCheckedChange={() => handleToggleSelectOffer(offer.id)}
                        aria-label={`Select ${offer.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{offer.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {offer.category_name ? (
                          offer.category_name.split(', ').map((name: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No categories</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{offer.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {offer.category_name ? (
                          offer.category_name.split(', ').map((name: string, index: number) => {
                            const category = categories.find(c => c.name === name);
                            const settings = category && offer.category_recurrence?.[category.id];
                            if (settings) {
                              return (
                                <div key={index} className="flex items-center gap-1.5 text-xs">
                                  <span className="font-semibold text-muted-foreground w-20 inline-block">{name}:</span>
                                  {settings.is_recurrent ? (
                                    <Badge variant="outline" className="h-5 py-0 border-primary text-primary bg-primary/5 text-[10px]">
                                      Recurrent ({settings.hasUsageLimit && settings.usage_limit ? `Limit: ${settings.usage_limit}` : "Unlimited"})
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="h-5 py-0 text-muted-foreground text-[10px]">
                                      Single Use
                                    </Badge>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div key={index} className="flex items-center gap-1.5 text-xs">
                                <span className="font-semibold text-muted-foreground w-20 inline-block">{name}:</span>
                                {offer.is_recurrent ? (
                                  <Badge variant="outline" className="h-5 py-0 border-primary text-primary bg-primary/5 text-[10px]">
                                    Recurrent ({offer.usage_limit ? `Limit: ${offer.usage_limit}` : "Unlimited"})
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="h-5 py-0 text-muted-foreground text-[10px]">
                                    Single Use
                                  </Badge>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-sm text-muted-foreground">No categories</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {offer.valid_from && offer.valid_to
                        ? `${new Date(offer.valid_from).toLocaleDateString()} - ${new Date(offer.valid_to).toLocaleDateString()}`
                        : "No expiry"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={offer.is_active ? "default" : "secondary"}>
                        {offer.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(offer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(offer)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={offer.is_active}
                          onCheckedChange={() => toggleOfferStatus(offer.id, offer.is_active)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {activeOffers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No active offers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="past-offers" className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Past Offers</CardTitle>
                <CardDescription>View expired and disabled offers</CardDescription>
              </div>
              {selectedPastOfferIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowPastBulkDeleteAlert(true)}
                  className="gap-2"
                >
                  <Trash className="h-4 w-4" />
                  Delete {selectedPastOfferIds.size} offer{selectedPastOfferIds.size !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={pastOffers.length > 0 && selectedPastOfferIds.size === pastOffers.length}
                      onCheckedChange={handleToggleSelectAllPast}
                      aria-label="Select all past offers"
                    />
                  </TableHead>
                  <TableHead>Offer Name</TableHead>
                  <TableHead>Member Categories</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type & Limit</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastOffers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPastOfferIds.has(offer.id)}
                      onCheckedChange={() => handleToggleSelectPastOffer(offer.id)}
                      aria-label={`Select ${offer.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{offer.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {offer.category_name ? (
                        offer.category_name.split(', ').map((name: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No categories</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{offer.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      {offer.category_name ? (
                        offer.category_name.split(', ').map((name: string, index: number) => {
                          const category = categories.find(c => c.name === name);
                          const settings = category && offer.category_recurrence?.[category.id];
                          if (settings) {
                            return (
                              <div key={index} className="flex items-center gap-1.5 text-xs">
                                <span className="font-semibold text-muted-foreground w-20 inline-block">{name}:</span>
                                {settings.is_recurrent ? (
                                  <Badge variant="outline" className="h-5 py-0 border-primary text-primary bg-primary/5 text-[10px]">
                                    Recurrent ({settings.hasUsageLimit && settings.usage_limit ? `Limit: ${settings.usage_limit}` : "Unlimited"})
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="h-5 py-0 text-muted-foreground text-[10px]">
                                    Single Use
                                  </Badge>
                                )}
                              </div>
                            );
                          }
                          return (
                            <div key={index} className="flex items-center gap-1.5 text-xs">
                              <span className="font-semibold text-muted-foreground w-20 inline-block">{name}:</span>
                              {offer.is_recurrent ? (
                                <Badge variant="outline" className="h-5 py-0 border-primary text-primary bg-primary/5 text-[10px]">
                                  Recurrent ({offer.usage_limit ? `Limit: ${offer.usage_limit}` : "Unlimited"})
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="h-5 py-0 text-muted-foreground text-[10px]">
                                  Single Use
                                </Badge>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-sm text-muted-foreground">No categories</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {offer.valid_from && offer.valid_to
                      ? `${new Date(offer.valid_from).toLocaleDateString()} - ${new Date(offer.valid_to).toLocaleDateString()}`
                      : "No expiry"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={offer.is_active ? "default" : "secondary"}>
                      {offer.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(offer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePastClick(offer)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={offer.is_active}
                        onCheckedChange={() => toggleOfferStatus(offer.id, offer.is_active)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
                ))}
                {pastOffers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No past offers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[85vh] p-0 overflow-hidden gap-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Edit Offer</DialogTitle>
            <DialogDescription>Update the offer details below</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[60vh] scrollbar-thin">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Offer Name *</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="e.g., Birthday Cake, Dinner Voucher"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Details about the offer"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-valid_from">Valid From *</Label>
                  <Input
                    id="edit-valid_from"
                    type="date"
                    value={editFormData.valid_from}
                    onChange={(e) => setEditFormData({ ...editFormData, valid_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-valid_to">Valid Until *</Label>
                  <Input
                    id="edit-valid_to"
                    type="date"
                    value={editFormData.valid_to}
                    onChange={(e) => setEditFormData({ ...editFormData, valid_to: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-category">Member Categories *</Label>
                <div className="border rounded-md p-4 space-y-4 bg-background mt-2">
                  <p className="text-sm text-muted-foreground">Select one or more categories and configure their recurrence settings</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((cat) => {
                      const isSelected = editSelectedCategoryIds.includes(cat.id);
                      const settings = editCategorySettings[cat.id] || {
                        is_recurrent: false,
                        hasUsageLimit: false,
                        usage_limit: "",
                      };
                      return (
                        <div
                          key={cat.id}
                          className={`border rounded-lg p-4 transition-all duration-200 ${
                            isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-accent/30"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`edit-cat-${cat.id}`}
                              checked={isSelected}
                              onChange={(e) => handleEditCategoryToggle(cat.id, e.target.checked)}
                              className="h-4 w-4 rounded border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                            />
                            <Label htmlFor={`edit-cat-${cat.id}`} className="font-semibold text-base cursor-pointer">
                              {cat.name}
                            </Label>
                          </div>

                          {isSelected && (
                            <div className="mt-3 pl-6 border-l-2 border-primary/20 space-y-3 animate-fadeIn">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`edit-recurrent-${cat.id}`}
                                  checked={settings.is_recurrent}
                                  onChange={(e) => {
                                    setEditCategorySettings(prev => ({
                                      ...prev,
                                      [cat.id]: {
                                        ...settings,
                                        is_recurrent: e.target.checked
                                      }
                                    }));
                                  }}
                                  className="h-4 w-4 rounded border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                                />
                                <Label htmlFor={`edit-recurrent-${cat.id}`} className="cursor-pointer text-sm font-medium">
                                  Recurrent Offer
                                </Label>
                              </div>

                              {settings.is_recurrent && (
                                <div className="mt-2 pl-6 space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id={`edit-limit-unlimited-${cat.id}`}
                                      name={`edit-usage-limit-type-${cat.id}`}
                                      checked={!settings.hasUsageLimit}
                                      onChange={() => {
                                        setEditCategorySettings(prev => ({
                                          ...prev,
                                          [cat.id]: {
                                            ...settings,
                                            hasUsageLimit: false
                                          }
                                        }));
                                      }}
                                      className="h-4 w-4 border-primary text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                                    />
                                    <Label htmlFor={`edit-limit-unlimited-${cat.id}`} className="cursor-pointer font-normal text-xs text-muted-foreground">
                                      Unlimited Redemptions
                                    </Label>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        id={`edit-limit-defined-${cat.id}`}
                                        name={`edit-usage-limit-type-${cat.id}`}
                                        checked={settings.hasUsageLimit}
                                        onChange={() => {
                                          setEditCategorySettings(prev => ({
                                            ...prev,
                                            [cat.id]: {
                                              ...settings,
                                              hasUsageLimit: true
                                            }
                                          }));
                                        }}
                                        className="h-4 w-4 border-primary text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                                      />
                                      <Label htmlFor={`edit-limit-defined-${cat.id}`} className="cursor-pointer font-normal text-xs text-muted-foreground">
                                        Define Redemption Limit
                                      </Label>
                                    </div>

                                    {settings.hasUsageLimit && (
                                      <Input
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder="Limit (e.g., 3)"
                                        value={settings.usage_limit}
                                        onChange={(e) => {
                                          setEditCategorySettings(prev => ({
                                            ...prev,
                                            [cat.id]: {
                                              ...settings,
                                              usage_limit: e.target.value
                                            }
                                          }));
                                        }}
                                        className="w-full max-w-[180px] h-8 text-xs mt-1"
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {editSelectedCategoryIds.length === 0 && (
                    <p className="text-sm text-destructive">Please select at least one category</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Discount Policy (Optional)</Label>
                <div className="border rounded-md p-4 space-y-4 bg-background mt-2">
                  <p className="text-sm text-muted-foreground">Configure discount restrictions for this offer</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="edit-hasMinBillValue"
                        checked={editFormData.hasMinBillValue}
                        onChange={(e) => setEditFormData({ ...editFormData, hasMinBillValue: e.target.checked })}
                        className="h-4 w-4 mt-1 rounded border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                      />
                      <div className="flex-1">
                        <Label htmlFor="edit-hasMinBillValue" className="cursor-pointer font-medium">Minimum Bill Value</Label>
                        {editFormData.hasMinBillValue && (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Enter minimum bill amount"
                            value={editFormData.min_bill_value}
                            onChange={(e) => setEditFormData({ ...editFormData, min_bill_value: e.target.value })}
                            className="mt-2"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="edit-hasMaxDiscount"
                        checked={editFormData.hasMaxDiscount}
                        onChange={(e) => setEditFormData({ ...editFormData, hasMaxDiscount: e.target.checked })}
                        className="h-4 w-4 mt-1 rounded border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                      />
                      <div className="flex-1">
                        <Label htmlFor="edit-hasMaxDiscount" className="cursor-pointer font-medium">Maximum Discount Amount (for percentage discounts)</Label>
                        {editFormData.hasMaxDiscount && (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Enter maximum discount cap"
                            value={editFormData.max_discount_amount}
                            onChange={(e) => setEditFormData({ ...editFormData, max_discount_amount: e.target.value })}
                            className="mt-2"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer Actions */}
            <div className="flex justify-end gap-2 p-6 border-t bg-muted/20">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Offer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Offer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <span className="font-semibold">{offerToDelete?.name}</span>? 
              The offer will be marked as inactive but the data will be preserved. You can reactivate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOffer}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOffer}
              disabled={deletingOffer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingOffer ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate Offer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteAlert} onOpenChange={setShowBulkDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Multiple Offers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <span className="font-semibold">{selectedOfferIds.size} offer{selectedOfferIds.size !== 1 ? 's' : ''}</span>? 
              These offers will be marked as inactive but the data will be preserved. You can reactivate them later.
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
                `Deactivate ${selectedOfferIds.size} Offer${selectedOfferIds.size !== 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Past Offers Delete Confirmation Dialog */}
      <AlertDialog open={showPastDeleteAlert} onOpenChange={setShowPastDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Past Offer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{pastOfferToDelete?.name}</span>? 
              This offer is already inactive. This action will mark it for permanent removal (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPastOffer}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePastOffer}
              disabled={deletingPastOffer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingPastOffer ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Offer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Past Offers Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showPastBulkDeleteAlert} onOpenChange={setShowPastBulkDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Past Offers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedPastOfferIds.size} offer{selectedPastOfferIds.size !== 1 ? 's' : ''}</span>? 
              These offers are already inactive. This action will mark them for permanent removal (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPastBulk}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeletePast}
              disabled={deletingPastBulk}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingPastBulk ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedPastOfferIds.size} Offer${selectedPastOfferIds.size !== 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OfferManagement;
