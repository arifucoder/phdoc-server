import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";

export const globalErrorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
	console.error(err);

	res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
		success: false,
		message: "Internal Server Error",
		error: err instanceof Error ? err.message : "unknown error",
	});
};
