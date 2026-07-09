import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set for JWT signing.");
}

const JWT_SECRET: string = process.env.SESSION_SECRET;

export const AUTH_COOKIE_NAME = "minimart_session";

export type Role = "owner" | "manager" | "cashier";

export interface AuthTokenPayload {
  userId: number;
}

export function signAuthToken(userId: number): string {
  return jwt.sign({ userId } satisfies AuthTokenPayload, JWT_SECRET, {
    expiresIn: "30d",
  });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: {
        id: number;
        name: string;
        email: string;
        role: Role;
        active: boolean;
        createdAt: Date;
      };
    }
  }
}

export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token || typeof token !== "string") {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId));

    if (user && user.active) {
      req.currentUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as Role,
        active: user.active,
        createdAt: user.createdAt,
      };
    }
  } catch {
    // Invalid/expired token: treat as unauthenticated.
  }

  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.currentUser) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.currentUser) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.currentUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
