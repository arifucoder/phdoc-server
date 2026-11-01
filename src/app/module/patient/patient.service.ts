import { deleteFileFromCloudinary } from "@/app/config/cloudinary.config";
import AppError from "@/app/errorHelpers/AppError";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { prisma } from "@/app/lib/prisma";
import httpStatus from "http-status";
import type { THealthDataInput, TUpdatePatientProfilePayload } from "./patient.interface";

// প্রথমবার create করতে এগুলো লাগবেই (Prisma schema-তে required)
const REQUIRED_HEALTH_FIELDS = ["gender", "dateOfBirth", "bloodGroup", "height", "weight"] as const;
type TRequiredHealthField = (typeof REQUIRED_HEALTH_FIELDS)[number];

// type guard: true হলে TS জানবে এই field-গুলো আর undefined না
const hasRequiredHealthFields = (
	data: THealthDataInput,
): data is THealthDataInput & Required<Pick<THealthDataInput, TRequiredHealthField>> =>
	REQUIRED_HEALTH_FIELDS.every((field) => data[field] !== undefined);

const updateMyProfile = async (user: IRequestUser, payload: TUpdatePatientProfilePayload) => {
	const { patientInfo, patientHealthData, medicalReports, profilePhoto, newMedicalReports } = payload;

	const hasAnyUpdate =
		patientInfo || patientHealthData || profilePhoto || medicalReports?.length || newMedicalReports?.length;
	if (!hasAnyUpdate) {
		throw new AppError(httpStatus.BAD_REQUEST, "Nothing to update");
	}

	const patient = await prisma.patient.findUnique({
		where: { userId: user.userId },
		include: { patientHealthData: { select: { id: true } } },
	});
	if (!patient || patient.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Patient not found");
	}

	// শুধু নিজের report-ই delete করা যাবে (IDOR fix)
	const reportIdsToDelete = [...new Set(medicalReports?.map((r) => r.reportId) ?? [])];
	const reportsToDelete =
		reportIdsToDelete.length > 0
			? await prisma.medicalReport.findMany({
					where: { id: { in: reportIdsToDelete }, patientId: patient.id },
					select: { id: true, reportLink: true },
				})
			: [];
	if (reportsToDelete.length !== reportIdsToDelete.length) {
		throw new AppError(httpStatus.NOT_FOUND, "One or more medical reports not found");
	}

	await prisma.$transaction(async (tx) => {
		if (patientInfo || profilePhoto) {
			await tx.patient.update({
				where: { id: patient.id },
				data: { ...patientInfo, profilePhoto }, // undefined হলে Prisma field-টা skip করে
			});
		}

		if (patientInfo?.name || profilePhoto) {
			await tx.user.update({
				where: { id: patient.userId },
				data: { name: patientInfo?.name, image: profilePhoto },
			});
		}

		if (patientHealthData) {
			if (patient.patientHealthData) {
				await tx.patientHealthData.update({
					where: { patientId: patient.id },
					data: patientHealthData,
				});
			} else {
				if (!hasRequiredHealthFields(patientHealthData)) {
					throw new AppError(
						httpStatus.BAD_REQUEST,
						`First time health data requires: ${REQUIRED_HEALTH_FIELDS.join(", ")}`,
					);
				}
				await tx.patientHealthData.create({
					data: { ...patientHealthData, patientId: patient.id },
				});
			}
		}

		if (reportsToDelete.length > 0) {
			await tx.medicalReport.deleteMany({
				where: { id: { in: reportsToDelete.map((r) => r.id) }, patientId: patient.id },
			});
		}

		if (newMedicalReports?.length) {
			await tx.medicalReport.createMany({
				data: newMedicalReports.map((report) => ({ ...report, patientId: patient.id })),
			});
		}
	});

	// DB commit সফল হওয়ার পরেই পুরনো file মুছি
	const oldFileUrls = reportsToDelete.map((r) => r.reportLink);
	if (profilePhoto && patient.profilePhoto) {
		oldFileUrls.push(patient.profilePhoto);
	}
	// একটা file মুছতে fail করলেও request fail হবে না (DB তো আপডেট হয়েই গেছে)
	await Promise.allSettled(oldFileUrls.map((url) => deleteFileFromCloudinary(url)));

	return prisma.patient.findUnique({
		where: { id: patient.id },
		include: {
			user: { select: { id: true, name: true, email: true, image: true, role: true } },
			patientHealthData: true,
			medicalReports: { orderBy: { createdAt: "desc" } },
		},
	});
};

export const PatientService = {
	updateMyProfile,
};
