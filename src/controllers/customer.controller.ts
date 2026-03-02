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

const updateCustomerSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().optional(),
});

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const customerId = String(req.params.id);
    const validatedData = updateCustomerSchema.parse(req.body);

    // 1. Verify the customer exists and belongs to this tenant
    const existingCustomer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!existingCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // 2. Update the customer
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: validatedData,
    });

    res.status(200).json({
      message: "Customer updated successfully",
      data: updatedCustomer,
    });
  } catch (error) {
    next(error); // Passes ZodErrors or DB errors to your enterprise error handler
  }
};