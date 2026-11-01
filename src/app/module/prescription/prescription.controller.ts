import AppError from "@/app/errorHelpers/AppError";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { PrescriptionService } from "./prescription.service";

const getAuthUser = (req: Request): IRequestUser => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access! Please log in.");
	}
	return req.user;
};

const givePrescription = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const result = await PrescriptionService.givePrescription(user, req.body);

	sendResponse(res, {
		httpStatusCode: httpStatus.CREATED,
		success: true,
		message: "Prescription created successfully",
		data: result,
	});
});

const getMyPrescriptions = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const result = await PrescriptionService.getMyPrescriptions(user);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Prescriptions retrieved successfully",
		data: result,
	});
});

const getAllPrescriptions = catchAsync(async (req: Request, res: Response) => {
	const result = await PrescriptionService.getAllPrescriptions(req.query);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Prescriptions retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getSinglePrescription = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const prescriptionId = req.params.id as string;
	const result = await PrescriptionService.getSinglePrescription(user, prescriptionId);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Prescription retrieved successfully",
		data: result,
	});
});

const updatePrescription = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const prescriptionId = req.params.id as string;
	const result = await PrescriptionService.updatePrescription(user, prescriptionId, req.body);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Prescription updated successfully",
		data: result,
	});
});

const deletePrescription = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const prescriptionId = req.params.id as string;
	const result = await PrescriptionService.deletePrescription(user, prescriptionId);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Prescription deleted successfully",
		data: result,
	});
});

export const PrescriptionController = {
	givePrescription,
	getMyPrescriptions,
	getAllPrescriptions,
	getSinglePrescription,
	updatePrescription,
	deletePrescription,
};
