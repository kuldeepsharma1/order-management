import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

// Validation schemas using Zod
const createTenantSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1, "Tenant name cannot be empty").optional(),
  currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// GET /api/v1/tenants (System Admin Level)
export const getTenants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(tenants);
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/tenants/:id
export const getTenantById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const tenant = await prisma.tenant.findFirst({
      where: { id, deletedAt: null },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    res.status(200).json(tenant);
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/tenants (Onboarding a new organization)
export const createTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createTenantSchema.parse(req.body);

    const tenant = await prisma.tenant.create({
      data: validatedData,
    });

    res.status(201).json({
      message: "Tenant created successfully",
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/tenants/:id
export const updateTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const validatedData = updateTenantSchema.parse(req.body);

    // Verify exists
    const existingTenant = await prisma.tenant.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingTenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: validatedData,
    });

    res.status(200).json({
      message: "Tenant updated successfully",
      data: updatedTenant,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/tenants/:id
export const deleteTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    const existingTenant = await prisma.tenant.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingTenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // Soft delete the tenant
    await prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};