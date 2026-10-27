import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

router.post(
	"/create-doctor",
	checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(UserValidation.createDoctorValidationSchema),
	UserController.createDoctor,
);
router.post(
	"/create-admin",
	checkAuth(Role.SUPER_ADMIN),
	validateRequest(UserValidation.createAdminValidationSchema),
	UserController.createDoctor,
);

export const UserRoutes = router;
