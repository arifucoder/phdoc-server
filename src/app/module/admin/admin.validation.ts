import { Role, UserStatus } from "@/generated/prisma/enums";
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

// DELETED এখানে দেওয়া যাবে না — delete-এর জন্য role-specific delete API আছে
const changeUserStatusValidationSchema = z.object({
	userId: z.string("User id is required").trim().min(1, "User id is required"),
	userStatus: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED], "Status must be ACTIVE or BLOCKED"),
});

// DOCTOR/PATIENT-এ বদলানো যাবে না — ওদের আলাদা profile table লাগে
const changeUserRoleValidationSchema = z.object({
	userId: z.string("User id is required").trim().min(1, "User id is required"),
	role: z.enum([Role.ADMIN, Role.SUPER_ADMIN], "Role must be ADMIN or SUPER_ADMIN"),
});

export const AdminValidation = {
	updateAdminValidationSchema,
	changeUserStatusValidationSchema,
	changeUserRoleValidationSchema,
};
