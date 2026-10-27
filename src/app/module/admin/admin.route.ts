import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();

router.get("/", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), AdminController.getAllAdmins);

router.get("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), AdminController.getAdminById);

// ADMIN can update ADMIN; service blocks ADMIN from updating SUPER_ADMIN
router.patch(
	"/:id",
	checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(AdminValidation.updateAdminValidationSchema),
	AdminController.updateAdmin,
);

// ADMIN can delete ADMIN; service blocks ADMIN from deleting SUPER_ADMIN
router.delete("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), AdminController.deleteAdmin);

export const AdminRoutes = router;
