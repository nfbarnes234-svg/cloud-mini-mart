import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  CreateProductBody,
  CreateProductResponse,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
  AdjustProductStockParams,
  AdjustProductStockBody,
  AdjustProductStockResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

function productRow() {
  return {
    id: productsTable.id,
    name: productsTable.name,
    sku: productsTable.sku,
    barcode: productsTable.barcode,
    categoryId: productsTable.categoryId,
    categoryName: categoriesTable.name,
    purchasePrice: productsTable.purchasePrice,
    sellingPrice: productsTable.sellingPrice,
    stock: productsTable.stock,
    minStock: productsTable.minStock,
    unit: productsTable.unit,
    createdAt: productsTable.createdAt,
  };
}

function serializeProductRow<T extends { purchasePrice: string; sellingPrice: string }>(
  row: T,
) {
  return {
    ...row,
    purchasePrice: Number(row.purchasePrice),
    sellingPrice: Number(row.sellingPrice),
  };
}

router.get("/products", requireAuth, async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const base = db
    .select(productRow())
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id));

  const rows = query.data.search
    ? await base
        .where(
          or(
            ilike(productsTable.name, `%${query.data.search}%`),
            ilike(productsTable.sku, `%${query.data.search}%`),
            ilike(productsTable.barcode, `%${query.data.search}%`),
          ),
        )
        .orderBy(productsTable.name)
    : await base.orderBy(productsTable.name);

  res.json(ListProductsResponse.parse(rows.map(serializeProductRow)));
});

router.post(
  "/products",
  requireRole("owner", "manager"),
  async (req, res): Promise<void> => {
    const parsed = CreateProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const sku = `SKU-${Date.now().toString(36).toUpperCase()}`;

    const [product] = await db
      .insert(productsTable)
      .values({
        ...parsed.data,
        sku,
        purchasePrice: String(parsed.data.purchasePrice),
        sellingPrice: String(parsed.data.sellingPrice),
      })
      .returning();

    const [row] = await db
      .select(productRow())
      .from(productsTable)
      .leftJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.id),
      )
      .where(eq(productsTable.id, product.id));

    res.status(201).json(CreateProductResponse.parse(serializeProductRow(row)));
  },
);

router.get("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select(productRow())
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(GetProductResponse.parse(serializeProductRow(row)));
});

router.patch(
  "/products/:id",
  requireRole("owner", "manager"),
  async (req, res): Promise<void> => {
    const params = UpdateProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { purchasePrice, sellingPrice, ...rest } = parsed.data;
    const updates: Record<string, unknown> = { ...rest };
    if (purchasePrice !== undefined) updates.purchasePrice = String(purchasePrice);
    if (sellingPrice !== undefined) updates.sellingPrice = String(sellingPrice);

    const [product] = await db
      .update(productsTable)
      .set(updates)
      .where(eq(productsTable.id, params.data.id))
      .returning();

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const [row] = await db
      .select(productRow())
      .from(productsTable)
      .leftJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.id),
      )
      .where(eq(productsTable.id, product.id));

    res.json(UpdateProductResponse.parse(serializeProductRow(row)));
  },
);

router.delete(
  "/products/:id",
  requireRole("owner", "manager"),
  async (req, res): Promise<void> => {
    const params = DeleteProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [product] = await db
      .delete(productsTable)
      .where(eq(productsTable.id, params.data.id))
      .returning();

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.sendStatus(204);
  },
);

router.post(
  "/products/:id/adjust-stock",
  requireRole("owner", "manager"),
  async (req, res): Promise<void> => {
    const params = AdjustProductStockParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = AdjustProductStockBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [product] = await db
      .update(productsTable)
      .set({
        stock: sql`${productsTable.stock} + ${parsed.data.quantityChange}`,
      })
      .where(eq(productsTable.id, params.data.id))
      .returning();

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const [row] = await db
      .select(productRow())
      .from(productsTable)
      .leftJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.id),
      )
      .where(eq(productsTable.id, product.id));

    res.json(AdjustProductStockResponse.parse(serializeProductRow(row)));
  },
);

export default router;
