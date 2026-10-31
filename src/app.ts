import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import path from "path";
import { envVars } from "./app/config/env";
import { auth } from "./app/lib/auth";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { PaymentController } from "./app/module/payment/payment.controller";
import { IndexRoutes } from "./app/routes";

const app = express();
// Express 5 default "simple" parser nested query বোঝে না: appointmentFee[gte]=500 কে object বানাতে "extended" লাগবে
app.set("query parser", "extended");

// ejs page render (googleRedirect) — email.ts-এর মতো একই folder
app.set("view engine", "ejs");
app.set(
	"views",
	envVars.NODE_ENV === "production"
		? path.join(process.cwd(), "dist/templates")
		: path.join(process.cwd(), "src/app/templates"),
);

app.all("/api/auth/{*any}", toNodeHandler(auth));

// stripe webhook
app.post("/webhook", express.raw({ type: "application/json" }), PaymentController.handleStripeWebhookEvent);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json()); // request body থেকে JSON পড়ার জন্য
app.use(
	cors({
		origin: envVars.FRONTEND_URL, // যেমন http://localhost:3000
		credentials: true, // cookie আসা-যাওয়ার অনুমতি
		exposedHeaders: ["X-Session-Refresh", "X-Session-Expires-At", "X-Time-Remaining"],
	}),
);

app.get("/", (req: Request, res: Response) => {
	res.json({
		message: "Welcome to phdoc!",
	});
});

app.use("/api/v1", IndexRoutes);

app.use(notFound);
app.use(globalErrorHandler);
export default app;
