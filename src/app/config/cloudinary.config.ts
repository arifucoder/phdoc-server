import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import httpStatus from "http-status";
import { randomUUID } from "node:crypto";
import AppError from "../errorHelpers/AppError";
import { envVars } from "./env";

cloudinary.config({
	cloud_name: envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME,
	api_key: envVars.CLOUDINARY.CLOUDINARY_API_KEY,
	api_secret: envVars.CLOUDINARY.CLOUDINARY_API_SECRET,
	secure: true,
});

export const ROOT_FOLDER = "phdoc";

// "My Photo.JPG" → { folder: "images", uniqueName: "<uuid>-my-photo" }
export const buildFileInfo = (fileName: string) => {
	const lastDot = fileName.lastIndexOf(".");
	const hasExtension = lastDot > 0;

	const extension = hasExtension ? fileName.slice(lastDot + 1).toLowerCase() : "";
	const baseName = (hasExtension ? fileName.slice(0, lastDot) : fileName)
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.slice(0, 50);

	const uniqueName = baseName ? `${randomUUID()}-${baseName}` : randomUUID();
	const folder = extension === "pdf" ? "pdfs" : "images";

	return { uniqueName, folder };
};

export const uploadFileToCloudinary = async (buffer: Buffer, fileName: string): Promise<UploadApiResponse> => {
	if (!buffer?.length || !fileName) {
		throw new AppError(httpStatus.BAD_REQUEST, "File buffer and file name are required for upload");
	}

	const { uniqueName, folder } = buildFileInfo(fileName);

	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: `${ROOT_FOLDER}/${folder}`, // folder শুধু এখানে
				public_id: uniqueName, // এখানে শুধু নাম, path না
				resource_type: "auto",
			},
			(error, result) => {
				if (error || !result) {
					console.error("Cloudinary upload error:", error);
					return reject(new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to upload file to Cloudinary"));
				}
				resolve(result);
			},
		);

		uploadStream.end(buffer);
	});
};

// https://res.cloudinary.com/demo/image/upload/v1712/ph-healthcare/images/abc-photo.jpg
// → "ph-healthcare/images/abc-photo"
const getPublicIdFromUrl = (url: string): string | null => {
	const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
	return match?.[1] ?? null;
};

export const deleteFileFromCloudinary = async (url: string): Promise<void> => {
	const publicId = getPublicIdFromUrl(url);
	if (!publicId) return;

	try {
		// PDF-ও Cloudinary-তে "image" resource_type হিসেবেই save হয়
		await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
	} catch (error) {
		console.error("Error deleting file from Cloudinary:", error);
		throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete file from Cloudinary");
	}
};

export { cloudinary };
