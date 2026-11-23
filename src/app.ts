import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import apiRouter from "./routes/index";
import errorHandler from "./middlewares/error.middleware";
import { requestContext } from "./middlewares/request-context.middleware";
import { auditMutations } from "./middlewares/audit.middleware";
import { MESSAGES } from "./utils/helper/constants/messages";
import { StatusCode } from "./utils/helper/constants/enum";

const app = express();

// Request id + async context (tenant, structured logs) must wrap everything.
app.use(requestContext);

// Request log with method, path, status and timing. Silent under test so the
// suite output stays readable.
if (process.env.NODE_ENV !== "test") app.use(morgan("tiny"));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  statusCode: StatusCode.TOO_MANY_REQUESTS,
  message: { success: false, message: MESSAGES.RATE_LIMIT_EXCEEDED },
});
app.use("/api/", limiter);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// Uploaded documents are served by an authenticated controller, never from a
// static mount: a contract or ID scan must not be readable by URL alone.
app.use(auditMutations);
// Every API response is personalized by session or role; a cached/304 reply
// would expose stale data and break clients that expect a JSON body.
app.use("/api/v1", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/api/v1", apiRouter);
app.use(errorHandler);

export default app;
