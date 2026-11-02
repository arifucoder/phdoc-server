import { checkAuth } from "@/app/middleware/checkAuth";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { StatsController } from "./stats.controller";

const router = Router();

router.get("/", checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT), StatsController.getDashboardStats);

export const StatsRoutes = router;
