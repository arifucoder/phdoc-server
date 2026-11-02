import AppError from "@/app/errorHelpers/AppError";
import dotenv from "dotenv";
import httpStatus from "http-status";
import type { SignOptions } from "jsonwebtoken";

dotenv.config();

// jsonwebtoken-এর expiresIn যে string format নেয় ("15m", "1d", "7d" ...)
export type TDuration = Extract<NonNullable<SignOptions["expiresIn"]>, string>;

interface EnvConfig {
	NODE_ENV: string;
	PORT: string;
	DATABASE_URL: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	ACCESS_TOKEN_SECRET: string;
	REFRESH_TOKEN_SECRET: string;
	ACCESS_TOKEN_EXPIRES_IN: TDuration;
	REFRESH_TOKEN_EXPIRES_IN: TDuration;
	BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN: string;
	BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE: string;

	FRONTEND_URL: string;

	EMAIL_SENDER: {
		SMTP_HOST: string;
		SMTP_PORT: string;
		SMTP_USER: string;
		SMTP_PASS: string;
		SMTP_FROM: string;
	};

	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	GOOGLE_CALLBACK_URL: string;

	CLOUDINARY: {
		CLOUDINARY_CLOUD_NAME: string;
		CLOUDINARY_API_KEY: string;
		CLOUDINARY_API_SECRET: string;
	};

	STRIPE: {
		STRIPE_SECRET_KEY: string;
		STRIPE_WEBHOOK_SECRET: string;
	};

	SUPER_ADMIN_EMAIL: string;
	SUPER_ADMIN_PASSWORD: string;
}

// value না থাকলে সাথে সাথে throw; থাকলে TypeScript নিজেই জানে এটা string
const getEnv = (key: string): string => {
	const value = process.env[key];

	if (!value) {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			`Environment variable ${key} is required but not set in .env file.`,
		);
	}

	return value;
};

// সংখ্যা + unit বাধ্যতামূলক; শুধু "60" দিলে jsonwebtoken সেটা 60ms ধরে, তাই সেটা নিষেধ
const DURATION_REGEX = /^\d+(?:\.\d+)?\s?(?:ms|s|m|h|d|w|y)$/i;

const isDuration = (value: string): value is TDuration => DURATION_REGEX.test(value);

// JWT expiresIn-এর জন্য: থাকতেই হবে + সঠিক format হতে হবে
const getDurationEnv = (key: string): TDuration => {
	const value = getEnv(key);

	if (!isDuration(value)) {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			`Environment variable ${key} must be a duration like "15m", "1d" or "7d" (got "${value}").`,
		);
	}

	return value;
};

const loadEnvVariables = (): EnvConfig => ({
	NODE_ENV: getEnv("NODE_ENV"),
	PORT: getEnv("PORT"),
	DATABASE_URL: getEnv("DATABASE_URL"),
	BETTER_AUTH_SECRET: getEnv("BETTER_AUTH_SECRET"),
	BETTER_AUTH_URL: getEnv("BETTER_AUTH_URL"),
	ACCESS_TOKEN_SECRET: getEnv("ACCESS_TOKEN_SECRET"),
	REFRESH_TOKEN_SECRET: getEnv("REFRESH_TOKEN_SECRET"),
	ACCESS_TOKEN_EXPIRES_IN: getDurationEnv("ACCESS_TOKEN_EXPIRES_IN"),
	REFRESH_TOKEN_EXPIRES_IN: getDurationEnv("REFRESH_TOKEN_EXPIRES_IN"),
	BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN: getEnv("BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN"),
	BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE: getEnv("BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE"),
	FRONTEND_URL: getEnv("FRONTEND_URL"),

	EMAIL_SENDER: {
		SMTP_HOST: getEnv("SMTP_HOST"),
		SMTP_PORT: getEnv("SMTP_PORT"),
		SMTP_USER: getEnv("SMTP_USER"),
		SMTP_PASS: getEnv("SMTP_PASS"),
		SMTP_FROM: getEnv("SMTP_FROM"),
	},

	GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
	GOOGLE_CLIENT_SECRET: getEnv("GOOGLE_CLIENT_SECRET"),
	GOOGLE_CALLBACK_URL: getEnv("GOOGLE_CALLBACK_URL"),

	CLOUDINARY: {
		CLOUDINARY_CLOUD_NAME: getEnv("CLOUDINARY_CLOUD_NAME"),
		CLOUDINARY_API_KEY: getEnv("CLOUDINARY_API_KEY"),
		CLOUDINARY_API_SECRET: getEnv("CLOUDINARY_API_SECRET"),
	},

	STRIPE: {
		STRIPE_SECRET_KEY: getEnv("STRIPE_SECRET_KEY"),
		STRIPE_WEBHOOK_SECRET: getEnv("STRIPE_WEBHOOK_SECRET"),
	},

	SUPER_ADMIN_EMAIL: getEnv("SUPER_ADMIN_EMAIL"),
	SUPER_ADMIN_PASSWORD: getEnv("SUPER_ADMIN_PASSWORD"),
});

export const envVars = loadEnvVariables();
