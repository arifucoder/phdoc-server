import type { IQueryMeta } from "@/app/interfaces/query.interface";
import type { Response } from "express";

interface IResponseData<T> {
	httpStatusCode: number;
	success: boolean;
	message: string;
	meta?: IQueryMeta;
	data?: T;
}

export const sendResponse = <T>(res: Response, responseData: IResponseData<T>) => {
	const { httpStatusCode, success, message, meta, data } = responseData;

	res.status(httpStatusCode).json({
		success,
		message,
		meta,
		data,
	});
};
