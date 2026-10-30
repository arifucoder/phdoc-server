import AppError from "@/app/errorHelpers/AppError";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { DoctorScheduleService } from "./doctorSchedule.service";

// req.user optional type — একবার check করে narrow করি
const getAuthUser = (req: Request): IRequestUser => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access! Please log in.");
	}
	return req.user;
};

const createMyDoctorSchedule = catchAsync(async (req: Request, res: Response) => {
	const result = await DoctorScheduleService.createMyDoctorSchedule(getAuthUser(req), req.body);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.CREATED,
		message: "Doctor schedule created successfully",
		data: result,
	});
});

const getMyDoctorSchedules = catchAsync(async (req: Request, res: Response) => {
	const result = await DoctorScheduleService.getMyDoctorSchedules(getAuthUser(req), req.query);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.OK,
		message: "Doctor schedules retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getAllDoctorSchedules = catchAsync(async (req: Request, res: Response) => {
	const result = await DoctorScheduleService.getAllDoctorSchedules(req.query);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.OK,
		message: "All doctor schedules retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getDoctorScheduleById = catchAsync(async (req: Request, res: Response) => {
	const { doctorId, scheduleId } = req.params;
	const result = await DoctorScheduleService.getDoctorScheduleById(doctorId as string, scheduleId as string);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.OK,
		message: "Doctor schedule retrieved successfully",
		data: result,
	});
});

const updateMyDoctorSchedule = catchAsync(async (req: Request, res: Response) => {
	const result = await DoctorScheduleService.updateMyDoctorSchedule(getAuthUser(req), req.body);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.OK,
		message: "Doctor schedule updated successfully",
		data: result,
	});
});

const deleteMyDoctorSchedule = catchAsync(async (req: Request, res: Response) => {
	const { scheduleId } = req.params;
	await DoctorScheduleService.deleteMyDoctorSchedule(scheduleId as string, getAuthUser(req));

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.OK,
		message: "Doctor schedule deleted successfully",
	});
});

export const DoctorScheduleController = {
	createMyDoctorSchedule,
	getMyDoctorSchedules,
	getAllDoctorSchedules,
	getDoctorScheduleById,
	updateMyDoctorSchedule,
	deleteMyDoctorSchedule,
};
