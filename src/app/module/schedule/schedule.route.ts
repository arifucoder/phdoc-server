import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { ScheduleController } from "./schedule.controller";
import { ScheduleValidation } from "./schedule.validation";

const router = Router();

router.post(
	"/",
	checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(ScheduleValidation.createScheduleZodSchema),
	ScheduleController.createSchedule,
);

router.get("/", checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR), ScheduleController.getAllSchedules);

router.get("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR), ScheduleController.getScheduleById);

router.patch(
	"/:id",
	checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(ScheduleValidation.updateScheduleZodSchema),
	ScheduleController.updateSchedule,
);

router.delete("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), ScheduleController.deleteSchedule);

export const ScheduleRoutes = router;
