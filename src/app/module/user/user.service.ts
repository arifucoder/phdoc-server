import AppError from "@/app/errorHelpers/AppError";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role, type Specialty } from "@/generated/prisma/client";
import httpStatus from "http-status";
import type { ICreateAdminPayload, ICreateDoctorPayload } from "./user.interface";
const createDoctor = async (payload: ICreateDoctorPayload) => {
	const specialties: Specialty[] = [];

	for (const specialtyId of payload.specialties) {
		const specialty = await prisma.specialty.findUnique({
			where: {
				id: specialtyId,
			},
		});
		if (!specialty) {
			// throw new Error(`Specialty with id ${specialtyId} not found`);
			throw new Error(`Specialty with id ${specialtyId} not found`);
		}
		specialties.push(specialty);
	}

	const userExists = await prisma.user.findUnique({
		where: {
			email: payload.doctor.email,
		},
	});

	if (userExists) {
		// throw new Error("User with this email already exists");
		throw new Error("User with this email already exists");
	}

	const userData = await auth.api.signUpEmail({
		body: {
			email: payload.doctor.email,
			password: payload.password,
			role: Role.DOCTOR,
			name: payload.doctor.name,
			needPasswordChange: true,
		},
	});

	try {
		const result = await prisma.$transaction(async (tx) => {
			const doctorData = await tx.doctor.create({
				data: {
					userId: userData.user.id,
					...payload.doctor,
				},
			});

			const doctorSpecialtyData = specialties.map((specialty) => {
				return {
					doctorId: doctorData.id,
					specialtyId: specialty.id,
				};
			});

			await tx.doctorSpecialty.createMany({
				data: doctorSpecialtyData,
			});

			const doctor = await tx.doctor.findUnique({
				where: {
					id: doctorData.id,
				},
				select: {
					id: true,
					userId: true,
					name: true,
					email: true,
					profilePhoto: true,
					contactNumber: true,
					address: true,
					registrationNumber: true,
					experience: true,
					gender: true,
					appointmentFee: true,
					qualification: true,
					currentWorkingPlace: true,
					designation: true,
					createdAt: true,
					updatedAt: true,
					user: {
						select: {
							id: true,
							email: true,
							name: true,
							role: true,
							status: true,
							emailVerified: true,
							image: true,
							isDeleted: true,
							deletedAt: true,
							createdAt: true,
							updatedAt: true,
						},
					},
					specialties: {
						select: {
							specialty: {
								select: {
									title: true,
									id: true,
								},
							},
						},
					},
				},
			});

			return doctor;
		});

		return result;
	} catch (error) {
		console.log("Transaction error : ", error);
		await prisma.user.delete({
			where: {
				id: userData.user.id,
			},
		});
		throw error;
	}
};

const createAdmin = async (payload: ICreateAdminPayload) => {
	const { admin, password } = payload;

	const userExists = await prisma.user.findUnique({
		where: { email: admin.email },
	});

	if (userExists) {
		throw new AppError(httpStatus.CONFLICT, "User with this email already exists");
	}

	// Better Auth-এর User table-এ শুধু তার নিজের field-গুলো পাঠানো হচ্ছে
	const userData = await auth.api.signUpEmail({
		body: {
			name: admin.name,
			email: admin.email,
			password,
			image: admin.profilePhoto,
			role: Role.ADMIN, // client থেকে না, সবসময় hardcode
			needPasswordChange: true,
		},
	});

	try {
		const adminData = await prisma.admin.create({
			data: {
				userId: userData.user.id,
				name: admin.name,
				email: admin.email,
				profilePhoto: admin.profilePhoto,
				contactNumber: admin.contactNumber,
			},
		});

		// signUpEmail auto sign-in করে session বানায়, নতুন admin-এর এটা লাগবে না
		await prisma.session.deleteMany({
			where: { userId: userData.user.id },
		});

		return adminData;
	} catch (error) {
		console.error("Error creating admin:", error);
		await prisma.user.delete({
			where: { id: userData.user.id },
		});
		throw error;
	}
};

export const UserService = {
	createDoctor,
	createAdmin,
};
