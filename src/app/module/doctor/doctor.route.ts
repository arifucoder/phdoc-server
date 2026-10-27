import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { DoctorController } from "./doctor.controller";
import { DoctorValidation } from "./doctor.validation";

const router = Router();

router.get("/", DoctorController.getAllDoctors);

router.get("/:id", DoctorController.getDoctorById);

router.patch(
	"/:id",
	checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(DoctorValidation.updateDoctorValidationSchema),
	DoctorController.updateDoctor,
);

router.delete("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), DoctorController.deleteDoctor);

export const DoctorRoutes = router;
