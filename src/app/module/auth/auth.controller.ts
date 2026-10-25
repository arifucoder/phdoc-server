import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";

const registerPatient = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	console.log(payload);

	const result = await AuthService.registerPatient(payload);

	sendResponse(res, {
		httpStatusCode: 201,
		success: true,
		message: "Patient registered successfully",
		data: result,
	});
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await AuthService.loginUser(payload);
	sendResponse(res, {
		httpStatusCode: 200,
		success: true,
		message: "User logged in successfully",
		data: result,
	});
});

export const AuthController = {
	registerPatient,
	loginUser,
};
