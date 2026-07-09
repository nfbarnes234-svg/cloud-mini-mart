import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useListExpenses, useCreateExpense } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListExpensesQueryKey } from "@workspace/api-client-react";

export default function Expenses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: expenses, isLoading } = useListExpenses();
  const createExpense = useCreateExpense();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ description: "", amount: "", category: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createExpense.mutateAsync({
        data: {
          description: formData.description,
          amount: Number(formData.amount),
          category: formData.category
        }
      });
      toast({ title: "Expense recorded" });
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      setIsFormOpen(false);
      setFormData({ description: "", amount: "", category: "" });
    } catch (err) {
      toast({ title: "Error recording expense", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground mt-1">Track store operational costs and payouts.</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Record Expense
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : expenses?.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(expense.createdAt)}</TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {expense.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-destructive">
                    -{formatCurrency(expense.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {expenses?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No expenses recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g. Shop Rent, Restocking Water" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Rent, Utilities, Supplies" />
              </div>
              <div className="space-y-2">
                <Label>Amount (GHS)</Label>
                <Input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit">Save Expense</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
