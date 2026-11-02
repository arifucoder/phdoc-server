import type { Server } from "http";
import { schedule, shutdown as shutdownCron } from "node-cron";
import app from "./app";
import { envVars } from "./app/config/env";
import { prisma } from "./app/lib/prisma";
import { AppointmentService } from "./app/module/appointment/appointment.service";
import { seedSuperAdmin } from "./app/utils/seed";

const PORT = Number(envVars.PORT);
const SHUTDOWN_TIMEOUT_MS = 10_000;

let server: Server | undefined;
let isShuttingDown = false;

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

	// কোনো কারণে আটকে গেলে জোর করে বন্ধ
	setTimeout(() => {
		console.error("Graceful shutdown timed out. Forcing exit.");
		process.exit(exitCode);
	}, SHUTDOWN_TIMEOUT_MS).unref();

	let finalExitCode = exitCode;

	try {
		await shutdownCron();

		const runningServer = server;
		// listen fail করলে server চালুই হয়নি, close করার কিছু নেই
		if (runningServer?.listening) {
			// নতুন request নেওয়া বন্ধ, চলমান request শেষ হওয়া পর্যন্ত অপেক্ষা
			await new Promise<void>((resolve, reject) => {
				runningServer.close((error) => (error ? reject(error) : resolve()));
			});
		}

		await prisma.$disconnect();
		console.info("Server closed gracefully.");
	} catch (error) {
		console.error("Error during shutdown:", error);
		finalExitCode = 1;
	} finally {
		process.exit(finalExitCode);
	}
};

const startServer = async () => {
	try {
		await seedSuperAdmin();
	} catch (error) {
		console.error("Failed to seed super admin:", error);
		await gracefulShutdown("Seeding failed", 1);
		return;
	}

	// Express 5: listen fail করলে (যেমন EADDRINUSE) এই callback-টাই error সহ ডাকা হয়
	server = app.listen(PORT, (error) => {
		if (error) {
			console.error("Failed to start server:", error);
			void gracefulShutdown("Server failed to start", 1);
			return;
		}

		console.info(`Server is running on http://localhost:${PORT}`);
		startCronJobs();
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
