import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { ZodType } from "zod";
import AppError from "../errorHelpers/AppError";

export const validateRequest = (zodSchema: ZodType) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		// form-data থেকে আসা JSON string → object
		if (typeof req.body?.data === "string") {
			try {
				req.body = JSON.parse(req.body.data);
			} catch {
				return next(new AppError(httpStatus.BAD_REQUEST, "Invalid JSON in 'data' field"));
			}
		}

		const parsedResult = await zodSchema.safeParseAsync(req.body);

		if (!parsedResult.success) {
			return next(parsedResult.error);
		}

		// sanitizing the data
		req.body = parsedResult.data;
		next();
	};
};
