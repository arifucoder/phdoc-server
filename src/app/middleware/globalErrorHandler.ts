import type { NextFunction, Request, Response } from "express";

export const globalErrorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
	console.error(err);

	res.status(500).json({
		success: false,
		message: "Internal Server Error",
		error: err instanceof Error ? err.message : "unknown error",
	});
};
