import { z } from "zod";
import { prisma } from "../lib/prisma";

export const updateProductSchema = z.object({
  name: z.string().optional(),
  price: z.number().int().positive("Price must be in cents").optional(),
  stockAdjustment: z.number().int().optional(), // Can be positive (add stock) or negative (remove stock)
  reason: z.string().optional(), // Reason for stock adjustment
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export class ProductService {
  /**
   * Updates a product, managing Price History and Inventory Ledgers.
   */
  static async updateProduct(tenantId: string, productId: string, data: UpdateProductInput) {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, tenantId, deletedAt: null },
      });

      if (!product) throw new Error("Product not found");

      // 1. Handle Price Update (Versioning)
      if (data.price) {
        // Deactivate all current prices
        await tx.productPrice.updateMany({
          where: { productId, tenantId, active: true },
          data: { active: false },
        });

        // Insert new active price
        await tx.productPrice.create({
          data: {
            tenantId,
            productId,
            price: data.price,
            currency: "USD",
            active: true,
          },
        });
      }

      // 2. Handle Stock Adjustment (Auditing)
      if (data.stockAdjustment) {
        const newStock = product.stock + data.stockAdjustment;
        if (newStock < 0) throw new Error("Stock cannot fall below zero");

        await tx.product.update({
          where: { id: productId },
          data: { stock: newStock },
        });

        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            productId,
            quantity: Math.abs(data.stockAdjustment),
            type: "ADJUSTMENT",
            reference: data.reason || "Manual Adjustment",
          },
        });
      }

      // 3. Handle basic metadata updates (Name)
      if (data.name) {
        await tx.product.update({
          where: { id: productId },
          data: { name: data.name },
        });
      }

      // Return updated product with its active price
      return await tx.product.findUnique({
        where: { id: productId },
        include: { prices: { where: { active: true } } },
      });
    });
  }
}