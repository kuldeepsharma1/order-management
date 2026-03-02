import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  stock: z.number().int().nonnegative(),
  price: z.number().int().positive(), // Cents!
});

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const products = await prisma.product.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        prices: {
          where: { active: true }, // Only fetch the active price
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const data = productSchema.parse(req.body);

    // Nested write: Creates Product, active Price, and initial Inventory Ledger entry
    const product = await prisma.product.create({
      data: {
        tenantId,
        name: data.name,
        sku: data.sku,
        skuNormalized: data.sku.toUpperCase(),
        stock: data.stock,
        prices: {
          create: {
            tenantId,
            price: data.price,
            currency: "USD",
            active: true,
          },
        },
        inventory: {
          create: {
            tenantId,
            quantity: data.stock,
            type: "PURCHASE",
            reference: "INITIAL_STOCK",
          },
        },
      },
      include: { prices: true, inventory: true }
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};