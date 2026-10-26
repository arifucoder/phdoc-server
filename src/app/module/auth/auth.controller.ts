import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
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

export const AuthController = {
	registerPatient,
	loginUser,
};
