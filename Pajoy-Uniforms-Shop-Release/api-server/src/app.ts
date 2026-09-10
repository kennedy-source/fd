import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log.error({ err: error }, "API request failed");
  const message = error instanceof Error ? error.message : "Request could not be completed.";
  const safeMessages = [
    "Insufficient stock",
    "Payment exceeds",
    "Payment cannot",
    "Order not found",
    "Document not found",
    "credit limit",
    "Wholesale price",
    "Deposit cannot",
    "Selected shop",
    "Selected branch",
    "A shop must be selected",
  ];
  const isClientError = safeMessages.some((prefix) => message.toLowerCase().includes(prefix.toLowerCase()));
  res.status(isClientError ? 400 : 500).json({ error: isClientError ? message : "Request could not be completed." });
});

export default app;
