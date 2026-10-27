import AppError from "@/app/errorHelpers/AppError";
import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AdminService } from "./admin.service";

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
	const result = await AdminService.getAllAdmins();

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Admins fetched successfully",
		data: result,
	});
});

const getAdminById = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	const result = await AdminService.getAdminById(id as string);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Admin fetched successfully",
		data: result,
	});
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access! Please log in.");
	}

	const result = await AdminService.updateAdmin(id as string, req.body, req.user);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Admin updated successfully",
		data: result,
	});
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access! Please log in.");
	}

	const result = await AdminService.deleteAdmin(id as string, req.user);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Admin deleted successfully",
		data: result,
	});
});

export const AdminController = {
	getAllAdmins,
	getAdminById,
	updateAdmin,
	deleteAdmin,
};
