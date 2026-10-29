import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { DoctorService } from "./doctor.service";

const getAllDoctors = catchAsync(async (req: Request, res: Response) => {
	const result = await DoctorService.getAllDoctors(req.query);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Doctors fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getDoctorById = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	const result = await DoctorService.getDoctorById(id as string);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Doctor fetched successfully",
		data: result,
	});
});

const updateDoctor = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	const result = await DoctorService.updateDoctor(id as string, req.body);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Doctor updated successfully",
		data: result,
	});
});

const deleteDoctor = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	const result = await DoctorService.deleteDoctor(id as string);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Doctor deleted successfully",
		data: result,
	});
});

export const DoctorController = {
	getAllDoctors,
	getDoctorById,
	updateDoctor,
	deleteDoctor,
};
