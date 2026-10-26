/* eslint-disable @typescript-eslint/no-unused-vars */
import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod"; // ✅ value import, কারণ instanceof-এ লাগবে
import { envVars } from "../config/env";
import AppError from "../errorHelpers/AppError";
import { handleZodError } from "../errorHelpers/handleZodError";
import type { TErrorResponse, TErrorSources } from "../interfaces/error.interface";

export const globalErrorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
	const isDev = envVars.NODE_ENV === "development";

	if (isDev) {
		console.log("Error from Global Error Handler", err);
	}

	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let message = "Internal Server Error";
	let errorSources: TErrorSources[] = [{ path: "", message }];
	let stack: string | undefined;

	if (err instanceof ZodError) {
		const simplifiedError = handleZodError(err);
		statusCode = simplifiedError.statusCode;
		message = simplifiedError.message;
		errorSources = simplifiedError.errorSources;
		stack = err.stack;
	} else if (err instanceof AppError) {
		statusCode = err.statusCode;
		message = err.message;
		errorSources = [{ path: "", message: err.message }];
		stack = err.stack;
	} else if (err instanceof Error) {
		// production-এ internal message লুকানো হচ্ছে
		message = isDev ? err.message : "Something went wrong";
		errorSources = [{ path: "", message }];
		stack = err.stack;
	}

	const errorResponse: TErrorResponse = {
		success: false,
		message,
		errorSources,
		error: isDev ? err : undefined,
		stack: isDev ? stack : undefined,
	};

	res.status(statusCode).json(errorResponse);
};
