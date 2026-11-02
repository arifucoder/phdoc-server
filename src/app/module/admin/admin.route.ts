import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();

// ⚠️ নির্দিষ্ট path আগে, "/:id" পরে — না হলে "/:id" এগুলোকে গিলে ফেলবে
router.patch(
	"/change-user-status",
	checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
	validateRequest(AdminValidation.changeUserStatusValidationSchema),
	AdminController.changeUserStatus,
);

router.patch(
	"/change-user-role",
	checkAuth(Role.SUPER_ADMIN),
	validateRequest(AdminValidation.changeUserRoleValidationSchema),
	AdminController.changeUserRole,
);

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
