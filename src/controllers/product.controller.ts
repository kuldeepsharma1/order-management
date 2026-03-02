import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { ProductService, updateProductSchema } from "../services/product.service";

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

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const productId = String(req.params.id);
    const validatedData = updateProductSchema.parse(req.body);

    const updatedProduct = await ProductService.updateProduct(tenantId, productId, validatedData);
    
    res.json({ message: "Product updated", data: updatedProduct });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("not found")) return res.status(404).json({ message: error.message });
    if (error instanceof Error && error.message.includes("below zero")) return res.status(400).json({ message: error.message });
    next(error);
  }
};