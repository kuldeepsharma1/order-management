import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { env } from "./config/env";

const server = app.listen(env.PORT, () => {
  console.log(` Server running on port ${env.PORT}`);
});

/**
 * Graceful Shutdown
 */
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  server.close(() => {
    process.exit(0);
  });
});