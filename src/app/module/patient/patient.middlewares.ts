import type { NextFunction, Request, Response } from "express";
import type { TUpdatePatientProfilePayload } from "./patient.interface";

type TUploadedFiles = Partial<Record<"profilePhoto" | "medicalReports", Express.Multer.File[]>>;

// validateRequest-এর পরে চলে: Zod-পাস করা body-তে শুধু আমাদের upload করা file যোগ করে
export const attachPatientUploads = (req: Request, _res: Response, next: NextFunction) => {
	const payload = req.body as TUpdatePatientProfilePayload;
	const files = req.files as TUploadedFiles | undefined;

	const photo = files?.profilePhoto?.[0];
	if (photo) {
		payload.profilePhoto = photo.path; // Cloudinary secure_url
	}

	const reports = files?.medicalReports ?? [];
	if (reports.length > 0) {
		payload.newMedicalReports = reports.map((file) => ({
			reportName: file.originalname,
			reportLink: file.path,
			reportPublicId: file.filename, // cloudinaryStorage-এ filename = public_id
		}));
	}

	next();
};
