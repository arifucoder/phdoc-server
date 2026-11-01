import { deleteFileFromCloudinary, uploadFileToCloudinary } from "@/app/config/cloudinary.config";
import AppError from "@/app/errorHelpers/AppError";
import type { IQueryParams, IQueryResult } from "@/app/interfaces/query.interface";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { prisma } from "@/app/lib/prisma";
import { sendEmail } from "@/app/utils/email";
import { formatDate, formatDateTime } from "@/app/utils/pdf";
import { QueryBuilder } from "@/app/utils/QueryBuilder";
import { Prisma } from "@/generated/prisma/client"; // ✅ value import, কারণ instanceof-এ লাগবে
import { AppointmentStatus, Role } from "@/generated/prisma/enums";
import httpStatus from "http-status";
import { v7 as uuidv7 } from "uuid";
import {
	prescriptionFilterableFields,
	prescriptionInclude,
	prescriptionPdfInclude,
	prescriptionSearchableFields,
	prescriptionSortableFields,
} from "./prescription.constant";
import type { ICreatePrescriptionPayload, IUpdatePrescriptionPayload } from "./prescription.interface";
import { generatePrescriptionPdf, type IPrescriptionPdfData } from "./prescription.utils";
type PrescriptionWithRelations = Prisma.PrescriptionGetPayload<{ include: typeof prescriptionInclude }>;

interface IUploadedPdf {
	pdfBuffer: Buffer;
	fileName: string;
	pdfUrl: string;
}

// ---------------- Helpers ----------------

const getSpecializationText = (specialties: { specialty: { title: string } }[]): string =>
	specialties.map((item) => item.specialty.title).join(", ") || "General Physician";

const getDoctorByEmail = async (email: string) => {
	const doctor = await prisma.doctor.findUnique({
		where: { email },
		include: { specialties: { select: { specialty: { select: { title: true } } } } },
	});

	if (!doctor || doctor.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor profile not found");
	}

	return doctor;
};

// prescription খুঁজে বের করো + এটা এই doctor-এর কিনা check
const getOwnPrescription = async (prescriptionId: string, user: IRequestUser) => {
	const prescription = await prisma.prescription.findUnique({
		where: { id: prescriptionId },
		include: prescriptionPdfInclude,
	});

	if (!prescription) {
		throw new AppError(httpStatus.NOT_FOUND, "Prescription not found");
	}

	if (prescription.doctor.email !== user.email) {
		throw new AppError(httpStatus.FORBIDDEN, "This is not your prescription");
	}

	return prescription;
};

// PDF বানাও → Cloudinary-তে upload
const createAndUploadPdf = async (data: IPrescriptionPdfData): Promise<IUploadedPdf> => {
	const pdfBuffer = await generatePrescriptionPdf(data);
	const fileName = `prescription-${data.prescriptionId}.pdf`;
	const uploaded = await uploadFileToCloudinary(pdfBuffer, fileName);

	return { pdfBuffer, fileName, pdfUrl: uploaded.secure_url };
};

// file মুছতে না পারলে শুধু log — মূল কাজ যেন fail না করে
const safeDeleteFile = async (url: string | null) => {
	if (!url) return;

	try {
		await deleteFileFromCloudinary(url);
	} catch (error) {
		console.error("Failed to delete file from Cloudinary:", error);
	}
};

// await করছি না — email-এর জন্য response আটকে থাকবে না, fail হলেও prescription থাকবে
const sendPrescriptionEmail = (subject: string, data: IPrescriptionPdfData, pdf: IUploadedPdf) => {
	sendEmail({
		to: data.patientEmail,
		subject,
		templateName: "prescription",
		templateData: {
			patientName: data.patientName,
			doctorName: data.doctorName,
			specialization: data.specialization,
			prescriptionId: data.prescriptionId,
			appointmentDate: formatDateTime(data.appointmentDate),
			issuedDate: formatDate(data.issuedDate),
			followUpDate: data.followUpDate ? formatDate(data.followUpDate) : null,
			instructions: data.instructions,
			pdfUrl: pdf.pdfUrl,
		},
		attachments: [{ filename: pdf.fileName, content: pdf.pdfBuffer, contentType: "application/pdf" }],
	}).catch((error: unknown) => {
		console.error("Failed to send prescription email:", error);
	});
};

// ---------------- Services ----------------

const givePrescription = async (user: IRequestUser, payload: ICreatePrescriptionPayload) => {
	const doctor = await getDoctorByEmail(user.email);

	const appointment = await prisma.appointment.findUnique({
		where: { id: payload.appointmentId },
		include: {
			patient: { select: { name: true, email: true } },
			schedule: { select: { startDateTime: true } },
			prescription: { select: { id: true } },
		},
	});

	if (!appointment) {
		throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
	}

	if (appointment.doctorId !== doctor.id) {
		throw new AppError(httpStatus.FORBIDDEN, "You can only give prescription for your own appointments");
	}

	if (appointment.status === AppointmentStatus.CANCELED) {
		throw new AppError(httpStatus.BAD_REQUEST, "You cannot give prescription for a canceled appointment");
	}

	// PDF বানানোর আগেই check — না হলে অকারণে upload হতো
	if (appointment.prescription) {
		throw new AppError(
			httpStatus.CONFLICT,
			"You have already given prescription for this appointment. You can update the prescription instead.",
		);
	}

	// PDF-এ ID লাগবে, তাই DB-তে save করার আগেই ID বানিয়ে নিচ্ছি
	const pdfData: IPrescriptionPdfData = {
		prescriptionId: uuidv7(),
		doctorName: doctor.name,
		doctorEmail: doctor.email,
		specialization: getSpecializationText(doctor.specialties),
		patientName: appointment.patient.name,
		patientEmail: appointment.patient.email,
		appointmentDate: appointment.schedule.startDateTime,
		issuedDate: new Date(),
		followUpDate: payload.followUpDate ?? null,
		instructions: payload.instructions,
	};

	// ১. PDF বানিয়ে upload (DB transaction-এর বাইরে)
	const pdf = await createAndUploadPdf(pdfData);

	// ২. DB-তে একবারেই save — fail হলে uploaded file মুছে দাও
	const prescription = await prisma.prescription
		.create({
			data: {
				id: pdfData.prescriptionId,
				appointmentId: appointment.id,
				doctorId: appointment.doctorId, // client থেকে না, appointment থেকে
				patientId: appointment.patientId,
				instructions: pdfData.instructions,
				followUpDate: pdfData.followUpDate,
				pdfUrl: pdf.pdfUrl,
				createdAt: pdfData.issuedDate,
			},
			include: prescriptionInclude,
		})
		.catch(async (error: unknown) => {
			await safeDeleteFile(pdf.pdfUrl);

			// একসাথে দুইটা request এলে appointmentId @unique DB-তেই আটকাবে
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
				throw new AppError(httpStatus.CONFLICT, "Prescription already exists for this appointment");
			}
			throw error;
		});

	// ৩. email (background)
	sendPrescriptionEmail(`You have received a new prescription from Dr. ${doctor.name}`, pdfData, pdf);

	return prescription;
};

// route-এ শুধু PATIENT আর DOCTOR allowed
const getMyPrescriptions = async (user: IRequestUser) => {
	const where: Prisma.PrescriptionWhereInput =
		user.role === Role.DOCTOR ? { doctor: { email: user.email } } : { patient: { email: user.email } };

	return prisma.prescription.findMany({
		where,
		include: prescriptionInclude,
		orderBy: { createdAt: "desc" },
	});
};

// Admin — ?searchTerm=fever&doctorId=...&sortBy=createdAt&page=1&limit=10
const getAllPrescriptions = async (query: IQueryParams): Promise<IQueryResult<PrescriptionWithRelations>> => {
	return new QueryBuilder<PrescriptionWithRelations, Prisma.PrescriptionWhereInput, Prisma.PrescriptionInclude>(
		prisma.prescription,
		query,
		{
			searchableFields: prescriptionSearchableFields,
			filterableFields: prescriptionFilterableFields,
			sortableFields: prescriptionSortableFields,
		},
	)
		.search()
		.filter()
		.sort()
		.paginate()
		.include(prescriptionInclude)
		.execute();
};

// ওই doctor, ওই patient, অথবা admin দেখতে পারবে
const getSinglePrescription = async (user: IRequestUser, prescriptionId: string) => {
	const prescription = await prisma.prescription.findUnique({
		where: { id: prescriptionId },
		include: prescriptionInclude,
	});

	if (!prescription) {
		throw new AppError(httpStatus.NOT_FOUND, "Prescription not found");
	}

	const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
	const isOwner = prescription.doctor.email === user.email || prescription.patient.email === user.email;

	if (!isAdmin && !isOwner) {
		throw new AppError(httpStatus.FORBIDDEN, "You are not allowed to view this prescription");
	}

	return prescription;
};

const updatePrescription = async (user: IRequestUser, prescriptionId: string, payload: IUpdatePrescriptionPayload) => {
	const oldPrescription = await getOwnPrescription(prescriptionId, user);

	const pdfData: IPrescriptionPdfData = {
		prescriptionId: oldPrescription.id,
		doctorName: oldPrescription.doctor.name,
		doctorEmail: oldPrescription.doctor.email,
		specialization: getSpecializationText(oldPrescription.doctor.specialties),
		patientName: oldPrescription.patient.name,
		patientEmail: oldPrescription.patient.email,
		appointmentDate: oldPrescription.appointment.schedule.startDateTime,
		issuedDate: oldPrescription.createdAt,
		// undefined → আগেরটাই থাকবে, null → follow-up মুছে যাবে
		followUpDate: payload.followUpDate === undefined ? oldPrescription.followUpDate : payload.followUpDate,
		instructions: payload.instructions ?? oldPrescription.instructions,
	};

	// ১. নতুন PDF upload
	const pdf = await createAndUploadPdf(pdfData);

	// ২. DB update — fail হলে নতুন file মুছে দাও, পুরনোটা অক্ষত থাকবে
	const updatedPrescription = await prisma.prescription
		.update({
			where: { id: oldPrescription.id },
			data: {
				instructions: pdfData.instructions,
				followUpDate: pdfData.followUpDate,
				pdfUrl: pdf.pdfUrl,
			},
			include: prescriptionInclude,
		})
		.catch(async (error: unknown) => {
			await safeDeleteFile(pdf.pdfUrl);
			throw error;
		});

	// ৩. DB ঠিকমতো update হওয়ার পরেই পুরনো PDF মুছবো
	await safeDeleteFile(oldPrescription.pdfUrl);

	// ৪. email (background)
	sendPrescriptionEmail(`Your prescription has been updated by Dr. ${oldPrescription.doctor.name}`, pdfData, pdf);

	return updatedPrescription;
};

const deletePrescription = async (user: IRequestUser, prescriptionId: string) => {
	const prescription = await getOwnPrescription(prescriptionId, user);

	const deletedPrescription = await prisma.prescription.delete({
		where: { id: prescription.id },
	});

	// DB থেকে মোছার পরে file — যাতে DB-তে কখনো ভাঙা link না থাকে
	await safeDeleteFile(deletedPrescription.pdfUrl);

	return deletedPrescription;
};

export const PrescriptionService = {
	givePrescription,
	getMyPrescriptions,
	getAllPrescriptions,
	getSinglePrescription,
	updatePrescription,
	deletePrescription,
};
