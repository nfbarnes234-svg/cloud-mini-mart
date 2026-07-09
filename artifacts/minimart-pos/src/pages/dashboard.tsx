import { useGetDashboardSummary, useGetSalesChart, useGetTopProducts } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MainLayout } from "@/components/layout/main-layout";
import { 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  PackageSearch,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Wallet
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: chartData, isLoading: loadingChart } = useGetSalesChart({ days: 7 });
  const { data: topProducts, isLoading: loadingTop } = useGetTopProducts({ limit: 5 });

  if (loadingSummary) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your store's performance.</p>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard 
            title="Today's Sales" 
            value={formatCurrency(summary.todaySales)}
            icon={<DollarSign className="w-4 h-4 text-primary" />}
            trend={summary.todaySales > summary.weekSales / 7 ? "up" : "down"}
            description="vs daily average"
          />
          <SummaryCard 
            title="Today's Profit" 
            value={formatCurrency(summary.profitToday)}
            icon={<TrendingUp className="w-4 h-4 text-success" />}
            description="Gross profit"
          />
          <SummaryCard 
            title="Transactions" 
            value={summary.transactionsToday.toString()}
            icon={<CreditCard className="w-4 h-4 text-blue-500" />}
            description="Completed today"
          />
          <SummaryCard 
            title="Inventory Value" 
            value={formatCurrency(summary.inventoryValue)}
            icon={<Wallet className="w-4 h-4 text-orange-500" />}
            description="Total selling price"
          />
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Last 7 days of sales performance</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingChart ? (
                <Skeleton className="w-full h-[300px]" />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData || []} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `₵${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: "hsl(var(--primary))" }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>By revenue generated</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTop ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-6">
                  {topProducts?.map((product) => (
                    <div key={product.productId} className="flex items-center">
                      <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
                        <PackageSearch className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="ml-4 space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.quantitySold} units sold</p>
                      </div>
                      <div className="font-mono text-sm font-medium">
                        {formatCurrency(product.revenue)}
                      </div>
                    </div>
                  ))}
                  {(!topProducts || topProducts.length === 0) && (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      No sales data available yet.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <Card className="border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                {summary.lowStockCount}
              </div>
              <p className="text-sm text-orange-600/80 dark:text-orange-400/80 mt-1">
                Products below minimum threshold
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Out of Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                {summary.outOfStockCount}
              </div>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                Products requiring immediate restock
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

function SummaryCard({ title, value, icon, description, trend }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
        <div className="flex items-center mt-1 text-xs text-muted-foreground">
          {trend === "up" && <ArrowUpRight className="w-3 h-3 text-success mr-1" />}
          {trend === "down" && <ArrowDownRight className="w-3 h-3 text-destructive mr-1" />}
          <span className={trend === "up" ? "text-success font-medium" : trend === "down" ? "text-destructive font-medium" : ""}>
            {description}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
