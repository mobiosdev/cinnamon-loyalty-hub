import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import { categoryApi } from "@/services/categoryApi";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { logCategoryActivity, logOfferActivity } from "@/utils/auditLogger";
import { Switch } from "@/components/ui/switch";
import { offerApi, parseOfferDescription } from "@/services/offerApi";

const CustomerCategoryManagement = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", valid_from: "", valid_to: "" });
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", valid_from: "", valid_to: "" });
  const [isViewOffersOpen, setIsViewOffersOpen] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<any>(null);
  const [categoryOffers, setCategoryOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoryApi.getCategories();
      setCategories(data);
    } catch (error) {
      toast.error("Failed to load member categories");
    }
  };

  const loadCategoryOffers = async (categoryId: number) => {
    setLoadingOffers(true);
    try {
      const mappedOffers = await offerApi.getOffersByCategory(categoryId);
      setCategoryOffers(mappedOffers);
    } catch (error) {
      console.error('Error loading category offers:', error);
      toast.error("Failed to load offers for this category");
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleToggleOfferStatus = async (offerId: string, currentStatus: boolean) => {
    // Optimistic Update: flip the state locally first
    setCategoryOffers(prev =>
      prev.map(offer =>
        offer.id === offerId ? { ...offer, is_active: !currentStatus } : offer
      )
    );

    try {
      const offer = categoryOffers.find(o => o.id === offerId);
      await offerApi.updateOffer(offerId, { is_active: !currentStatus });
      
      if (offer) {
        await logOfferActivity('update', offer.name, offerId, {
          action: !currentStatus ? 'enabled' : 'disabled',
          status: !currentStatus ? 'active' : 'inactive'
        });
      }
      
      toast.success(`Offer ${!currentStatus ? "enabled" : "disabled"}`);
    } catch (error) {
      // Revert on error
      setCategoryOffers(prev =>
        prev.map(offer =>
          offer.id === offerId ? { ...offer, is_active: currentStatus } : offer
        )
      );
      toast.error("Failed to update offer status");
    }
  };


  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) {
      toast.error("Please enter member category name");
      return;
    }

    setLoading(true);
    try {
      const result = await categoryApi.createCategory({
        name: categoryForm.name,
        description: categoryForm.description,
        created_by: 1, // TODO: Get from auth
        valid_from: categoryForm.valid_from || null,
        valid_to: categoryForm.valid_to || null,
      });
      
      // Log category creation
      await logCategoryActivity('create', categoryForm.name, result.id?.toString(), {
        description: categoryForm.description
      });
      
      toast.success("Member category created successfully");
      setCategoryForm({ name: "", description: "", valid_from: "", valid_to: "" });
      loadCategories();
    } catch (error) {
      toast.error("Failed to create member category");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (category: any) => {
    setEditingCategory(category);
    setEditForm({ 
      name: category.name, 
      description: category.description || "",
      valid_from: category.valid_from?.split('T')[0] || "",
      valid_to: category.valid_to?.split('T')[0] || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name) {
      toast.error("Please enter member category name");
      return;
    }

    setLoading(true);
    try {
      await categoryApi.updateCategory(editingCategory.id, {
        name: editForm.name,
        description: editForm.description,
        valid_from: editForm.valid_from || null,
        valid_to: editForm.valid_to || null,
      });
      
      // Log category update
      await logCategoryActivity('update', editForm.name, editingCategory.id?.toString(), {
        description: editForm.description,
        previous_name: editingCategory.name
      });
      
      toast.success("Member category updated successfully");
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      toast.error("Failed to update member category");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (categoryId: number) => {
    setDeletingCategoryId(categoryId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategoryId) return;

    setLoading(true);
    try {
      const category = categories.find(c => c.id === deletingCategoryId);
      await categoryApi.deleteCategory(deletingCategoryId);
      
      // Log category deletion
      if (category) {
        await logCategoryActivity('delete', category.name, deletingCategoryId?.toString(), {
          description: category.description
        });
      }
      
      toast.success("Member category deleted successfully");
      setDeletingCategoryId(null);
      loadCategories();
    } catch (error) {
      toast.error("Failed to delete member category");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Create Member Category</CardTitle>
          </div>
          <CardDescription>Define member categories</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <Label htmlFor="categoryName">Member Category Name *</Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Premium, VIP"
              />
            </div>
            <div>
              <Label htmlFor="categoryDesc">Description</Label>
              <Textarea
                id="categoryDesc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Description of this category"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validFrom">Valid From</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={categoryForm.valid_from}
                  onChange={(e) => setCategoryForm({ ...categoryForm, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="validTo">Valid To</Label>
                <Input
                  id="validTo"
                  type="date"
                  value={categoryForm.valid_to}
                  onChange={(e) => setCategoryForm({ ...categoryForm, valid_to: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {loading ? "Creating..." : "Create Member Category"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Member Categories</CardTitle>
          <CardDescription>All member categories in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Valid From</TableHead>
                <TableHead>Valid To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cat.description || "—"}</TableCell>
                  <TableCell className="text-sm">{cat.valid_from ? new Date(cat.valid_from).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-sm">{cat.valid_to ? new Date(cat.valid_to).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setViewingCategory(cat);
                          loadCategoryOffers(cat.id);
                          setIsViewOffersOpen(true);
                        }}
                        title="View Active Offers"
                      >
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(cat)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(cat.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No member categories created yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Category</DialogTitle>
            <DialogDescription>Update the member category details below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Member Category Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g., Premium, VIP"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Description of this category"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-validFrom">Valid From</Label>
                <Input
                  id="edit-validFrom"
                  type="date"
                  value={editForm.valid_from}
                  onChange={(e) => setEditForm({ ...editForm, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-validTo">Valid To</Label>
                <Input
                  id="edit-validTo"
                  type="date"
                  value={editForm.valid_to}
                  onChange={(e) => setEditForm({ ...editForm, valid_to: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOffersOpen} onOpenChange={setIsViewOffersOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Active Offers for {viewingCategory?.name}</DialogTitle>
            <DialogDescription>View and manage offers assigned to this category</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {loadingOffers ? (
              <div className="flex justify-center items-center py-8">
                <span className="text-sm text-muted-foreground">Loading offers...</span>
              </div>
            ) : categoryOffers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No offers assigned to this category
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offer Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type & Limit</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryOffers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="font-medium">{offer.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{offer.description}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {viewingCategory && (
                            (() => {
                              const settings = offer.category_recurrence?.[viewingCategory.id];
                              if (settings) {
                                return (
                                  <div className="flex items-center gap-1.5 text-xs">
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
                                <div className="flex items-center gap-1.5 text-xs">
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
                            })()
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {offer.valid_from && offer.valid_to
                          ? `${new Date(offer.valid_from).toLocaleDateString()} - ${new Date(offer.valid_to).toLocaleDateString()}`
                          : "No expiry"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Badge variant={offer.is_active ? "default" : "secondary"}>
                            {offer.is_active ? "Active" : "Disabled"}
                          </Badge>
                          <Switch
                            checked={offer.is_active}
                            onCheckedChange={() => handleToggleOfferStatus(offer.id, offer.is_active)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="flex justify-end p-6 border-t bg-muted/20">
            <Button type="button" variant="outline" onClick={() => setIsViewOffersOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCategoryId} onOpenChange={(open) => !open && setDeletingCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this member category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerCategoryManagement;
