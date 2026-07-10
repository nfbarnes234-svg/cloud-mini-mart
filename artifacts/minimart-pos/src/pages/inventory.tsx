import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useListCategories } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Edit, Trash2, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListProductsQueryKey } from "@workspace/api-client-react";

export default function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: products, isLoading } = useListProducts({ search: searchTerm });
  const { data: categories } = useListCategories();
  
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "", barcode: "", categoryId: "",
    purchasePrice: "", sellingPrice: "", stock: "", minStock: "", unit: "pcs"
  });

  const handleOpenForm = (product: any = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        barcode: product.barcode || "",
        categoryId: product.categoryId?.toString() || "",
        purchasePrice: product.purchasePrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
        unit: product.unit
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "", barcode: "", categoryId: "",
        purchasePrice: "", sellingPrice: "", stock: "", minStock: "", unit: "pcs"
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const hasCategory = !!formData.categoryId && formData.categoryId !== "none";
      const base = {
        name: formData.name,
        barcode: formData.barcode || undefined,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        unit: formData.unit
      };

      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          data: { ...base, categoryId: hasCategory ? Number(formData.categoryId) : null },
        });
        toast({ title: "Product updated" });
      } else {
        await createProduct.mutateAsync({
          data: { ...base, categoryId: hasCategory ? Number(formData.categoryId) : undefined },
        });
        toast({ title: "Product created" });
      }
      
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setIsFormOpen(false);
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || "Please check the form and try again.";
      toast({ title: "Error saving product", description: message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct.mutateAsync({ id });
      toast({ title: "Product deleted" });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    } catch (err) {
      toast({ title: "Error deleting product", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
            <p className="text-muted-foreground mt-1">Manage your products, stock levels, and pricing.</p>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>

        <div className="flex items-center bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search products by name or SKU..." 
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[50px] ml-auto" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="font-medium">{product.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                  <TableCell>{product.categoryName || '-'}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(product.sellingPrice)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      product.stock <= product.minStock ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
                    }`}>
                      {product.stock} {product.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenForm(product)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Barcode</Label>
                  <Input
                    autoFocus
                    placeholder="Scan barcode or type manually"
                    value={formData.barcode}
                    onChange={e => setFormData({...formData, barcode: e.target.value})}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Product Name</Label>
                  <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Category</Label>
                  <Select value={formData.categoryId} onValueChange={v => setFormData({...formData, categoryId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purchase Price (GHS)</Label>
                  <Input type="number" step="0.01" required value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price (GHS)</Label>
                  <Input type="number" step="0.01" required value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Current Stock</Label>
                  <Input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Min Stock Alert</Label>
                  <Input type="number" required value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit">Save Product</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
}
