import { envVars } from "@/app/config/env";
import AppError from "@/app/errorHelpers/AppError";
import { auth } from "@/app/lib/auth";
import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import { CookieUtils } from "@/app/utils/cookie";
import { tokenUtils } from "@/app/utils/token";
import { UserStatus } from "@/generated/prisma/enums";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IForgetPasswordPayload, IResetPasswordPayload } from "./auth.interface";
import { AuthService } from "./auth.service";

const registerPatient = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await AuthService.registerPatient(payload);

	const { accessToken, refreshToken, token, ...rest } = result;

	tokenUtils.setAccessTokenCookie(res, accessToken);
	tokenUtils.setRefreshTokenCookie(res, refreshToken);

	// signUpEmail-এর token null হতে পারে, তাই check করে set করা
	if (token) {
		tokenUtils.setBetterAuthSessionCookie(res, token);
	}

	sendResponse(res, {
		httpStatusCode: httpStatus.CREATED,
		success: true,
		message: "Patient registered successfully",
		data: {
			token,
			accessToken,
			refreshToken,
			...rest,
		},
	});
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await AuthService.loginUser(payload);

	const { accessToken, refreshToken, token, ...rest } = result;

	tokenUtils.setAccessTokenCookie(res, accessToken);
	tokenUtils.setRefreshTokenCookie(res, refreshToken);
	tokenUtils.setBetterAuthSessionCookie(res, token);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "User logged in successfully",
		data: {
			token,
			accessToken,
			refreshToken,
			...rest,
		},
	});
});

const getMe = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	if (!user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access! Please log in.");
	}
	console.log({ user });
	const result = await AuthService.getMe(user);
	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "User profile fetched successfully",
		data: result,
	});
});

const getNewToken = catchAsync(async (req: Request, res: Response) => {
	const refreshToken = CookieUtils.getCookie(req, "refreshToken");
	const sessionToken = CookieUtils.getCookie(req, "better-auth.session_token");

	if (!refreshToken || !sessionToken) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token or session token is missing");
	}

	const result = await AuthService.getNewToken(refreshToken, sessionToken);

	const { accessToken, refreshToken: newRefreshToken, sessionToken: newSessionToken } = result;

	tokenUtils.setAccessTokenCookie(res, accessToken);
	tokenUtils.setRefreshTokenCookie(res, newRefreshToken);
	tokenUtils.setBetterAuthSessionCookie(res, newSessionToken);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "New tokens generated successfully",
		data: {
			accessToken,
			refreshToken: newRefreshToken,
			sessionToken: newSessionToken,
		},
	});
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
	const sessionToken = CookieUtils.getCookie(req, "better-auth.session_token");

	if (!sessionToken) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Session token is missing");
	}

	const result = await AuthService.changePassword(req.body, sessionToken);

	const { accessToken, refreshToken, token } = result;

	tokenUtils.setAccessTokenCookie(res, accessToken);
	tokenUtils.setRefreshTokenCookie(res, refreshToken);

	// revokeOtherSessions: true হলে নতুন session token আসে
	if (token) {
		tokenUtils.setBetterAuthSessionCookie(res, token);
	}

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Password changed successfully",
		data: result,
	});
});

const logoutUser = catchAsync(async (req: Request, res: Response) => {
	const sessionToken = CookieUtils.getCookie(req, "better-auth.session_token");

	if (!sessionToken) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Session token is missing");
	}

	const result = await AuthService.logoutUser(sessionToken);

	// set করার সময়ের একই options দিয়ে তিনটা cookie মুছে ফেলা
	tokenUtils.clearAuthCookies(res);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "User logged out successfully",
		data: result,
	});
});

const logoutFromAllDevices = catchAsync(async (req: Request, res: Response) => {
	const sessionToken = CookieUtils.getCookie(req, "better-auth.session_token");

	if (!sessionToken) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Session token is missing");
	}

	const result = await AuthService.logoutFromAllDevices(sessionToken);

	// এই browser-এর cookie মোছা; অন্য device-গুলোকে checkAuth নিজেই আটকাবে
	tokenUtils.clearAuthCookies(res);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Logged out from all devices successfully",
		data: result,
	});
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.verifyEmail(req.body);

	// autoSignInAfterVerification: true → verify হওয়ার সাথে সাথে login
	if (result.token !== null) {
		tokenUtils.setAccessTokenCookie(res, result.accessToken);
		tokenUtils.setRefreshTokenCookie(res, result.refreshToken);
		tokenUtils.setBetterAuthSessionCookie(res, result.token);
	}

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Email verified successfully",
		data: result,
	});
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
	const payload: IForgetPasswordPayload = req.body;

	await AuthService.forgetPassword(payload.email);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Password reset OTP sent to email successfully",
	});
});
const resetPassword = catchAsync(async (req: Request, res: Response) => {
	const payload: IResetPasswordPayload = req.body;

	await AuthService.resetPassword(payload);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Password reset successfully",
	});
});

const DEFAULT_REDIRECT = "/dashboard";

// শুধু "/profile" ধরনের path, "//evil.com" বা array না
const getSafeRedirectPath = (value: unknown) => {
	if (typeof value !== "string") return DEFAULT_REDIRECT;

	const isValid = value.startsWith("/") && !value.startsWith("//");
	return isValid ? value : DEFAULT_REDIRECT;
};

// GET /api/v1/auth/login/google?redirect=/profile
const googleLogin = catchAsync((req: Request, res: Response) => {
	const redirectPath = getSafeRedirectPath(req.query.redirect);

	const callbackURL = `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success?redirect=${encodeURIComponent(redirectPath)}`;
	const errorCallbackURL = `${envVars.BETTER_AUTH_URL}/api/v1/auth/oauth/error`;

	res.render("googleRedirect", {
		betterAuthUrl: envVars.BETTER_AUTH_URL,
		callbackURL,
		errorCallbackURL,
	});
});

const googleLoginSuccess = catchAsync(async (req: Request, res: Response) => {
	const redirectPath = getSafeRedirectPath(req.query.redirect);
	const loginUrl = `${envVars.FRONTEND_URL}/login`;

	// browser-এর পাঠানো cookie হুবহু Better Auth-কে দেওয়া (signed cookie সহ)
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});

	if (!session) {
		return res.redirect(`${loginUrl}?error=no_session_found`);
	}

	const { user } = session;

	// blocked/deleted হলে Better Auth-এর বানানো session মুছে ফেরত পাঠানো
	if (user.isDeleted || user.status === UserStatus.DELETED || user.status === UserStatus.BLOCKED) {
		await auth.api.revokeSession({
			body: { token: session.session.token },
			headers: fromNodeHeaders(req.headers),
		});
		tokenUtils.clearAuthCookies(res);

		const error = user.status === UserStatus.BLOCKED ? "account_blocked" : "account_deleted";
		return res.redirect(`${loginUrl}?error=${error}`);
	}

	const { accessToken, refreshToken } = await AuthService.googleLoginSuccess(session);

	tokenUtils.setAccessTokenCookie(res, accessToken);
	tokenUtils.setRefreshTokenCookie(res, refreshToken);
	// Better Auth-এর signed cookie ("token.signature") বদলে raw token, যাতে checkAuth DB-তে খুঁজে পায়
	tokenUtils.setBetterAuthSessionCookie(res, session.session.token);

	res.redirect(`${envVars.FRONTEND_URL}${redirectPath}`);
});

const handleOAuthError = catchAsync((req: Request, res: Response) => {
	const error = typeof req.query.error === "string" ? req.query.error : "oauth_failed";

	res.redirect(`${envVars.FRONTEND_URL}/login?error=${encodeURIComponent(error)}`);
});

export const AuthController = {
	registerPatient,
	loginUser,
	getMe,
	getNewToken,
	changePassword,
	logoutUser,
	logoutFromAllDevices,
	verifyEmail,
	forgetPassword,
	resetPassword,

	googleLogin,
	googleLoginSuccess,
	handleOAuthError,
};
