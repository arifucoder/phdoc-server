import { Role, UserStatus } from "@/generated/prisma/enums";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { envVars } from "../config/env";
import { prisma } from "./prisma";

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql", // or "mysql", "sqlite", ...etc
	}),

	emailAndPassword: {
		enabled: true,
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
	plugins: [bearer()],
});
