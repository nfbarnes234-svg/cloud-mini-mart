import { useGetCashierDashboardSummary } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { DollarSign, CreditCard, CalendarDays, ShoppingCart, Receipt } from "lucide-react";

export default function CashierDashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading } = useGetCashierDashboardSummary();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!summary) return null;

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name?.split(" ")[0]}</h1>
            <p className="text-muted-foreground mt-1">Here's how your shift is going today.</p>
          </div>
          <Link href="/pos">
            <Button size="lg">
              <ShoppingCart className="w-4 h-4 mr-2" /> Go to POS
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">My Sales Today</CardTitle>
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono tracking-tight">{formatCurrency(summary.mySalesToday)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total value of sales you completed today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transactions Today</CardTitle>
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono tracking-tight">{summary.myTransactionsToday}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed checkouts today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono tracking-tight">{formatCurrency(summary.myWeekSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">Your total sales over the last 7 days</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" /> My Recent Sales
            </CardTitle>
            <CardDescription>Your last 5 completed transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.recentSales.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No sales yet. Head to the POS to make your first sale.
              </div>
            ) : (
              <div className="space-y-4">
                {summary.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between border-b border-border last:border-0 pb-3 last:pb-0">
                    <div>
                      <div className="text-sm font-medium">{sale.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {sale.itemCount} item{sale.itemCount === 1 ? "" : "s"} &middot; {new Date(sale.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-medium">{formatCurrency(sale.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
