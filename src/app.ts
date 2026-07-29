import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import apiRouter from "./routes/index";
import errorHandler from "./middlewares/error.middleware";

const app = express();

// ---------- Request Logging ----------
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ---------- Rate Limiting ----------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// ---------- Body Parsing ----------
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ---------- Static Files (uploads) ----------
app.use("/uploads", express.static("uploads"));

// ---------- Routes ----------
app.use("/api/v1", apiRouter);

// ---------- Health check ----------
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Server is running", timestamp: new Date().toISOString() });
});

// ---------- Error handling (must be last) ----------
app.use(errorHandler);

export default app;
