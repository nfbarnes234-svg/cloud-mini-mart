import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  salesTable,
  saleItemsTable,
  productsTable,
  categoriesTable,
  usersTable,
} from "@workspace/db";
import {
  GetSalesByCategoryResponse,
  GetSalesByCashierResponse,
  GetSalesByPaymentMethodResponse,
} from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/reports/sales-by-category",
  requireRole("owner", "manager"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        category: sql<string>`coalesce(${categoriesTable.name}, 'Uncategorized')`,
        total: sql<string>`coalesce(sum(${saleItemsTable.lineTotal}), 0)`,
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .innerJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(eq(salesTable.status, "completed"))
      .groupBy(categoriesTable.name)
      .orderBy(sql`sum(${saleItemsTable.lineTotal}) desc`);

    res.json(
      GetSalesByCategoryResponse.parse(
        rows.map((r) => ({ category: r.category, total: Number(r.total) })),
      ),
    );
  },
);

router.get(
  "/reports/sales-by-cashier",
  requireRole("owner", "manager"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        cashierName: usersTable.name,
        total: sql<string>`coalesce(sum(${salesTable.total}), 0)`,
        transactions: sql<string>`count(*)`,
      })
      .from(salesTable)
      .innerJoin(usersTable, eq(salesTable.cashierId, usersTable.id))
      .where(eq(salesTable.status, "completed"))
      .groupBy(usersTable.name)
      .orderBy(sql`sum(${salesTable.total}) desc`);

    res.json(
      GetSalesByCashierResponse.parse(
        rows.map((r) => ({
          cashierName: r.cashierName,
          total: Number(r.total),
          transactions: Number(r.transactions),
        })),
      ),
    );
  },
);

router.get(
  "/reports/sales-by-payment-method",
  requireRole("owner", "manager"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        paymentMethod: salesTable.paymentMethod,
        total: sql<string>`coalesce(sum(${salesTable.total}), 0)`,
      })
      .from(salesTable)
      .where(eq(salesTable.status, "completed"))
      .groupBy(salesTable.paymentMethod)
      .orderBy(sql`sum(${salesTable.total}) desc`);

    res.json(
      GetSalesByPaymentMethodResponse.parse(
        rows.map((r) => ({
          paymentMethod: r.paymentMethod,
          total: Number(r.total),
        })),
      ),
    );
  },
);

export default router;
