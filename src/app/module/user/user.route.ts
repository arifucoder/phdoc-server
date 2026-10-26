import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { UserController } from "./user.controller";
import { createDoctorZodSchema } from "./user.validation";

const router = Router();

router.post(
	"/create-doctor",
	checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.PATIENT),
	validateRequest(createDoctorZodSchema),
	UserController.createDoctor,
);

export const UserRoutes = router;
