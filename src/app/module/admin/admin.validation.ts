import * as z from "zod";

const updateAdminValidationSchema = z.object({
	admin: z
		.object(
			{
				name: z
					.string("Name must be a string")
					.trim()
					.min(3, "Name must be at least 3 characters")
					.max(30, "Name must be at most 30 characters")
					.optional(),

				profilePhoto: z.url({ protocol: /^https?$/, error: "Profile photo must be a valid http/https URL" }).optional(),

				contactNumber: z
					.string("Contact number must be a string")
					.trim()
					.regex(/^(\+?880|0)1[3-9]\d{8}$/, "Invalid Bangladeshi phone number")
					.optional(),
			},
			"Admin data is required",
		)
		.refine((data) => Object.keys(data).length > 0, "At least one field is required to update"),
});

export const AdminValidation = {
	updateAdminValidationSchema,
};
