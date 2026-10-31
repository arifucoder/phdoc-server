import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { AppointmentController } from "./appointment.controller";
import { AppointmentValidation } from "./appointment.validation";

const router = Router();

router.post(
	"/book-appointment",
	checkAuth(Role.PATIENT),
	validateRequest(AppointmentValidation.bookAppointmentValidationSchema),
	AppointmentController.bookAppointment,
);
router.get("/my-appointments", checkAuth(Role.PATIENT, Role.DOCTOR), AppointmentController.getMyAppointments);
router.patch(
	"/change-appointment-status/:id",
	checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(AppointmentValidation.changeAppointmentStatusValidationSchema),
	AppointmentController.changeAppointmentStatus,
);
router.get(
	"/my-single-appointment/:id",
	checkAuth(Role.PATIENT, Role.DOCTOR),
	AppointmentController.getMySingleAppointment,
);
router.get("/all-appointments", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), AppointmentController.getAllAppointments);
router.post(
	"/book-appointment-with-pay-later",
	checkAuth(Role.PATIENT),
	validateRequest(AppointmentValidation.bookAppointmentValidationSchema),
	AppointmentController.bookAppointmentWithPayLater,
);
router.post("/initiate-payment/:id", checkAuth(Role.PATIENT), AppointmentController.initiatePayment);

export const AppointmentRoutes = router;
