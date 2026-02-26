import { Request, Response, NextFunction } from "express";
import { ErrorCode, ErrorEnvelope } from "../types";

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  requestId?: string,
  details?: Record<string, unknown>
): void {
  const body: ErrorEnvelope = {
    error: { code, message, ...(details && { details }), ...(requestId && { requestId }) },
  };
  res.status(status).json(body);
}

// Express 4 global error handler (4-arg signature required)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  console.error("[unhandled]", err);
  sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred", req.requestId);
}
