import type { Request } from "express";
import httpStatus from "http-status";
import type { StorageEngine } from "multer";
import AppError from "../errorHelpers/AppError";
import { buildFileInfo, cloudinary, ROOT_FOLDER } from "./cloudinary.config";

/**
 * নিজের বানানো multer storage engine
 * multer-storage-cloudinary-এর কাজই করে, কিন্তু cloudinary v2 দিয়ে
 * upload শেষে: req.file.path = Cloudinary URL, req.file.filename = public_id
 */
export const cloudinaryStorage: StorageEngine = {
	_handleFile(_req: Request, file, cb) {
		const { uniqueName, folder } = buildFileInfo(file.originalname);

		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: `${ROOT_FOLDER}/${folder}`,
				public_id: uniqueName,
				resource_type: "auto",
			},
			(error, result) => {
				if (error || !result) {
					console.error("Cloudinary upload error:", error);
					return cb(new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to upload file to Cloudinary"));
				}

				cb(null, {
					path: result.secure_url,
					filename: result.public_id,
					size: result.bytes,
				});
			},
		);

		// RAM-এ না রেখে সরাসরি Cloudinary-তে pipe
		file.stream.pipe(uploadStream);
	},

	// multer-এর ভেতরে পরে কোনো error হলে, upload হওয়া file মুছে দেয়
	_removeFile(_req: Request, file, cb) {
		cloudinary.uploader
			.destroy(file.filename, { resource_type: "image" })
			.then(() => cb(null))
			.catch((error) => cb(error as Error));
	},
};
