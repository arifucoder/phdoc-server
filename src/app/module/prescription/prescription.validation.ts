import * as z from "zod";

const instructionsSchema = z
	.string("Instructions is required")
	.trim()
	.min(1, "Instructions cannot be empty")
	.max(5000, "Instructions cannot be more than 5000 characters");

// "2026-11-20" বা ISO string → Date object (validateRequest req.body-তে Date বসিয়ে দেবে)
const followUpDateSchema = z.coerce
	.date("Follow-up date must be a valid date")
	.refine((date) => date > new Date(), "Follow-up date must be in the future");

const createPrescriptionValidationSchema = z.object({
	appointmentId: z.uuid("A valid appointmentId is required"),
	instructions: instructionsSchema,
	followUpDate: followUpDateSchema.optional(),
});

const updatePrescriptionValidationSchema = z
	.object({
		instructions: instructionsSchema.optional(),
		followUpDate: followUpDateSchema.nullable().optional(),
	})
	.refine((data) => data.instructions !== undefined || data.followUpDate !== undefined, {
		message: "Provide at least instructions or followUpDate to update",
	});

export const PrescriptionValidation = {
	createPrescriptionValidationSchema,
	updatePrescriptionValidationSchema,
};
