import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { PrescriptionController } from "./prescription.controller";
import { PrescriptionValidation } from "./prescription.validation";

const router = Router();

router.get("/", checkAuth(Role.SUPER_ADMIN, Role.ADMIN), PrescriptionController.getAllPrescriptions);

// ⚠️ "/my-prescriptions" অবশ্যই "/:id"-এর আগে — না হলে "my-prescriptions"-কে id ধরে নেবে
router.get("/my-prescriptions", checkAuth(Role.PATIENT, Role.DOCTOR), PrescriptionController.getMyPrescriptions);

router.get(
	"/:id",
	checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT),
	PrescriptionController.getSinglePrescription,
);

router.post(
	"/",
	checkAuth(Role.DOCTOR),
	validateRequest(PrescriptionValidation.createPrescriptionValidationSchema),
	PrescriptionController.givePrescription,
);

router.patch(
	"/:id",
	checkAuth(Role.DOCTOR),
	validateRequest(PrescriptionValidation.updatePrescriptionValidationSchema),
	PrescriptionController.updatePrescription,
);

router.delete("/:id", checkAuth(Role.DOCTOR), PrescriptionController.deletePrescription);

export const PrescriptionRoutes = router;
