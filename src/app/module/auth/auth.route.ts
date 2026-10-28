import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

router.post("/register", AuthController.registerPatient);
router.post("/login", AuthController.loginUser);
router.get("/me", checkAuth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN), AuthController.getMe);

router.post("/refresh-token", AuthController.getNewToken);
router.post(
	"/change-password",
	checkAuth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
	validateRequest(AuthValidation.changePasswordZodSchema),
	AuthController.changePassword,
);
router.post("/verify-email", validateRequest(AuthValidation.verifyEmailZodSchema), AuthController.verifyEmail);

router.post("/logout", AuthController.logoutUser);
router.post("/logout-all", checkAuth(), AuthController.logoutFromAllDevices);

router.post("/forget-password", validateRequest(AuthValidation.forgetPasswordZodSchema), AuthController.forgetPassword);
router.post("/reset-password", validateRequest(AuthValidation.resetPasswordZodSchema), AuthController.resetPassword);

router.get("/login/google", AuthController.googleLogin);
router.get("/google/success", AuthController.googleLoginSuccess);
router.get("/oauth/error", AuthController.handleOAuthError);

export const AuthRoutes = router;
