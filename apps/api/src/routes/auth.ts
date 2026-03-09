import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { pool } from "../db/pool";
import { sendError } from "../middleware/errorHandler";

const scryptAsync = promisify(scrypt);

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const TOKEN_EXPIRY = "7d";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuf = Buffer.from(hash, "hex");
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

function signToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function userResponse(row: { id: string; email: string; name: string; role: string }) {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

// ─── Validation schemas ──────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const acceptInviteSchema = z.object({
  inviteToken: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const authRouter = Router();

// POST /login
authRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", parsed.error.errors[0].message, req.requestId);
    return;
  }

  const { email, password } = parsed.data;

  try {
    const result = await pool.query(
      "SELECT id, email, name, role, password_hash FROM users WHERE email = $1",
      [email],
    );

    const user = result.rows[0];
    if (!user) {
      sendError(res, 401, "UNAUTHORIZED", "Invalid email or password", req.requestId);
      return;
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      sendError(res, 401, "UNAUTHORIZED", "Invalid email or password", req.requestId);
      return;
    }

    const token = signToken(user.id, user.role);
    res.json({ token, user: userResponse(user) });
  } catch (err) {
    console.error("[auth/login]", err);
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred", req.requestId);
  }
});

// POST /register
authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", parsed.error.errors[0].message, req.requestId);
    return;
  }

  const { email, password, name } = parsed.data;

  try {
    // Check for existing user
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      sendError(res, 409, "CONFLICT", "A user with this email already exists", req.requestId);
      return;
    }

    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'viewer')
       RETURNING id, email, name, role`,
      [email, passwordHash, name],
    );

    const user = result.rows[0];
    const token = signToken(user.id, user.role);
    res.status(201).json({ token, user: userResponse(user) });
  } catch (err) {
    console.error("[auth/register]", err);
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred", req.requestId);
  }
});

// POST /forgot-password
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", parsed.error.errors[0].message, req.requestId);
    return;
  }

  const { email } = parsed.data;

  try {
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (result.rows.length > 0) {
      const resetToken = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [result.rows[0].id, resetToken, expiresAt],
      );

      // TODO: send email with resetToken
    }

    // Always return 204 — don't leak whether the email exists
    res.status(204).send();
  } catch (err) {
    console.error("[auth/forgot-password]", err);
    // Still return 204 to avoid leaking info on error
    res.status(204).send();
  }
});

// POST /reset-password
authRouter.post("/reset-password", async (req: Request, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", parsed.error.errors[0].message, req.requestId);
    return;
  }

  const { token, password } = parsed.data;

  try {
    const result = await pool.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [token],
    );

    if (result.rows.length === 0) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid or expired reset token", req.requestId);
      return;
    }

    const userId = result.rows[0].user_id;
    const passwordHash = await hashPassword(password);

    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, userId]);
    await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1", [token]);

    res.status(204).send();
  } catch (err) {
    console.error("[auth/reset-password]", err);
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred", req.requestId);
  }
});

// POST /accept-invite
authRouter.post("/accept-invite", async (req: Request, res: Response) => {
  const parsed = acceptInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", parsed.error.errors[0].message, req.requestId);
    return;
  }

  const { inviteToken, password, name } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const inviteResult = await client.query(
      `SELECT id, email, role FROM invites
       WHERE token = $1 AND accepted_at IS NULL`,
      [inviteToken],
    );

    if (inviteResult.rows.length === 0) {
      await client.query("ROLLBACK");
      sendError(res, 400, "VALIDATION_ERROR", "Invalid or expired invite token", req.requestId);
      return;
    }

    const invite = inviteResult.rows[0];
    const passwordHash = await hashPassword(password);

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role`,
      [invite.email, passwordHash, name, invite.role],
    );

    const user = userResult.rows[0];

    await client.query("UPDATE invites SET accepted_at = NOW() WHERE id = $1", [invite.id]);

    await client.query("COMMIT");

    const token = signToken(user.id, user.role);
    res.status(201).json({ token, user: userResponse(user) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[auth/accept-invite]", err);
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred", req.requestId);
  } finally {
    client.release();
  }
});
