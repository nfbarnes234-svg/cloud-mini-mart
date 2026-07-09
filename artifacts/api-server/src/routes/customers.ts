import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  ListCustomersQueryParams,
  ListCustomersResponse,
  CreateCustomerBody,
  CreateCustomerResponse,
  GetCustomerParams,
  GetCustomerResponse,
  UpdateCustomerParams,
  UpdateCustomerBody,
  UpdateCustomerResponse,
  DeleteCustomerParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function serializeCustomer<T extends { outstandingBalance: string }>(row: T) {
  return { ...row, outstandingBalance: Number(row.outstandingBalance) };
}

router.get("/customers", requireAuth, async (req, res): Promise<void> => {
  const query = ListCustomersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = query.data.search
    ? await db
        .select()
        .from(customersTable)
        .where(
          or(
            ilike(customersTable.name, `%${query.data.search}%`),
            ilike(customersTable.phone, `%${query.data.search}%`),
          ),
        )
        .orderBy(customersTable.name)
    : await db.select().from(customersTable).orderBy(customersTable.name);

  res.json(ListCustomersResponse.parse(rows.map(serializeCustomer)));
});

router.post("/customers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [customer] = await db
    .insert(customersTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(CreateCustomerResponse.parse(serializeCustomer(customer)));
});

router.get("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, params.data.id));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(GetCustomerResponse.parse(serializeCustomer(customer)));
});

router.patch("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { outstandingBalance, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };
  if (outstandingBalance !== undefined)
    updates.outstandingBalance = String(outstandingBalance);

  const [customer] = await db
    .update(customersTable)
    .set(updates)
    .where(eq(customersTable.id, params.data.id))
    .returning();

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(UpdateCustomerResponse.parse(serializeCustomer(customer)));
});

router.delete(
  "/customers/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteCustomerParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [customer] = await db
      .delete(customersTable)
      .where(eq(customersTable.id, params.data.id))
      .returning();

    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;
