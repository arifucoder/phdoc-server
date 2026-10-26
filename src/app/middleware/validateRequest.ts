import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export const validateRequest = (zodSchema: ZodType) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		const parsedResult = await zodSchema.safeParseAsync(req.body);

		if (!parsedResult.success) {
			return next(parsedResult.error);
		}

		// sanitizing the data
		req.body = parsedResult.data;
		next();
	};
};
