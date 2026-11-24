import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import apiRouter from "./routes/index";
import errorHandler from "./middlewares/error.middleware";
import { requestContext } from "./middlewares/request-context.middleware";
import { auditMutations } from "./middlewares/audit.middleware";
import { requireTrustedOrigin, trustedOrigins } from "./middlewares/origin.middleware";
import { MESSAGES } from "./utils/helper/constants/messages";
import { StatusCode } from "./utils/helper/constants/enum";

const app = express();

// When the app sits behind a proxy, `trust proxy` has to be set or every client
// shares the proxy's IP and one busy user exhausts the limit for everyone.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) {
  const hops = Number(trustProxy);
  app.set("trust proxy", Number.isFinite(hops) ? hops : trustProxy === "true");
}

// Request id + async context (tenant, structured logs) must wrap everything.
app.use(requestContext);

// Security headers for JSON responses. The CSP is left to the frontend: this
// server sends no HTML, and a strict default would break document downloads.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Request log with method, path, status and timing. Silent under test so the
// suite output stays readable.
if (process.env.NODE_ENV !== "test") app.use(morgan("tiny"));

// CORS and the origin guard read the same allowlist, so they cannot disagree.
const origins = trustedOrigins();

app.use(cors({
  origin: origins.length === 1 ? origins[0] : origins,
  credentials: true,
}));

const windowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15);
const limit = Number(process.env.RATE_LIMIT_MAX || 3000);

const limiter = rateLimit({
  windowMs: (Number.isFinite(windowMinutes) && windowMinutes > 0 ? windowMinutes : 15) * 60 * 1000,
  max: Number.isFinite(limit) && limit > 0 ? limit : 3000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  statusCode: StatusCode.TOO_MANY_REQUESTS,
  message: { success: false, message: MESSAGES.RATE_LIMIT_EXCEEDED },
  // Health checks are the one route a load balancer hits constantly; counting
  // them would rate-limit the platform's own probes.
  skip: (req) => req.path === "/health",
});
app.use("/api/", limiter);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
// Cookie sessions are attached by the browser to any request, so mutations must
// carry a trusted origin before they reach a handler.
app.use(requireTrustedOrigin);
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
