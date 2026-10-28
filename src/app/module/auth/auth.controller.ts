import AppError from "@/app/errorHelpers/AppError";
import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import { CookieUtils } from "@/app/utils/cookie";
import { tokenUtils } from "@/app/utils/token";
import type { Request, Response } from "express";
import httpStatus from "http-status";
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

export const AuthController = {
	registerPatient,
	loginUser,
	getMe,
	getNewToken,
};
