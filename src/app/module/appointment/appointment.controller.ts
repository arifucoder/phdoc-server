import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errorHelpers/AppError";
import type { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AppointmentService } from "./appointment.service";

// checkAuth সবসময় req.user set করে, কিন্তু TypeScript সেটা জানে না।
// তাই এখানে একবার check করে নিশ্চিত IRequestUser ফেরত দিচ্ছি।
const getAuthUser = (req: Request): IRequestUser => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access! Please log in.");
	}
	return req.user;
};

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const appointment = await AppointmentService.bookAppointment(req.body, user);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.CREATED,
		message: "Appointment booked successfully",
		data: appointment,
	});
});

const getMyAppointments = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const appointments = await AppointmentService.getMyAppointments(user);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.OK,
		message: "Appointments retrieved successfully",
		data: appointments,
	});
});

const changeAppointmentStatus = catchAsync(async (req: Request, res: Response) => {
	const appointmentId = req.params.id as string;
	const { status } = req.body; // ✅ পুরো body না, শুধু status
	const user = getAuthUser(req);

	const updatedAppointment = await AppointmentService.changeAppointmentStatus(appointmentId, status, user);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.OK,
		message: "Appointment status updated successfully",
		data: updatedAppointment,
	});
});

const getMySingleAppointment = catchAsync(async (req: Request, res: Response) => {
	const appointmentId = req.params.id as string;
	const user = getAuthUser(req);

	const appointment = await AppointmentService.getMySingleAppointment(appointmentId, user);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.OK,
		message: "Appointment retrieved successfully",
		data: appointment,
	});
});

const getAllAppointments = catchAsync(async (_req: Request, res: Response) => {
	const appointments = await AppointmentService.getAllAppointments();

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.OK,
		message: "All appointments retrieved successfully",
		data: appointments,
	});
});

const bookAppointmentWithPayLater = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthUser(req);
	const appointment = await AppointmentService.bookAppointmentWithPayLater(req.body, user);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.CREATED,
		message: "Appointment booked successfully with Pay Later option",
		data: appointment,
	});
});

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
	const appointmentId = req.params.id as string;
	const user = getAuthUser(req);

	const paymentInfo = await AppointmentService.initiatePayment(appointmentId, user);

	sendResponse(res, {
		success: true,
		httpStatusCode: httpStatus.OK,
		message: "Payment initiated successfully",
		data: paymentInfo,
	});
});

export const AppointmentController = {
	bookAppointment,
	getMyAppointments,
	changeAppointmentStatus,
	getMySingleAppointment,
	getAllAppointments,
	bookAppointmentWithPayLater,
	initiatePayment,
};
