import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { notFoundHandler } from "./middleware/notFound.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { env } from "./config/env";
import customerRoutes from "./routes/customer.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";

const app = express();

/**
 * Security Middlewares
 */
app.use(helmet());

/**
 * Logging
 */
app.use(
  morgan(env.NODE_ENV === "development" ? "dev" : "combined")
);

/**
 * Body Parsing
 */
app.use(express.json());

/**
 * CORS
 */
app.use(cors());

/**
 * Health Check
 */
app.get("/health", (_, res) => {
  res.status(200).json({
    status: "OK",
  });
});
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
/**
 * API Routes
 */
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);
/**
 * 404 Handler
 */
app.use(notFoundHandler);

/**
 * Global Error Handler
 */
app.use(errorHandler);






export default app;