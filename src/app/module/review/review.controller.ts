import AppError from "@/app/errorHelpers/AppError";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { catchAsync } from "@/app/shared/catchAsync";
import { getParam } from "@/app/shared/getParam";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { ReviewService } from "./review.service";

const getAuthUser = (req: Request): IRequestUser => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access! Please log in.");
	}
	return req.user;
};

const giveReview = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const result = await ReviewService.giveReview(user, req.body);

	sendResponse(res, {
		httpStatusCode: httpStatus.CREATED,
		success: true,
		message: "Review created successfully",
		data: result,
	});
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
	const result = await ReviewService.getAllReviews(req.query);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Reviews retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const result = await ReviewService.getMyReviews(user);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Reviews retrieved successfully",
		data: result,
	});
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const reviewId = getParam(req, "id");
	const result = await ReviewService.updateReview(user, reviewId, req.body);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Review updated successfully",
		data: result,
	});
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const reviewId = getParam(req, "id");
	const result = await ReviewService.deleteReview(user, reviewId);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Review deleted successfully",
		data: result,
	});
});

export const ReviewController = {
	giveReview,
	getAllReviews,
	getMyReviews,
	updateReview,
	deleteReview,
};
