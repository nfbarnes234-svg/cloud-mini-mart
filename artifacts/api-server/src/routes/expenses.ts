import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import {
  ListExpensesResponse,
  CreateExpenseBody,
  CreateExpenseResponse,
} from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/expenses",
  requireRole("owner", "manager"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(expensesTable)
      .orderBy(desc(expensesTable.createdAt));
    res.json(
      ListExpensesResponse.parse(
        rows.map((row) => ({ ...row, amount: Number(row.amount) })),
      ),
    );
  },
);

router.post(
  "/expenses",
  requireRole("owner", "manager"),
  async (req, res): Promise<void> => {
    const parsed = CreateExpenseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [expense] = await db
      .insert(expensesTable)
      .values({ ...parsed.data, amount: String(parsed.data.amount) })
      .returning();

    res
      .status(201)
      .json(
        CreateExpenseResponse.parse({
          ...expense,
          amount: Number(expense.amount),
        }),
      );
  },
);

export default router;
