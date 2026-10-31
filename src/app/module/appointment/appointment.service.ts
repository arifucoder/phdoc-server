import { envVars } from "@/app/config/env";
import { stripe } from "@/app/config/stripe.config";
import AppError from "@/app/errorHelpers/AppError";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { prisma } from "@/app/lib/prisma";
import { AppointmentStatus, PaymentStatus, Role } from "@/generated/prisma/enums";
import httpStatus from "http-status";
import { v7 as uuidv7 } from "uuid";
import type { IBookAppointmentPayload } from "./appointment.interface";

const UNPAID_APPOINTMENT_TIMEOUT_MINUTES = 30;

// ---------------- Helpers ----------------

// Appointment + slot booking + payment, সব একটা DB transaction-এ।
// এখানে কোনো বাইরের API call নেই।
const createAppointmentWithPayment = async (payload: IBookAppointmentPayload, user: IRequestUser) => {
	const patientData = await prisma.patient.findUnique({
		where: { email: user.email },
	});

	if (!patientData || patientData.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Patient profile not found");
	}

	const doctorData = await prisma.doctor.findUnique({
		where: { id: payload.doctorId, isDeleted: false },
	});

	if (!doctorData) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor not found");
	}

	const doctorSchedule = await prisma.doctorSchedules.findUnique({
		where: {
			doctorId_scheduleId: {
				doctorId: payload.doctorId,
				scheduleId: payload.scheduleId,
			},
		},
		include: { schedule: true },
	});

	if (!doctorSchedule) {
		throw new AppError(httpStatus.NOT_FOUND, "This doctor is not available on the selected schedule");
	}

	if (doctorSchedule.schedule.startDateTime <= new Date()) {
		throw new AppError(httpStatus.BAD_REQUEST, "You cannot book a schedule that has already started");
	}

	const { appointment, payment } = await prisma.$transaction(async (tx) => {
		// Atomic booking: slot ফাঁকা থাকলেই শুধু isBooked = true হবে।
		// দুইজন একসাথে চেষ্টা করলে একজনের count হবে 0।
		const { count } = await tx.doctorSchedules.updateMany({
			where: {
				doctorId: payload.doctorId,
				scheduleId: payload.scheduleId,
				isBooked: false,
			},
			data: { isBooked: true },
		});

		if (count === 0) {
			throw new AppError(httpStatus.CONFLICT, "This schedule is already booked");
		}

		const newAppointment = await tx.appointment.create({
			data: {
				doctorId: payload.doctorId,
				patientId: patientData.id,
				scheduleId: payload.scheduleId,
				videoCallingId: uuidv7(),
			},
		});

		const newPayment = await tx.payment.create({
			data: {
				appointmentId: newAppointment.id,
				amount: doctorData.appointmentFee,
				transactionId: uuidv7(),
			},
		});

		return { appointment: newAppointment, payment: newPayment };
	});

	return { appointment, payment, doctor: doctorData };
};

interface ICheckoutSessionParams {
	appointmentId: string;
	paymentId: string;
	doctorName: string;
	amount: number;
}

const createCheckoutSession = async ({ appointmentId, paymentId, doctorName, amount }: ICheckoutSessionParams) => {
	const session = await stripe.checkout.sessions.create({
		allowed_payment_method_types: ["card"],
		mode: "payment",
		line_items: [
			{
				price_data: {
					currency: "bdt",
					product_data: {
						name: `Appointment with Dr. ${doctorName}`,
					},
					// Float * 100 থেকে 1998.9999 এর মতো মান আসতে পারে, Stripe চায় integer
					unit_amount: Math.round(amount * 100),
				},
				quantity: 1,
			},
		],
		metadata: { appointmentId, paymentId },
		success_url: `${envVars.FRONTEND_URL}/dashboard/payment/payment-success?appointment_id=${appointmentId}&payment_id=${paymentId}`,
		cancel_url: `${envVars.FRONTEND_URL}/dashboard/appointments?error=payment_cancelled`,
	});

	if (!session.url) {
		throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create payment session");
	}

	return session.url;
};

type TStatusTransitions = Partial<Record<AppointmentStatus, AppointmentStatus[]>>;

// Rule 2: Doctor শুধু এই পরিবর্তনগুলো করতে পারবে
const DOCTOR_ALLOWED_TRANSITIONS: TStatusTransitions = {
	[AppointmentStatus.SCHEDULED]: [AppointmentStatus.INPROGRESS, AppointmentStatus.CANCELED],
	[AppointmentStatus.INPROGRESS]: [AppointmentStatus.COMPLETED],
};

// Rule 3: Patient শুধু scheduled appointment cancel করতে পারবে
const PATIENT_ALLOWED_TRANSITIONS: TStatusTransitions = {
	[AppointmentStatus.SCHEDULED]: [AppointmentStatus.CANCELED],
};

const assertAllowedTransition = (rules: TStatusTransitions, from: AppointmentStatus, to: AppointmentStatus) => {
	if (!rules[from]?.includes(to)) {
		throw new AppError(httpStatus.BAD_REQUEST, `You cannot change appointment status from ${from} to ${to}`);
	}
};

// ---------------- Services ----------------

// Pay Now
const bookAppointment = async (payload: IBookAppointmentPayload, user: IRequestUser) => {
	const { appointment, payment, doctor } = await createAppointmentWithPayment(payload, user);

	// Stripe call transaction-এর বাইরে।
	// এটা fail করলেও appointment UNPAID অবস্থায় থাকবে। Patient পরে initiatePayment দিয়ে
	// আবার চেষ্টা করতে পারবে, না করলে cron ৩০ মিনিট পর cancel করে দেবে।
	const paymentUrl = await createCheckoutSession({
		appointmentId: appointment.id,
		paymentId: payment.id,
		doctorName: doctor.name,
		amount: doctor.appointmentFee,
	});

	return { appointment, payment, paymentUrl };
};

// Pay Later
const bookAppointmentWithPayLater = async (payload: IBookAppointmentPayload, user: IRequestUser) => {
	const { appointment, payment } = await createAppointmentWithPayment(payload, user);
	return { appointment, payment };
};

const getMyAppointments = async (user: IRequestUser) => {
	if (user.role === Role.PATIENT) {
		return prisma.appointment.findMany({
			where: { patient: { email: user.email } },
			include: { doctor: true, schedule: true },
			orderBy: { createdAt: "desc" },
		});
	}

	if (user.role === Role.DOCTOR) {
		return prisma.appointment.findMany({
			where: { doctor: { email: user.email } },
			include: { patient: true, schedule: true },
			orderBy: { createdAt: "desc" },
		});
	}

	throw new AppError(httpStatus.FORBIDDEN, "Only patients and doctors can view their appointments");
};

const getMySingleAppointment = async (appointmentId: string, user: IRequestUser) => {
	if (user.role !== Role.PATIENT && user.role !== Role.DOCTOR) {
		throw new AppError(httpStatus.FORBIDDEN, "Only patients and doctors can view their appointments");
	}

	const appointment =
		user.role === Role.PATIENT
			? await prisma.appointment.findFirst({
					where: { id: appointmentId, patient: { email: user.email } },
					include: { doctor: true, schedule: true },
				})
			: await prisma.appointment.findFirst({
					where: { id: appointmentId, doctor: { email: user.email } },
					include: { patient: true, schedule: true },
				});

	if (!appointment) {
		throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
	}

	return appointment;
};

// TODO: integrate query builder
const getAllAppointments = async () => {
	return prisma.appointment.findMany({
		include: { doctor: true, patient: true, schedule: true },
	});
};

const changeAppointmentStatus = async (appointmentId: string, newStatus: AppointmentStatus, user: IRequestUser) => {
	const appointmentData = await prisma.appointment.findUnique({
		where: { id: appointmentId },
		include: { doctor: true, patient: true },
	});

	if (!appointmentData) {
		throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
	}

	// Rule 1: Completed বা Canceled হলে আর কেউ বদলাতে পারবে না
	if (appointmentData.status === AppointmentStatus.COMPLETED || appointmentData.status === AppointmentStatus.CANCELED) {
		throw new AppError(httpStatus.BAD_REQUEST, `Appointment is already ${appointmentData.status}`);
	}

	if (appointmentData.status === newStatus) {
		throw new AppError(httpStatus.BAD_REQUEST, `Appointment is already ${newStatus}`);
	}

	if (user.role === Role.DOCTOR) {
		if (appointmentData.doctor.email !== user.email) {
			throw new AppError(httpStatus.FORBIDDEN, "This is not your appointment");
		}
		assertAllowedTransition(DOCTOR_ALLOWED_TRANSITIONS, appointmentData.status, newStatus);
	} else if (user.role === Role.PATIENT) {
		if (appointmentData.patient.email !== user.email) {
			throw new AppError(httpStatus.FORBIDDEN, "This is not your appointment");
		}
		assertAllowedTransition(PATIENT_ALLOWED_TRANSITIONS, appointmentData.status, newStatus);
	}
	// Rule 4: ADMIN / SUPER_ADMIN যেকোনো status দিতে পারবে

	return prisma.$transaction(async (tx) => {
		const updatedAppointment = await tx.appointment.update({
			where: { id: appointmentId },
			data: { status: newStatus },
		});

		// Cancel হলে slot আবার ফাঁকা করে দাও
		if (newStatus === AppointmentStatus.CANCELED) {
			await tx.doctorSchedules.updateMany({
				where: {
					doctorId: appointmentData.doctorId,
					scheduleId: appointmentData.scheduleId,
				},
				data: { isBooked: false },
			});
		}

		return updatedAppointment;
	});
};

const initiatePayment = async (appointmentId: string, user: IRequestUser) => {
	const appointmentData = await prisma.appointment.findFirst({
		where: { id: appointmentId, patient: { email: user.email } },
		include: { doctor: true, payment: true },
	});

	if (!appointmentData) {
		throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
	}

	// Canceled check আগে, কারণ cron cancel করার সময় payment delete করে দেয়
	if (appointmentData.status === AppointmentStatus.CANCELED) {
		throw new AppError(httpStatus.BAD_REQUEST, "Appointment is canceled");
	}

	if (!appointmentData.payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment data not found for this appointment");
	}

	if (appointmentData.payment.status === PaymentStatus.PAID) {
		throw new AppError(httpStatus.BAD_REQUEST, "Payment already completed for this appointment");
	}

	const paymentUrl = await createCheckoutSession({
		appointmentId: appointmentData.id,
		paymentId: appointmentData.payment.id,
		doctorName: appointmentData.doctor.name,
		amount: appointmentData.doctor.appointmentFee,
	});

	return { paymentUrl };
};

const cancelUnpaidAppointments = async () => {
	const cutoffTime = new Date(Date.now() - UNPAID_APPOINTMENT_TIMEOUT_MINUTES * 60 * 1000);

	const unpaidAppointments = await prisma.appointment.findMany({
		where: {
			status: AppointmentStatus.SCHEDULED, // ✅ Completed বা Canceled ছোঁয়া হবে না
			paymentStatus: PaymentStatus.UNPAID,
			createdAt: { lte: cutoffTime },
		},
		select: { id: true, doctorId: true, scheduleId: true },
	});

	if (unpaidAppointments.length === 0) {
		return { canceledCount: 0 };
	}

	const appointmentIds = unpaidAppointments.map((appointment) => appointment.id);

	await prisma.$transaction(async (tx) => {
		await tx.appointment.updateMany({
			where: { id: { in: appointmentIds } },
			data: { status: AppointmentStatus.CANCELED },
		});

		await tx.payment.deleteMany({
			where: { appointmentId: { in: appointmentIds } },
		});

		for (const appointment of unpaidAppointments) {
			await tx.doctorSchedules.updateMany({
				where: { doctorId: appointment.doctorId, scheduleId: appointment.scheduleId },
				data: { isBooked: false },
			});
		}
	});

	return { canceledCount: appointmentIds.length };
};

export const AppointmentService = {
	bookAppointment,
	getMyAppointments,
	changeAppointmentStatus,
	getMySingleAppointment,
	getAllAppointments,
	bookAppointmentWithPayLater,
	initiatePayment,
	cancelUnpaidAppointments,
};
