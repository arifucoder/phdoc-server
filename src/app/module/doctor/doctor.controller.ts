import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { DoctorService } from "./doctor.service";

const getAllDoctors = catchAsync(async (req: Request, res: Response) => {
	const result = await DoctorService.getAllDoctors();

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Doctors fetched successfully",
		data: result,
	});
});

export const DoctorController = {
	getAllDoctors,
};
