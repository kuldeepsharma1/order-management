import { Request, Response, NextFunction } from "express";

export const requireTenant = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenantId = req.headers["x-tenant-id"] as string;

  if (!tenantId) {
    return res.status(400).json({
      message: "Missing x-tenant-id header. Tenant context is required.",
    });
  }

  // Store tenantId in res.locals for controllers to access safely
  res.locals.tenantId = tenantId;
  next();
};