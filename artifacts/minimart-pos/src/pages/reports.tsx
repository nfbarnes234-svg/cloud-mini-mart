import { MainLayout } from "@/components/layout/main-layout";
import { useGetSalesByCategory, useGetSalesByPaymentMethod, useGetSalesByCashier } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Reports() {
  const { data: catSales, isLoading: loadingCat } = useGetSalesByCategory();
  const { data: paySales, isLoading: loadingPay } = useGetSalesByPaymentMethod();
  const { data: cashierSales, isLoading: loadingCashier } = useGetSalesByCashier();

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into sales distribution and team performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sales by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
              <CardDescription>Revenue distribution across product groups</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCat ? <Skeleton className="h-[300px] w-full" /> : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={catSales}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        {catSales?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-4 space-y-2">
                {catSales?.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span>{entry.category}</span>
                    </div>
                    <span className="font-mono font-medium">{formatCurrency(entry.total)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sales by Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>How customers are paying</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPay ? <Skeleton className="h-[300px] w-full" /> : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paySales} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="paymentMethod" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} style={{ textTransform: 'capitalize' }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={v => `₵${v}`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: 'hsl(var(--muted))' }} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cashier Performance */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Cashier Performance</CardTitle>
              <CardDescription>Sales volume and transactions per staff member</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCashier ? <Skeleton className="h-40 w-full" /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cashierSales?.map((cashier, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{cashier.cashierName}</div>
                        <div className="text-sm text-muted-foreground">{cashier.transactions} transactions</div>
                      </div>
                      <div className="text-lg font-mono font-bold text-primary">
                        {formatCurrency(cashier.total)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
