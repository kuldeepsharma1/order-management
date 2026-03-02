// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { Prisma } from "../../generated/prisma/client";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Log the error 
  const errorLog = {
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    tenantId: res.locals.tenantId || "UNKNOWN",
    message: err.message,
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
  };
  console.error(JSON.stringify(errorLog, null, 2));

  // 2. Handle Zod Validation Errors (400 Bad Request)
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map(e => ({
        field: e.path.join("."),
        message: e.message
      })),
    });
  }

  // 3. Handle Prisma Known Request Errors (e.g., Unique constraint failed)
if (err instanceof Prisma.PrismaClientKnownRequestError) {
  if (err.code.startsWith('P2')) {
    return res.status(409).json({
      message: "Database conflict error",
      code: err.code,
      meta: err.meta // Optional: gives extra details like which field caused the conflict
    });
  }
}

  // 4. Catch-all for unhandled errors (500 Internal Server Error)
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal Server Error" : err.message,
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};