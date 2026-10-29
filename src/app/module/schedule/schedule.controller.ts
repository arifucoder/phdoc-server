import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { ScheduleService } from "./schedule.service";

const createSchedule = catchAsync(async (req: Request, res: Response) => {
	const result = await ScheduleService.createSchedule(req.body);

	sendResponse(res, {
		httpStatusCode: httpStatus.CREATED,
		success: true,
		message: "Schedule created successfully",
		data: result,
	});
});

const getAllSchedules = catchAsync(async (req: Request, res: Response) => {
	const result = await ScheduleService.getAllSchedules(req.query);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Schedules fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getScheduleById = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	const result = await ScheduleService.getScheduleById(id as string);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Schedule fetched successfully",
		data: result,
	});
});

const updateSchedule = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	const result = await ScheduleService.updateSchedule(id as string, req.body);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Schedule updated successfully",
		data: result,
	});
});

const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	await ScheduleService.deleteSchedule(id as string);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Schedule deleted successfully",
	});
});

export const ScheduleController = {
	createSchedule,
	getAllSchedules,
	getScheduleById,
	updateSchedule,
	deleteSchedule,
};
