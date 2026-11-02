import AppError from "@/app/errorHelpers/AppError";
import type { Request } from "express";
import httpStatus from "http-status";

// req.params-এর type string | string[]; runtime-এ check করে string নিশ্চিত করি
export const getParam = (req: Request, key: string): string => {
	const value = req.params[key];

	if (typeof value !== "string" || !value) {
		throw new AppError(httpStatus.BAD_REQUEST, `Route parameter "${key}" is required`);
	}

	return value;
};
