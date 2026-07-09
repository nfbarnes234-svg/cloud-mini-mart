import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import {
  CreateUserBody,
  CreateUserResponse,
  ListUsersResponse,
  UpdateUserParams,
  UpdateUserBody,
  UpdateUserResponse,
  DeleteUserParams,
} from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/users",
  requireRole("owner", "manager"),
  async (_req, res): Promise<void> => {
    const users = await db
      .select()
      .from(usersTable)
      .orderBy(usersTable.createdAt);
    res.json(ListUsersResponse.parse(users));
  },
);

router.post(
  "/users",
  requireRole("owner"),
  async (req, res): Promise<void> => {
    const parsed = CreateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        role: parsed.data.role,
      })
      .returning();

    res.status(201).json(CreateUserResponse.parse(user));
  },
);

router.patch(
  "/users/:id",
  requireRole("owner"),
  async (req, res): Promise<void> => {
    const params = UpdateUserParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { password, email, ...rest } = parsed.data;
    const updates: Record<string, unknown> = { ...rest };
    if (email) updates.email = email.toLowerCase();
    if (password) updates.passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, params.data.id))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(UpdateUserResponse.parse(user));
  },
);

router.delete(
  "/users/:id",
  requireRole("owner"),
  async (req, res): Promise<void> => {
    const params = DeleteUserParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [user] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, params.data.id))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;
