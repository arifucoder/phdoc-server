import AppError from "@/app/errorHelpers/AppError";
import { prisma } from "@/app/lib/prisma";
import { UserStatus } from "@/generated/prisma/enums";
import httpStatus from "http-status";
import type { IUpdateDoctorPayload } from "./doctor.interface";

// reusable include, so every query returns the same shape
const doctorInclude = {
	user: true,
	specialties: {
		include: {
			specialty: true,
		},
	},
} as const;

const getAllDoctors = async () => {
	const doctors = await prisma.doctor.findMany({
		where: { isDeleted: false },
		include: doctorInclude,
	});
	return doctors;
};

const getDoctorById = async (id: string) => {
	const doctor = await prisma.doctor.findUnique({
		where: { id, isDeleted: false },
		include: doctorInclude,
	});

	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor not found");
	}

	return doctor;
};

const updateDoctor = async (id: string, payload: IUpdateDoctorPayload) => {
	const isDoctorExist = await prisma.doctor.findUnique({
		where: { id, isDeleted: false },
	});

	if (!isDoctorExist) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor not found");
	}

	const { doctor } = payload;

	const updatedDoctor = await prisma.$transaction(async (tx) => {
		// keep User table in sync (used in login / JWT)
		if (doctor.name !== undefined || doctor.profilePhoto !== undefined) {
			await tx.user.update({
				where: { id: isDoctorExist.userId },
				data: {
					name: doctor.name,
					image: doctor.profilePhoto,
				},
			});
		}

		return tx.doctor.update({
			where: { id },
			data: doctor,
			include: doctorInclude,
		});
	});

	return updatedDoctor;
};

//soft delete doctor by setting isDeleted to true and also delete the user session and account
const deleteDoctor = async (id: string) => {
	const isDoctorExist = await prisma.doctor.findUnique({
		where: { id, isDeleted: false },
	});

	if (!isDoctorExist) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor not found");
	}

	const deletedAt = new Date();

	const result = await prisma.$transaction(async (tx) => {
		await tx.doctor.update({
			where: { id },
			data: { isDeleted: true, deletedAt },
		});

		await tx.user.update({
			where: { id: isDoctorExist.userId },
			data: {
				isDeleted: true,
				deletedAt,
				status: UserStatus.DELETED,
			},
		});

		await tx.session.deleteMany({
			where: { userId: isDoctorExist.userId },
		});

		await tx.account.deleteMany({
			where: { userId: isDoctorExist.userId },
		});

		return tx.doctor.findUnique({
			where: { id },
			include: doctorInclude,
		});
	});

	return result;
};

export const DoctorService = {
	getAllDoctors,
	getDoctorById,
	updateDoctor,
	deleteDoctor,
};
