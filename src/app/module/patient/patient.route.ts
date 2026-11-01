import { multerUpload } from "@/app/config/multer.config";
import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { PatientController } from "./patient.controller";
import { attachPatientUploads } from "./patient.middlewares";
import { PatientValidation } from "./patient.validation";

const router = Router();

router.patch(
	"/update-my-profile",
	checkAuth(Role.PATIENT),
	multerUpload.fields([
		{ name: "profilePhoto", maxCount: 1 },
		{ name: "medicalReports", maxCount: 5 },
	]),
	validateRequest(PatientValidation.updatePatientProfileZodSchema), // আগে client data যাচাই
	attachPatientUploads, // তারপর নিজের file যোগ
	PatientController.updateMyProfile,
);

export const PatientRoutes = router;
