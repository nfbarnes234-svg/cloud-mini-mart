import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, GetMeResponse, LoginResponse } from "@workspace/api-zod";
import { AUTH_COOKIE_NAME, requireAuth, signAuthToken } from "../lib/auth";

const router: IRouter = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email.toLowerCase()));

  if (!user || !user.active) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signAuthToken(user.id);
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: THIRTY_DAYS_MS,
  });

  res.json(
    LoginResponse.parse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    }),
  );
});

router.post("/auth/logout", (_req, res): void => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.sendStatus(204);
});

router.get("/auth/me", requireAuth, (req, res): void => {
  const user = req.currentUser!;
  res.json(GetMeResponse.parse(user));
});

export default router;
