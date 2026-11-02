import type { TGenericErrorResponse } from "@/app/interfaces/error.interface";
import type { Prisma } from "@/generated/prisma/client";
import httpStatus from "http-status";

// unknown value আসলেই object কিনা (null বাদে)
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

// unknown থেকে শুধু string field-গুলো নিয়ে join; array না হলে ""
const toFieldList = (value: unknown): string =>
	Array.isArray(value) ? value.filter((field): field is string => typeof field === "string").join(", ") : "";

// duplicate হওয়া field বের করা
// সাধারণ Prisma → meta.target, driver adapter (adapter-pg) → meta.driverAdapterError.cause.constraint.fields
const getConflictFields = (meta: Record<string, unknown> | undefined): string => {
	const targetFields = toFieldList(meta?.target);
	if (targetFields) return targetFields;

	const adapterError = meta?.driverAdapterError;
	if (!isRecord(adapterError) || !isRecord(adapterError.cause) || !isRecord(adapterError.cause.constraint)) {
		return "";
	}

	return toFieldList(adapterError.cause.constraint.fields);
};
// findUniqueOrThrow, update, delete ইত্যাদিতে record না পেলে, unique/foreign key ভাঙলে
export const handlePrismaKnownError = (err: Prisma.PrismaClientKnownRequestError): TGenericErrorResponse => {
	switch (err.code) {
		// Unique constraint ভঙ্গ (যেমন একই email দুবার)
		case "P2002": {
			const fields = getConflictFields(err.meta);
			const message = fields ? `${fields} already exists` : "Duplicate value already exists";
			return {
				statusCode: httpStatus.CONFLICT,
				message,
				errorSources: [{ path: fields, message }],
			};
		}

		// Foreign key ভঙ্গ (যেমন এমন doctorId দিলে যেটা নেই, বা relation থাকা record delete)
		case "P2003": {
			const message = "Related record does not exist or is still in use";
			return {
				statusCode: httpStatus.BAD_REQUEST,
				message,
				errorSources: [{ path: "", message }],
			};
		}

		// Record পাওয়া যায়নি (findUniqueOrThrow / update / delete)
		case "P2025": {
			const modelName = typeof err.meta?.modelName === "string" ? err.meta.modelName : "Record";
			const message = `${modelName} not found`;
			return {
				statusCode: httpStatus.NOT_FOUND,
				message,
				errorSources: [{ path: "", message }],
			};
		}

		// ভুল format-এর data (যেমন uuid column-এ "abc")
		case "P2023": {
			const message = "Invalid id or data format";
			return {
				statusCode: httpStatus.BAD_REQUEST,
				message,
				errorSources: [{ path: "", message }],
			};
		}

		default: {
			const message = "Database request error";
			return {
				statusCode: httpStatus.BAD_REQUEST,
				message,
				errorSources: [{ path: "", message: `${err.code}: ${message}` }],
			};
		}
	}
};

// query-র shape ভুল হলে (যেমন number field-এ string পাঠানো)
export const handlePrismaValidationError = (): TGenericErrorResponse => {
	const message = "Invalid data provided to database query";
	return {
		statusCode: httpStatus.BAD_REQUEST,
		message,
		errorSources: [{ path: "", message }],
	};
};
