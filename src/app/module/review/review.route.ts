import { checkAuth } from "@/app/middleware/checkAuth";
import { validateRequest } from "@/app/middleware/validateRequest";
import { Role } from "@/generated/prisma/enums";
import { Router } from "express";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

router.get("/", ReviewController.getAllReviews);
router.get("/my-reviews", checkAuth(Role.PATIENT, Role.DOCTOR), ReviewController.getMyReviews);
router.post(
	"/",
	checkAuth(Role.PATIENT),
	validateRequest(ReviewValidation.createReviewValidationSchema),
	ReviewController.giveReview,
);
router.patch(
	"/:id",
	checkAuth(Role.PATIENT),
	validateRequest(ReviewValidation.updateReviewValidationSchema),
	ReviewController.updateReview,
);
router.delete("/:id", checkAuth(Role.PATIENT), ReviewController.deleteReview);

export const ReviewRoutes = router;
