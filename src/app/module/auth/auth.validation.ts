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

const verifyEmailZodSchema = z.object({
	email: z.email("Valid email is required"),
	otp: z.string("OTP is required").regex(/^\d{6}$/, "OTP must be 6 digits"),
});
export const AuthValidation = {
	changePasswordZodSchema,
	verifyEmailZodSchema,
};
