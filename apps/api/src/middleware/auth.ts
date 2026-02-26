import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "./errorHandler";

export interface AuthPayload {
  sub: string;       // user id
  role: "admin" | "editor" | "viewer" | "external_view_only";
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      auth: AuthPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    sendError(res, 401, "UNAUTHORIZED", "Missing or invalid Authorization header", req.requestId);
    return;
  }

  const token = header.slice(7);
  try {
    req.auth = jwt.verify(token, JWT_SECRET) as AuthPayload;
    next();
  } catch {
    sendError(res, 401, "UNAUTHORIZED", "Invalid or expired token", req.requestId);
  }
}
