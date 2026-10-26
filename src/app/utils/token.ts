import type { CookieOptions, Response } from "express";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import { envVars } from "../config/env";
import { CookieUtils } from "./cookie";
import { jwtUtils } from "./jwt";

// ei hisabta lage cause cookie day buje na. ms buje only. ei jonno amader k ms theke day te convert kore niye use korte hoiche
const ONE_DAY = 1000 * 60 * 60 * 24; // ms

// ⚠️ এগুলো .env-এর EXPIRES_IN-এর সাথে মিলিয়ে রাখো
const ACCESS_TOKEN_MAX_AGE = ONE_DAY; // ACCESS_TOKEN_EXPIRES_IN=1d
const REFRESH_TOKEN_MAX_AGE = ONE_DAY * 7; // REFRESH_TOKEN_EXPIRES_IN=7d
const SESSION_MAX_AGE = ONE_DAY * 7; // BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN=604800

const isProduction = envVars.NODE_ENV === "production";

// set আর clear দুই জায়গাতেই একই options লাগে
const baseCookieOptions: CookieOptions = {
	httpOnly: true,
	secure: isProduction,
	// sameSite: isProduction ? "none" : "lax",
	sameSite: "none",
	path: "/",
};

// ---------- Token তৈরি ----------
const getAccessToken = (payload: JwtPayload): string => {
	return jwtUtils.createToken(payload, envVars.ACCESS_TOKEN_SECRET, {
		expiresIn: envVars.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
	});
};

const getRefreshToken = (payload: JwtPayload): string => {
	return jwtUtils.createToken(payload, envVars.REFRESH_TOKEN_SECRET, {
		expiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
	});
};

// ---------- Cookie set ----------
const setAccessTokenCookie = (res: Response, token: string) => {
	CookieUtils.setCookie(res, "accessToken", token, {
		...baseCookieOptions,
		maxAge: ACCESS_TOKEN_MAX_AGE,
	});
};

const setRefreshTokenCookie = (res: Response, token: string) => {
	CookieUtils.setCookie(res, "refreshToken", token, {
		...baseCookieOptions,
		maxAge: REFRESH_TOKEN_MAX_AGE,
	});
};

const setBetterAuthSessionCookie = (res: Response, token: string) => {
	CookieUtils.setCookie(res, "better-auth.session_token", token, {
		...baseCookieOptions,
		maxAge: SESSION_MAX_AGE,
	});
};

// ---------- Logout-এর জন্য ----------
const clearAuthCookies = (res: Response) => {
	CookieUtils.clearCookie(res, "accessToken", baseCookieOptions);
	CookieUtils.clearCookie(res, "refreshToken", baseCookieOptions);
	CookieUtils.clearCookie(res, "better-auth.session_token", baseCookieOptions);
};

export const tokenUtils = {
	getAccessToken,
	getRefreshToken,
	setAccessTokenCookie,
	setRefreshTokenCookie,
	setBetterAuthSessionCookie,
	clearAuthCookies,
};
