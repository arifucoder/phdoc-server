import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { TUpdatePatientProfilePayload } from "./patient.interface";
import { PatientService } from "./patient.service";

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const payload = req.body as TUpdatePatientProfilePayload;

	const result = await PatientService.updateMyProfile(user, payload);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.OK,
		message: "Profile updated successfully",
		data: result,
	});
});

export const PatientController = {
	updateMyProfile,
};
