import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import apiRouter from "./routes/index";
import errorHandler from "./middlewares/error.middleware";
import { MESSAGES } from "./utils/helper/constants/messages";
import { StatusCode } from "./utils/helper/constants/enum";

const app = express();

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
app.use("/uploads", express.static("uploads"));
app.use("/api/v1", apiRouter);
app.use(errorHandler);

export default app;
