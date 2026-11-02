import AppError from "@/app/errorHelpers/AppError";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { AppointmentStatus, PaymentStatus, Role } from "@/generated/prisma/enums";
import httpStatus from "http-status";

// ---------------- Helpers ----------------

// সব status ফেরত দেয় — কোনো status-এর appointment না থাকলে count: 0
const getAppointmentStatusDistribution = async (where: Prisma.AppointmentWhereInput = {}) => {
	const grouped = await prisma.appointment.groupBy({
		by: ["status"],
		_count: { id: true },
		where,
	});

	return Object.values(AppointmentStatus).map((status) => ({
		status,
		count: grouped.find((item) => item.status === status)?._count.id ?? 0,
	}));
};

// শুধু PAID payment-এর যোগফল
const getTotalRevenue = async (where: Prisma.PaymentWhereInput = {}) => {
	const { _sum } = await prisma.payment.aggregate({
		_sum: { amount: true },
		where: { ...where, status: PaymentStatus.PAID },
	});

	return _sum.amount ?? 0;
};

interface IMonthlyAppointmentCount {
	month: Date;
	count: number; // SQL-এ INTEGER-এ CAST করছি, তাই bigint না
}

// শেষ ১২ মাসের মাস-ভিত্তিক appointment সংখ্যা (bar chart)
const getMonthlyAppointmentCount = () => {
	return prisma.$queryRaw<IMonthlyAppointmentCount[]>`
		SELECT DATE_TRUNC('month', "createdAt") AS month,
			CAST(COUNT(*) AS INTEGER) AS count
		FROM "appointments"
		WHERE "createdAt" >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
		GROUP BY month
		ORDER BY month ASC;
	`;
};

// ---------------- Role-wise stats ----------------

// ADMIN আর SUPER_ADMIN দুজনেরই কমন অংশ
const getCommonAdminStats = async () => {
	const [
		appointmentCount,
		doctorCount,
		patientCount,
		adminCount,
		userCount,
		paidPaymentCount,
		totalRevenue,
		pieChartData,
		barChartData,
	] = await Promise.all([
		prisma.appointment.count(),
		prisma.doctor.count({ where: { isDeleted: false } }),
		prisma.patient.count({ where: { isDeleted: false } }),
		prisma.admin.count({ where: { isDeleted: false, user: { role: Role.ADMIN } } }),
		prisma.user.count({ where: { isDeleted: false } }),
		prisma.payment.count({ where: { status: PaymentStatus.PAID } }),
		getTotalRevenue(),
		getAppointmentStatusDistribution(),
		getMonthlyAppointmentCount(),
	]);

	return {
		appointmentCount,
		doctorCount,
		patientCount,
		adminCount,
		userCount,
		paidPaymentCount,
		totalRevenue,
		pieChartData,
		barChartData,
	};
};

const getSuperAdminStats = async () => {
	const [commonStats, superAdminCount] = await Promise.all([
		getCommonAdminStats(),
		prisma.admin.count({ where: { isDeleted: false, user: { role: Role.SUPER_ADMIN } } }),
	]);

	return { ...commonStats, superAdminCount };
};

const getDoctorStats = async (user: IRequestUser) => {
	const doctor = await prisma.doctor.findUnique({
		where: { email: user.email },
		select: { id: true, averageRating: true },
	});

	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor profile not found");
	}

	const [appointmentCount, uniquePatients, reviewCount, totalRevenue, appointmentStatusDistribution] =
		await Promise.all([
			prisma.appointment.count({ where: { doctorId: doctor.id } }),
			prisma.appointment.findMany({
				where: { doctorId: doctor.id },
				distinct: ["patientId"],
				select: { patientId: true },
			}),
			prisma.review.count({ where: { doctorId: doctor.id } }),
			getTotalRevenue({ appointment: { doctorId: doctor.id } }),
			getAppointmentStatusDistribution({ doctorId: doctor.id }),
		]);

	return {
		appointmentCount,
		patientCount: uniquePatients.length,
		reviewCount,
		averageRating: doctor.averageRating,
		totalRevenue,
		appointmentStatusDistribution,
	};
};

const getPatientStats = async (user: IRequestUser) => {
	const patient = await prisma.patient.findUnique({
		where: { email: user.email },
		select: { id: true },
	});

	if (!patient) {
		throw new AppError(httpStatus.NOT_FOUND, "Patient profile not found");
	}

	const [appointmentCount, upcomingAppointmentCount, reviewCount, totalSpent, appointmentStatusDistribution] =
		await Promise.all([
			prisma.appointment.count({ where: { patientId: patient.id } }),
			// upcoming = SCHEDULED + সময় এখনো আসেনি (পার হয়ে যাওয়া SCHEDULED বাদ)
			prisma.appointment.count({
				where: {
					patientId: patient.id,
					status: AppointmentStatus.SCHEDULED,
					schedule: { startDateTime: { gte: new Date() } },
				},
			}),
			prisma.review.count({ where: { patientId: patient.id } }),
			getTotalRevenue({ appointment: { patientId: patient.id } }),
			getAppointmentStatusDistribution({ patientId: patient.id }),
		]);

	return {
		appointmentCount,
		upcomingAppointmentCount,
		reviewCount,
		totalSpent,
		appointmentStatusDistribution,
	};
};

// ---------------- Main ----------------

const getDashboardStats = (user: IRequestUser) => {
	switch (user.role) {
		case Role.SUPER_ADMIN:
			return getSuperAdminStats();
		case Role.ADMIN:
			return getCommonAdminStats();
		case Role.DOCTOR:
			return getDoctorStats(user);
		case Role.PATIENT:
			return getPatientStats(user);
		default:
			throw new AppError(httpStatus.BAD_REQUEST, "Invalid user role");
	}
};

export const StatsService = {
	getDashboardStats,
};
