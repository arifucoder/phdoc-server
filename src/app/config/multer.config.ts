import httpStatus from "http-status";
import multer from "multer";
import AppError from "../errorHelpers/AppError";
import { cloudinaryStorage } from "./cloudinaryStorage";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const multerUpload = multer({
	storage: cloudinaryStorage,
	limits: { fileSize: MAX_FILE_SIZE },
	fileFilter: (_req, file, cb) => {
		if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
			return cb(new AppError(httpStatus.BAD_REQUEST, "Only JPG, PNG, WEBP images and PDF files are allowed"));
		}
		cb(null, true);
	},
});
