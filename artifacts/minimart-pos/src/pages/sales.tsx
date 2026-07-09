import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useListSales, useGetSale, useVoidSale } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, FileText, Ban, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListSalesQueryKey } from "@workspace/api-client-react";

export default function SalesHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sales, isLoading } = useListSales({});
  
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const { data: saleDetail, isLoading: isLoadingDetail } = useGetSale(selectedSaleId!, {
    query: { enabled: !!selectedSaleId, queryKey: ['sale', selectedSaleId] }
  });

  const voidSale = useVoidSale();

  const handleVoid = async (id: number) => {
    if (!confirm("Are you sure you want to void this sale? This action cannot be undone and will return items to stock.")) return;
    try {
      await voidSale.mutateAsync({ id });
      toast({ title: "Sale voided" });
      queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
      setSelectedSaleId(null);
    } catch (err) {
      toast({ title: "Error voiding sale", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
            <p className="text-muted-foreground mt-1">Review past transactions and print receipts.</p>
          </div>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : sales?.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono text-sm font-medium">{sale.invoiceNumber}</TableCell>
                  <TableCell className="text-sm">{formatDate(sale.createdAt)}</TableCell>
                  <TableCell>{sale.customerName || 'Walk-in Customer'}</TableCell>
                  <TableCell className="capitalize">{sale.paymentMethod.replace('_', ' ')}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(sale.total)}</TableCell>
                  <TableCell>
                    <Badge variant={sale.status === 'completed' ? 'success' : 'destructive'}>
                      {sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSaleId(sale.id)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sales?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No sales recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!selectedSaleId} onOpenChange={(open) => !open && setSelectedSaleId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center pr-8">
                Sale Detail
                {saleDetail?.status === 'completed' && (
                  <Button variant="destructive" size="sm" onClick={() => handleVoid(saleDetail.id)}>
                    <Ban className="w-4 h-4 mr-2" /> Void Sale
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {isLoadingDetail || !saleDetail ? (
              <div className="py-8 space-y-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div>
            ) : (
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
                  <div className="flex justify-between"><span>Invoice:</span> <span>{saleDetail.invoiceNumber}</span></div>
                  <div className="flex justify-between"><span>Date:</span> <span>{formatDate(saleDetail.createdAt)}</span></div>
                  <div className="flex justify-between"><span>Cashier:</span> <span>{saleDetail.cashierName}</span></div>
                  <div className="flex justify-between"><span>Customer:</span> <span>{saleDetail.customerName || '-'}</span></div>
                  <div className="flex justify-between"><span>Status:</span> <span className="uppercase font-bold">{saleDetail.status}</span></div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Items</h4>
                  <div className="border rounded-md divide-y text-sm">
                    {saleDetail.items.map(item => (
                      <div key={item.id} className="p-3 flex justify-between items-center bg-card">
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-muted-foreground text-xs">{item.quantity} x {formatCurrency(item.unitPrice)}</div>
                        </div>
                        <div className="font-mono">{formatCurrency(item.lineTotal)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-sm pt-4 border-t">
                  <div className="flex justify-between"><span>Subtotal</span> <span className="font-mono">{formatCurrency(saleDetail.subtotal)}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>Total</span> <span className="font-mono text-primary">{formatCurrency(saleDetail.total)}</span></div>
                  <div className="flex justify-between text-muted-foreground mt-2"><span>Paid ({saleDetail.paymentMethod})</span> <span className="font-mono">{formatCurrency(saleDetail.amountPaid)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Change</span> <span className="font-mono">{formatCurrency(saleDetail.changeDue)}</span></div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
