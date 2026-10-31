import type { Server } from "http";
import { schedule, shutdown as shutdownCron } from "node-cron";
import app from "./app";
import { envVars } from "./app/config/env";
import { prisma } from "./app/lib/prisma";
import { AppointmentService } from "./app/module/appointment/appointment.service";
import { seedSuperAdmin } from "./app/utils/seed";

let server: Server | undefined;
let isShuttingDown = false;
const PORT = envVars.PORT;

const startCronJobs = () => {
	// প্রতি ৫ মিনিটে: ৩০ মিনিটের পুরনো unpaid appointment cancel করে slot ফাঁকা করা
	schedule(
		"*/5 * * * *",
		async () => {
			try {
				const { canceledCount } = await AppointmentService.cancelUnpaidAppointments();

				if (canceledCount > 0) {
					console.warn(`[cron] Canceled ${canceledCount} unpaid appointment(s)`);
				}
			} catch (error) {
				console.error("[cron] Failed to cancel unpaid appointments:", error instanceof Error ? error.message : error);
			}
		},
		{
			name: "cancel-unpaid-appointments",
			noOverlap: true, // আগের run শেষ না হলে নতুন run শুরু হবে না
		},
	);
};

const gracefulShutdown = async (reason: string, exitCode: number) => {
	// একাধিক signal একসাথে এলে দুইবার shutdown হবে না
	if (isShuttingDown) return;
	isShuttingDown = true;

	console.warn(`${reason}. Shutting down server...`);

	// কোনো কারণে আটকে গেলে ১০ সেকেন্ড পর জোর করে বন্ধ
	setTimeout(() => process.exit(exitCode), 10_000).unref();

	await shutdownCron();

	const runningServer = server;
	if (runningServer) {
		// নতুন request নেওয়া বন্ধ, চলমান request শেষ হওয়া পর্যন্ত অপেক্ষা
		await new Promise<void>((resolve) => runningServer.close(() => resolve()));
	}

	await prisma.$disconnect();

	process.exit(exitCode);
};

const startServer = async () => {
	try {
		await seedSuperAdmin();
	} catch (error) {
		console.error("Failed to seed super admin:", error);
		await gracefulShutdown("Seeding failed", 1);
		return;
	}

	server = app.listen(PORT, () => {
		console.log(`Server is running on port http://localhost:${PORT}`);
		startCronJobs();
	});

	// যেমন port আগে থেকেই ব্যবহার হচ্ছে (EADDRINUSE)
	server.on("error", (error) => {
		console.error("Failed to start server:", error);
		void gracefulShutdown("Server error", 1);
	});
};

process.on("SIGTERM", () => void gracefulShutdown("SIGTERM received", 0));
process.on("SIGINT", () => void gracefulShutdown("SIGINT received", 0));

process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
	void gracefulShutdown("Uncaught exception", 1);
});

process.on("unhandledRejection", (reason) => {
	console.error("Unhandled Rejection:", reason);
	void gracefulShutdown("Unhandled rejection", 1);
});

// package.json-এ "type": "module", তাই top-level await চলে
await startServer();
