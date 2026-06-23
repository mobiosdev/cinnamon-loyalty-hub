import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { categoryApi } from "@/services/categoryApi";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { logCategoryActivity } from "@/utils/auditLogger";

const CustomerCategoryManagement = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });

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


  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) {
      toast.error("Please enter member category name");
      return;
    }

    setLoading(true);
    try {
      const result = await categoryApi.createCategory({
        ...categoryForm,
        created_by: 1, // TODO: Get from auth
      });
      
      // Log category creation
      await logCategoryActivity('create', categoryForm.name, result.id?.toString(), {
        description: categoryForm.description
      });
      
      toast.success("Member category created successfully");
      setCategoryForm({ name: "", description: "" });
      loadCategories();
    } catch (error) {
      toast.error("Failed to create member category");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (category: any) => {
    setEditingCategory(category);
    setEditForm({ name: category.name, description: category.description || "" });
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
      await categoryApi.updateCategory(editingCategory.id, editForm);
      
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
          <CardDescription>Define member categories like General, Premium, VIP</CardDescription>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cat.description || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
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
