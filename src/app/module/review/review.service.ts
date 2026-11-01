import AppError from "@/app/errorHelpers/AppError";
import type { IQueryParams, IQueryResult } from "@/app/interfaces/query.interface";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { prisma } from "@/app/lib/prisma";
import { QueryBuilder } from "@/app/utils/QueryBuilder";
import { Prisma } from "@/generated/prisma/client"; // ✅ value import, কারণ instanceof-এ লাগবে
import { AppointmentStatus, PaymentStatus, Role } from "@/generated/prisma/enums";
import httpStatus from "http-status";
import {
	reviewFilterableFields,
	reviewPublicInclude,
	reviewSearchableFields,
	reviewSortableFields,
} from "./review.constant";
import type { ICreateReviewPayload, IUpdateReviewPayload } from "./review.interface";

type ReviewWithRelations = Prisma.ReviewGetPayload<{ include: typeof reviewPublicInclude }>;

// ---------------- Helpers ----------------

// review add/update/delete হলে doctor-এর averageRating নতুন করে হিসাব
const recalculateDoctorRating = async (tx: Prisma.TransactionClient, doctorId: string) => {
	const { _avg } = await tx.review.aggregate({
		where: { doctorId },
		_avg: { rating: true },
	});

	// শেষ review মুছে গেলে _avg.rating = null → 0
	const average = _avg.rating ?? 0;

	await tx.doctor.update({
		where: { id: doctorId },
		data: { averageRating: Math.round(average * 10) / 10 }, // 4.666 → 4.7
	});
};

// review খুঁজে বের করো + এটা এই patient-এর কিনা check
const getOwnReview = async (reviewId: string, user: IRequestUser) => {
	const review = await prisma.review.findUnique({
		where: { id: reviewId },
		include: { patient: { select: { email: true } } },
	});

	if (!review) {
		throw new AppError(httpStatus.NOT_FOUND, "Review not found");
	}

	if (review.patient.email !== user.email) {
		throw new AppError(httpStatus.FORBIDDEN, "This is not your review");
	}

	return review;
};

// ---------------- Services ----------------

const giveReview = async (user: IRequestUser, payload: ICreateReviewPayload) => {
	const patientData = await prisma.patient.findUnique({
		where: { email: user.email },
	});

	if (!patientData || patientData.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Patient profile not found");
	}

	const appointmentData = await prisma.appointment.findUnique({
		where: { id: payload.appointmentId },
	});

	if (!appointmentData) {
		throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
	}

	if (appointmentData.patientId !== patientData.id) {
		throw new AppError(httpStatus.FORBIDDEN, "You can only review your own appointments");
	}

	if (appointmentData.status !== AppointmentStatus.COMPLETED) {
		throw new AppError(httpStatus.BAD_REQUEST, "You can only review a completed appointment");
	}

	if (appointmentData.paymentStatus !== PaymentStatus.PAID) {
		throw new AppError(httpStatus.BAD_REQUEST, "You can only review after payment is done");
	}

	try {
		return await prisma.$transaction(async (tx) => {
			const review = await tx.review.create({
				data: {
					appointmentId: appointmentData.id,
					rating: payload.rating,
					comment: payload.comment,
					patientId: patientData.id,
					doctorId: appointmentData.doctorId,
				},
			});

			await recalculateDoctorRating(tx, review.doctorId);

			return review;
		});
	} catch (error) {
		// appointmentId @unique — দুইবার review (বা একসাথে দুই request) হলে DB নিজেই আটকায়
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			throw new AppError(
				httpStatus.CONFLICT,
				"You have already reviewed this appointment. You can update your review instead.",
			);
		}
		throw error;
	}
};

// Public — ?doctorId=...&rating=5&sortBy=rating&page=1&limit=10
const getAllReviews = async (query: IQueryParams): Promise<IQueryResult<ReviewWithRelations>> => {
	return new QueryBuilder<ReviewWithRelations, Prisma.ReviewWhereInput, Prisma.ReviewInclude>(prisma.review, query, {
		searchableFields: reviewSearchableFields,
		filterableFields: reviewFilterableFields,
		sortableFields: reviewSortableFields,
	})
		.where({ doctor: { isDeleted: false } })
		.search()
		.filter()
		.sort()
		.paginate()
		.include(reviewPublicInclude)
		.execute();
};

// route-এ শুধু PATIENT আর DOCTOR allowed
const getMyReviews = async (user: IRequestUser) => {
	if (user.role === Role.PATIENT) {
		return prisma.review.findMany({
			where: { patient: { email: user.email } },
			include: { doctor: { select: { id: true, name: true, profilePhoto: true, designation: true } } },
			orderBy: { createdAt: "desc" },
		});
	}

	return prisma.review.findMany({
		where: { doctor: { email: user.email } },
		include: { patient: { select: { name: true, profilePhoto: true } } },
		orderBy: { createdAt: "desc" },
	});
};

const updateReview = async (user: IRequestUser, reviewId: string, payload: IUpdateReviewPayload) => {
	const review = await getOwnReview(reviewId, user);

	return prisma.$transaction(async (tx) => {
		const updatedReview = await tx.review.update({
			where: { id: review.id },
			data: payload,
		});

		// শুধু comment বদলালে average হিসাবের দরকার নেই
		if (payload.rating !== undefined) {
			await recalculateDoctorRating(tx, updatedReview.doctorId);
		}

		return updatedReview;
	});
};

const deleteReview = async (user: IRequestUser, reviewId: string) => {
	const review = await getOwnReview(reviewId, user);

	return prisma.$transaction(async (tx) => {
		const deletedReview = await tx.review.delete({
			where: { id: review.id },
		});

		await recalculateDoctorRating(tx, deletedReview.doctorId);

		return deletedReview;
	});
};

export const ReviewService = {
	giveReview,
	getAllReviews,
	getMyReviews,
	updateReview,
	deleteReview,
};
