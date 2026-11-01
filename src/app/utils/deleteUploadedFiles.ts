import type { Request } from "express";
import { deleteFileFromCloudinary } from "../config/cloudinary.config";

// req.file (single) / req.files (array) / req.files ({ field: File[] }) — তিন রকমই সামলায়
const collectUploadedFiles = (req: Request): Express.Multer.File[] => {
	if (req.file) return [req.file];
	if (Array.isArray(req.files)) return req.files;
	if (req.files) return Object.values(req.files).flat();
	return [];
};

// request fail করলে এই request-এ upload হওয়া file Cloudinary থেকে মুছে দেয়
export const deleteUploadedFiles = async (req: Request): Promise<void> => {
	const files = collectUploadedFiles(req);
	if (files.length === 0) return;

	// deleteFileFromCloudinary throw করতে পারে → allSettled যেন response আটকে না যায়
	await Promise.allSettled(files.map((file) => deleteFileFromCloudinary(file.path)));
};
