import AppError from "@/app/errorHelpers/AppError";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { StatsService } from "./stats.service";

const getAuthUser = (req: Request): IRequestUser => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access! Please log in.");
	}
	return req.user;
};

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const result = await StatsService.getDashboardStats(user);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Stats data retrieved successfully",
		data: result,
	});
});

export const StatsController = {
	getDashboardStats,
};
