import { envVars } from "@/app/config/env";
import AppError from "@/app/errorHelpers/AppError";
import { prisma } from "@/app/lib/prisma";
import { CookieUtils } from "@/app/utils/cookie";
import { jwtUtils } from "@/app/utils/jwt";
import { type Role, UserStatus } from "@/generated/prisma/enums";
import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";

// session-এর মেয়াদ এর চেয়ে কম % বাকি থাকলে frontend-কে জানানো হবে
const SESSION_REFRESH_THRESHOLD_PERCENT = 20;

export const checkAuth =
	(...authRoles: Role[]) =>
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			// ধাপ ১: দুইটা cookie-ই থাকতে হবে
			const sessionToken = CookieUtils.getCookie(req, "better-auth.session_token");
			const accessToken = CookieUtils.getCookie(req, "accessToken");

			if (!sessionToken || !accessToken) {
				throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access! Please log in.");
			}

			// ধাপ ২: JWT verify (DB লাগে না, তাই আগে)
			// ভুল বা expired হলে verifyToken নিজেই AppError throw করে
			const decoded = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);

			// ধাপ ৩: DB-তে session খোঁজা
			const session = await prisma.session.findUnique({
				where: { token: sessionToken },
				include: { user: true },
			});

			// ✅ Bug ১ fix: session না পেলে বা মেয়াদ শেষ হলে ঢুকতে দেওয়া হবে না
			if (!session || session.expiresAt <= new Date()) {
				throw new AppError(httpStatus.UNAUTHORIZED, "Session expired or invalid! Please log in again.");
			}

			const { user } = session;

			// ✅ Bug ২ fix: দুইটা token একই user-এর কিনা
			if (decoded.userId !== user.id) {
				throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access! Token mismatch.");
			}

			// ধাপ ৪: user-এর অবস্থা DB থেকে (JWT-র পুরনো data-র উপর ভরসা না করে)
			if (user.isDeleted || user.status === UserStatus.DELETED) {
				throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access! User is deleted.");
			}

			if (user.status === UserStatus.BLOCKED) {
				throw new AppError(httpStatus.FORBIDDEN, "Your account has been blocked.");
			}

			// ধাপ ৫: role check, শুধু DB-র role দিয়ে
			if (authRoles.length > 0 && !authRoles.includes(user.role)) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"Forbidden access! You do not have permission to access this resource.",
				);
			}

			// ধাপ ৬: session শেষ হওয়ার কাছাকাছি থাকলে frontend-কে header দিয়ে জানানো
			const sessionLifeTime = session.expiresAt.getTime() - session.createdAt.getTime();
			const timeRemaining = session.expiresAt.getTime() - Date.now();
			const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

			if (percentRemaining < SESSION_REFRESH_THRESHOLD_PERCENT) {
				res.setHeader("X-Session-Refresh", "true");
				res.setHeader("X-Session-Expires-At", session.expiresAt.toISOString());
				res.setHeader("X-Time-Remaining", timeRemaining.toString());
			}

			// ধাপ ৭: controller-এর জন্য user-এর তথ্য রেখে দেওয়া
			req.user = {
				userId: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			};

			next();
		} catch (error) {
			next(error);
		}
	};
