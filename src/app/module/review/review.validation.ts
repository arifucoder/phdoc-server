import * as z from "zod";

const ratingSchema = z
	.int("Rating must be a whole number between 1 and 5")
	.min(1, "Rating must be at least 1")
	.max(5, "Rating cannot be more than 5");

const commentSchema = z
	.string("Comment must be a string")
	.trim()
	.min(1, "Comment cannot be empty")
	.max(1000, "Comment cannot be more than 1000 characters");

const createReviewValidationSchema = z.object({
	appointmentId: z.uuid("A valid appointmentId is required"),
	rating: ratingSchema,
	comment: commentSchema.optional(),
});

const updateReviewValidationSchema = z
	.object({
		rating: ratingSchema.optional(),
		comment: commentSchema.optional(),
	})
	.refine((data) => data.rating !== undefined || data.comment !== undefined, {
		message: "Provide at least rating or comment to update",
	});

export const ReviewValidation = {
	createReviewValidationSchema,
	updateReviewValidationSchema,
};
