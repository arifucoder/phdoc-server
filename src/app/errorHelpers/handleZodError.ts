import httpStatus from "http-status";
import type { ZodError } from "zod";
import type { TErrorSources, TGenericErrorResponse } from "../interfaces/error.interface";

export const handleZodError = (err: ZodError): TGenericErrorResponse => {
	const errorSources: TErrorSources[] = err.issues.map((issue) => ({
		path: issue.path.map(String).join("."),
		message: issue.message,
	}));

	return {
		statusCode: httpStatus.BAD_REQUEST,
		message: "Validation Error",
		errorSources,
	};
};
