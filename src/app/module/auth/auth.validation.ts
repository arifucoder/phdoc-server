import * as z from "zod";

const changePasswordZodSchema = z
	.object({
		currentPassword: z.string("Current password is required").min(1, "Current password is required"),
		newPassword: z
			.string("New password is required")
			.min(8, "Password must be at least 8 characters")
			.max(128, "Password must be at most 128 characters"),
	})
	.refine((data) => data.currentPassword !== data.newPassword, {
		message: "New password must be different from current password",
		path: ["newPassword"],
	});

export const AuthValidation = {
	changePasswordZodSchema,
};
