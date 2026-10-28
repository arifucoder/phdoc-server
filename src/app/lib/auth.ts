import { Role, UserStatus } from "@/generated/prisma/enums";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";
import { envVars } from "../config/env";
import { sendEmail } from "../utils/email";
import { prisma } from "./prisma";

const OTP_EXPIRES_IN = 2 * 60; // seconds
export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql", // or "mysql", "sqlite", ...etc
	}),

	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		revokeSessionsOnPasswordReset: true,
	},
	emailVerification: {
		sendOnSignUp: true,
		sendOnSignIn: true,
		autoSignInAfterVerification: true,
	},
	session: {
		expiresIn: Number(envVars.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN),
		updateAge: Number(envVars.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE),
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5, // 5 minutes (seconds) = 300
		},
	},
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: true,
				defaultValue: Role.PATIENT,
			},

			status: {
				type: "string",
				required: true,
				defaultValue: UserStatus.ACTIVE,
			},

			needPasswordChange: {
				type: "boolean",
				required: true,
				defaultValue: false,
			},

			isDeleted: {
				type: "boolean",
				required: true,
				defaultValue: false,
			},

			deletedAt: {
				type: "date",
				required: false,
				defaultValue: null,
			},
		},
	},
	plugins: [
		bearer(),
		emailOTP({
			overrideDefaultEmailVerification: true,
			async sendVerificationOTP({ email, otp, type }) {
				// এই প্রজেক্টে শুধু এই দুই type ব্যবহার হচ্ছে
				if (type !== "email-verification" && type !== "forget-password") return;

				const subjects = {
					"email-verification": "Verify your email",
					"forget-password": "Password Reset OTP",
				} as const;

				const templates = {
					"email-verification": "otp",
					"forget-password": "reset-password-otp",
				} as const;

				const user = await prisma.user.findUnique({ where: { email } });

				if (!user) return;
				if (type === "email-verification" && user.emailVerified) return;

				try {
					await sendEmail({
						to: email,
						subject: subjects[type],
						templateName: templates[type],
						templateData: {
							name: user.name,
							otp,
							expiresInMinutes: OTP_EXPIRES_IN / 60,
						},
					});
				} catch {
					// sendEmail নিজেই error log করে। এখানে throw করলে signup অর্ধেক হয়ে থাকবে,
					// তাই আটকানো হলো; user login করলে নতুন OTP যাবে
				}
			},
			expiresIn: OTP_EXPIRES_IN,
			otpLength: 6,
		}),
	],
});
