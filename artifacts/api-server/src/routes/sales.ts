import { Router, type IRouter } from "express";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  db,
  salesTable,
  saleItemsTable,
  productsTable,
  usersTable,
  customersTable,
} from "@workspace/db";
import {
  ListSalesQueryParams,
  ListSalesResponse,
  CreateSaleBody,
  CreateSaleResponse,
  GetSaleParams,
  GetSaleResponse,
  VoidSaleParams,
  VoidSaleResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

async function loadSale(saleId: number) {
  const [sale] = await db
    .select({
      id: salesTable.id,
      invoiceNumber: salesTable.invoiceNumber,
      cashierId: salesTable.cashierId,
      cashierName: usersTable.name,
      customerId: salesTable.customerId,
      customerName: customersTable.name,
      subtotal: salesTable.subtotal,
      discount: salesTable.discount,
      tax: salesTable.tax,
      total: salesTable.total,
      amountPaid: salesTable.amountPaid,
      changeDue: salesTable.changeDue,
      paymentMethod: salesTable.paymentMethod,
      status: salesTable.status,
      createdAt: salesTable.createdAt,
    })
    .from(salesTable)
    .innerJoin(usersTable, eq(salesTable.cashierId, usersTable.id))
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .where(eq(salesTable.id, saleId));

  if (!sale) return null;

  const items = await db
    .select()
    .from(saleItemsTable)
    .where(eq(saleItemsTable.saleId, saleId));

  return serializeSale(sale, items);
}

function serializeSale<
  S extends {
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    amountPaid: string;
    changeDue: string;
  },
  I extends {
    unitPrice: string;
    discount: string;
    lineTotal: string;
  },
>(sale: S, items: I[]) {
  return {
    ...sale,
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    tax: Number(sale.tax),
    total: Number(sale.total),
    amountPaid: Number(sale.amountPaid),
    changeDue: Number(sale.changeDue),
    items: items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      lineTotal: Number(item.lineTotal),
    })),
  };
}

router.get("/sales", requireAuth, async (req, res): Promise<void> => {
  const query = ListSalesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.from) conditions.push(gte(salesTable.createdAt, new Date(query.data.from)));
  if (query.data.to) conditions.push(lte(salesTable.createdAt, new Date(query.data.to)));

  const baseQuery = db
    .select({
      id: salesTable.id,
      invoiceNumber: salesTable.invoiceNumber,
      cashierId: salesTable.cashierId,
      cashierName: usersTable.name,
      customerId: salesTable.customerId,
      customerName: customersTable.name,
      subtotal: salesTable.subtotal,
      discount: salesTable.discount,
      tax: salesTable.tax,
      total: salesTable.total,
      amountPaid: salesTable.amountPaid,
      changeDue: salesTable.changeDue,
      paymentMethod: salesTable.paymentMethod,
      status: salesTable.status,
      createdAt: salesTable.createdAt,
    })
    .from(salesTable)
    .innerJoin(usersTable, eq(salesTable.cashierId, usersTable.id))
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id));

  const sales = conditions.length
    ? await baseQuery.where(and(...conditions)).orderBy(desc(salesTable.createdAt))
    : await baseQuery.orderBy(desc(salesTable.createdAt));

  const salesWithItems = await Promise.all(
    sales.map(async (sale) => {
      const items = await db
        .select()
        .from(saleItemsTable)
        .where(eq(saleItemsTable.saleId, sale.id));
      return serializeSale(sale, items);
    }),
  );

  res.json(ListSalesResponse.parse(salesWithItems));
});

router.post(
  "/sales",
  requireRole("owner", "manager", "cashier"),
  async (req, res): Promise<void> => {
    const parsed = CreateSaleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const cashierId = req.currentUser!.id;
    const { items, customerId, discount = 0, tax = 0, paymentMethod, amountPaid } =
      parsed.data;

    if (items.length === 0) {
      res.status(400).json({ error: "Sale must include at least one item" });
      return;
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        res.status(400).json({ error: "Item quantity must be positive" });
        return;
      }
      if ((item.discount ?? 0) < 0) {
        res.status(400).json({ error: "Item discount cannot be negative" });
        return;
      }
    }

    if (discount < 0 || tax < 0) {
      res.status(400).json({ error: "Discount and tax cannot be negative" });
      return;
    }

    const productIds = items.map((item) => item.productId);
    const products = await db
      .select()
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Prices are always derived from the current DB record, never trusted
    // from the client, to prevent price tampering.
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        res.status(400).json({ error: `Product ${item.productId} not found` });
        return;
      }
      if (product.stock < item.quantity) {
        res
          .status(400)
          .json({ error: `Insufficient stock for ${product.name}` });
        return;
      }
      const itemDiscount = item.discount ?? 0;
      if (itemDiscount > Number(product.sellingPrice) * item.quantity) {
        res
          .status(400)
          .json({ error: `Discount exceeds line total for ${product.name}` });
        return;
      }
    }

    const subtotal = items.reduce((sum, item) => {
      const product = productMap.get(item.productId)!;
      return (
        sum +
        Number(product.sellingPrice) * item.quantity -
        (item.discount ?? 0)
      );
    }, 0);
    const total = Math.max(0, subtotal - discount + tax);

    if (amountPaid < total) {
      res
        .status(400)
        .json({ error: "Amount paid is less than the sale total" });
      return;
    }

    const changeDue = amountPaid - total;
    const invoiceNumber = `INV-${Date.now()}`;

    try {
      const sale = await db.transaction(async (tx) => {
        const [createdSale] = await tx
          .insert(salesTable)
          .values({
            invoiceNumber,
            cashierId,
            customerId: customerId ?? null,
            subtotal: String(subtotal),
            discount: String(discount),
            tax: String(tax),
            total: String(total),
            amountPaid: String(amountPaid),
            changeDue: String(changeDue),
            paymentMethod,
          })
          .returning();

        for (const item of items) {
          const product = productMap.get(item.productId)!;
          const unitPrice = Number(product.sellingPrice);
          const lineTotal = unitPrice * item.quantity - (item.discount ?? 0);
          await tx.insert(saleItemsTable).values({
            saleId: createdSale.id,
            productId: item.productId,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: String(unitPrice),
            discount: String(item.discount ?? 0),
            lineTotal: String(lineTotal),
          });

          // Conditional decrement guards against overselling under
          // concurrent checkouts: the update only succeeds while enough
          // stock remains at the moment it is applied.
          const updated = await tx
            .update(productsTable)
            .set({
              stock: sql`${productsTable.stock} - ${item.quantity}`,
            })
            .where(
              and(
                eq(productsTable.id, item.productId),
                sql`${productsTable.stock} >= ${item.quantity}`,
              ),
            )
            .returning({ id: productsTable.id });

          if (updated.length === 0) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
        }

        return createdSale;
      });

      const fullSale = await loadSale(sale.id);
      res.status(201).json(CreateSaleResponse.parse(fullSale));
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Insufficient stock")) {
        res.status(409).json({ error: err.message });
        return;
      }
      throw err;
    }
  },
);

router.get("/sales/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const sale = await loadSale(params.data.id);
  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }

  res.json(GetSaleResponse.parse(sale));
});

router.post(
  "/sales/:id/void",
  requireRole("owner", "manager"),
  async (req, res): Promise<void> => {
    const params = VoidSaleParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const existing = await loadSale(params.data.id);
    if (!existing) {
      res.status(404).json({ error: "Sale not found" });
      return;
    }

    if (existing.status === "voided") {
      res.json(VoidSaleResponse.parse(existing));
      return;
    }

    const voided = await db.transaction(async (tx) => {
      // Conditionally transition status only while it is still "completed"
      // so concurrent void requests cannot double-restock inventory.
      const updatedSales = await tx
        .update(salesTable)
        .set({ status: "voided" })
        .where(
          and(
            eq(salesTable.id, params.data.id),
            eq(salesTable.status, "completed"),
          ),
        )
        .returning({ id: salesTable.id });

      if (updatedSales.length === 0) {
        return false;
      }

      for (const item of existing.items) {
        await tx
          .update(productsTable)
          .set({ stock: sql`${productsTable.stock} + ${item.quantity}` })
          .where(eq(productsTable.id, item.productId));
      }

      return true;
    });

    if (!voided) {
      const current = await loadSale(params.data.id);
      res.json(VoidSaleResponse.parse(current));
      return;
    }

    const sale = await loadSale(params.data.id);
    res.json(VoidSaleResponse.parse(sale));
  },
);

export default router;
