import express from "express";
import cors from "cors";
import { connectDB, disconnectDB } from "./config/database";

// Individual route imports
import authRoutes from "./routes/auth";
import taskRoutes from "./routes/tasks";
import eventRoutes from "./routes/events";
import noteRoutes from "./routes/notes";
import transactionRoutes from "./routes/transactions";
import budgetRoutes from "./routes/budgets";
import habitRoutes from "./routes/habits";
import goalRoutes from "./routes/goals";
import journalRoutes from "./routes/journal";
import focusRoutes from "./routes/focus-sessions";
import healthRoutes from "./routes/health";

// Enterprise route imports
import enterpriseRoutes from "./routes/enterprise/enterprises";
import projectRoutes from "./routes/enterprise/projects";
import inventoryRoutes from "./routes/enterprise/inventory";
import orderRoutes from "./routes/enterprise/orders";
import crmRoutes from "./routes/enterprise/crm";
import invoiceRoutes from "./routes/enterprise/invoices";
import timeClockRoutes from "./routes/enterprise/time-clock";
import vendorRoutes from "./routes/enterprise/vendors";
import channelRoutes from "./routes/enterprise/channels";
import documentRoutes from "./routes/enterprise/documents";
import financeRoutes from "./routes/enterprise/finance";
import analyticsRoutes from "./routes/enterprise/analytics";
import resourceRoutes from "./routes/enterprise/resources";

const PORT = parseInt(process.env.PORT || "4001", 10);

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Health check
app.get("/api/health-check", (_req, res) => {
  res.json({ success: true, message: "Enovis API is running" });
});

// Routes — Individual
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/focus-sessions", focusRoutes);
app.use("/api/health", healthRoutes);

// Routes — Enterprise
app.use("/api/enterprise", enterpriseRoutes);
app.use("/api/enterprise/projects", projectRoutes);
app.use("/api/enterprise/inventory", inventoryRoutes);
app.use("/api/enterprise/orders", orderRoutes);
app.use("/api/enterprise/crm", crmRoutes);
app.use("/api/enterprise/invoices", invoiceRoutes);
app.use("/api/enterprise/time-clock", timeClockRoutes);
app.use("/api/enterprise/vendors", vendorRoutes);
app.use("/api/enterprise/channels", channelRoutes);
app.use("/api/enterprise/documents", documentRoutes);
app.use("/api/enterprise/finance", financeRoutes);
app.use("/api/enterprise/analytics", analyticsRoutes);
app.use("/api/enterprise/resources", resourceRoutes);

// Start server
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[Server] Enovis API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[Server] Shutting down...");
  await disconnectDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDB();
  process.exit(0);
});

start();
