import { Router, type IRouter } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  db,
  salesTable,
  saleItemsTable,
  productsTable,
  expensesTable,
} from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetSalesChartQueryParams,
  GetSalesChartResponse,
  GetTopProductsQueryParams,
  GetTopProductsResponse,
  GetLowStockProductsResponse,
} from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

router.get(
  "/dashboard/summary",
  requireRole("owner", "manager"),
  async (_req, res): Promise<void> => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    async function sumSalesSince(since: Date): Promise<number> {
      const [row] = await db
        .select({ total: sql<string>`coalesce(sum(${salesTable.total}), 0)` })
        .from(salesTable)
        .where(
          and(
            gte(salesTable.createdAt, since),
            eq(salesTable.status, "completed"),
          ),
        );
      return Number(row?.total ?? 0);
    }

    const [todaySales, weekSales, monthSales, yearSales] = await Promise.all([
      sumSalesSince(today),
      sumSalesSince(weekStart),
      sumSalesSince(monthStart),
      sumSalesSince(yearStart),
    ]);

    const [profitRow] = await db
      .select({
        profit: sql<string>`coalesce(sum((${saleItemsTable.unitPrice} - ${productsTable.purchasePrice}) * ${saleItemsTable.quantity}), 0)`,
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .innerJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .where(
        and(
          gte(salesTable.createdAt, today),
          eq(salesTable.status, "completed"),
        ),
      );

    const [expensesRow] = await db
      .select({
        total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)`,
      })
      .from(expensesTable)
      .where(gte(expensesTable.createdAt, today));

    const [inventoryRow] = await db
      .select({
        value: sql<string>`coalesce(sum(${productsTable.sellingPrice} * ${productsTable.stock}), 0)`,
      })
      .from(productsTable);

    const [lowStockRow] = await db
      .select({ count: sql<string>`count(*)` })
      .from(productsTable)
      .where(sql`${productsTable.stock} <= ${productsTable.minStock} and ${productsTable.stock} > 0`);

    const [outOfStockRow] = await db
      .select({ count: sql<string>`count(*)` })
      .from(productsTable)
      .where(sql`${productsTable.stock} <= 0`);

    const [transactionsRow] = await db
      .select({ count: sql<string>`count(*)` })
      .from(salesTable)
      .where(
        and(
          gte(salesTable.createdAt, today),
          eq(salesTable.status, "completed"),
        ),
      );

    res.json(
      GetDashboardSummaryResponse.parse({
        todaySales,
        weekSales,
        monthSales,
        yearSales,
        profitToday: Number(profitRow?.profit ?? 0),
        expensesToday: Number(expensesRow?.total ?? 0),
        inventoryValue: Number(inventoryRow?.value ?? 0),
        lowStockCount: Number(lowStockRow?.count ?? 0),
        outOfStockCount: Number(outOfStockRow?.count ?? 0),
        transactionsToday: Number(transactionsRow?.count ?? 0),
      }),
    );
  },
);

router.get(
  "/dashboard/sales-chart",
  requireRole("owner", "manager"),
  async (req, res): Promise<void> => {
    const query = GetSalesChartQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }

    const days = query.data.days ?? 14;
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const rows = await db
      .select({
        date: sql<string>`to_char(${salesTable.createdAt}, 'YYYY-MM-DD')`,
        total: sql<string>`coalesce(sum(${salesTable.total}), 0)`,
      })
      .from(salesTable)
      .where(
        and(
          gte(salesTable.createdAt, since),
          eq(salesTable.status, "completed"),
        ),
      )
      .groupBy(sql`to_char(${salesTable.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${salesTable.createdAt}, 'YYYY-MM-DD')`);

    const byDate = new Map(rows.map((r) => [r.date, Number(r.total)]));
    const points = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      points.push({ date: key, total: byDate.get(key) ?? 0 });
    }

    res.json(GetSalesChartResponse.parse(points));
  },
);

router.get(
  "/dashboard/top-products",
  requireRole("owner", "manager"),
  async (req, res): Promise<void> => {
    const query = GetTopProductsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }

    const limit = query.data.limit ?? 5;

    const rows = await db
      .select({
        productId: saleItemsTable.productId,
        name: productsTable.name,
        quantitySold: sql<string>`coalesce(sum(${saleItemsTable.quantity}), 0)`,
        revenue: sql<string>`coalesce(sum(${saleItemsTable.lineTotal}), 0)`,
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .innerJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .where(eq(salesTable.status, "completed"))
      .groupBy(saleItemsTable.productId, productsTable.name)
      .orderBy(sql`sum(${saleItemsTable.quantity}) desc`)
      .limit(limit);

    res.json(
      GetTopProductsResponse.parse(
        rows.map((r) => ({
          productId: r.productId,
          name: r.name,
          quantitySold: Number(r.quantitySold),
          revenue: Number(r.revenue),
        })),
      ),
    );
  },
);

router.get(
  "/dashboard/low-stock",
  requireRole("owner", "manager"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(productsTable)
      .where(sql`${productsTable.stock} <= ${productsTable.minStock}`)
      .orderBy(productsTable.stock);

    res.json(
      GetLowStockProductsResponse.parse(
        rows.map((r) => ({
          ...r,
          categoryName: null,
          purchasePrice: Number(r.purchasePrice),
          sellingPrice: Number(r.sellingPrice),
        })),
      ),
    );
  },
);

export default router;
