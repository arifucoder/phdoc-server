import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { DoctorScheduleController } from "./doctorSchedule.controller";
import { DoctorScheduleValidation } from "./doctorSchedule.validation";

const router = Router();

router.post(
	"/create-my-doctor-schedule",
	checkAuth(Role.DOCTOR),
	validateRequest(DoctorScheduleValidation.createDoctorScheduleZodSchema),
	DoctorScheduleController.createMyDoctorSchedule,
);

router.get("/my-doctor-schedules", checkAuth(Role.DOCTOR), DoctorScheduleController.getMyDoctorSchedules);

router.get("/", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), DoctorScheduleController.getAllDoctorSchedules);

router.get(
	"/:doctorId/schedule/:scheduleId",
	checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
	DoctorScheduleController.getDoctorScheduleById,
);

router.patch(
	"/update-my-doctor-schedule",
	checkAuth(Role.DOCTOR),
	validateRequest(DoctorScheduleValidation.updateDoctorScheduleZodSchema),
	DoctorScheduleController.updateMyDoctorSchedule,
);

router.delete(
	"/delete-my-doctor-schedule/:scheduleId",
	checkAuth(Role.DOCTOR),
	DoctorScheduleController.deleteMyDoctorSchedule,
);

export const DoctorScheduleRoutes = router;
