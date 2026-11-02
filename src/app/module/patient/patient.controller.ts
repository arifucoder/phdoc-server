import { catchAsync } from "@/app/shared/catchAsync";
import { getAuthUser } from "@/app/shared/getAuthUser";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { TUpdatePatientProfilePayload } from "./patient.interface";
import { PatientService } from "./patient.service";

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
	// validateRequest (Zod) + attachPatientUploads পার হয়ে আসা body
	const payload: TUpdatePatientProfilePayload = req.body;

	const result = await PatientService.updateMyProfile(getAuthUser(req), payload);

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
