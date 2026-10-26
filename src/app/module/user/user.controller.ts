import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { UserService } from "./user.service";

const createDoctor = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await UserService.createDoctor(payload);

	sendResponse(res, {
		httpStatusCode: httpStatus.CREATED,
		success: true,
		message: "Doctor registered successfully",
		data: result,
	});
});

export const UserController = {
	createDoctor,
};
