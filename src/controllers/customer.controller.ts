import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
});

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const customers = await prisma.customer.findMany({
      where: { tenantId, deletedAt: null }, // Multi-tenant & Soft-delete filter
      orderBy: { createdAt: "desc" },
    });
    res.json(customers);
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const validatedData = customerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        ...validatedData,
        tenantId,
      },
    });
    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Soft Delete
    await prisma.customer.update({
      where: { id, tenantId }, // Ensures a tenant can only delete THEIR customer
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};