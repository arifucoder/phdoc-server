import { Gender } from "@/generated/prisma/enums";
import * as z from "zod";

const updateDoctorValidationSchema = z.object({
	doctor: z
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

				address: z
					.string("Address must be a string")
					.trim()
					.min(10, "Address must be at least 10 characters")
					.max(100, "Address must be at most 100 characters")
					.optional(),

				experience: z.int("Experience must be an integer").nonnegative("Experience cannot be negative").optional(),

				gender: z.enum(Gender, "Gender must be either MALE or FEMALE").optional(),

				appointmentFee: z
					.number("Appointment fee must be a number")
					.nonnegative("Appointment fee cannot be negative")
					.optional(),

				qualification: z
					.string("Qualification must be a string")
					.trim()
					.min(2, "Qualification must be at least 2 characters")
					.max(50, "Qualification must be at most 50 characters")
					.optional(),

				currentWorkingPlace: z
					.string("Current working place must be a string")
					.trim()
					.min(2, "Current working place must be at least 2 characters")
					.max(50, "Current working place must be at most 50 characters")
					.optional(),

				designation: z
					.string("Designation must be a string")
					.trim()
					.min(2, "Designation must be at least 2 characters")
					.max(50, "Designation must be at most 50 characters")
					.optional(),
			},
			"Doctor data is required",
		)
		.refine((data) => Object.keys(data).length > 0, "At least one field is required to update"),
});

export const DoctorValidation = {
	updateDoctorValidationSchema,
};
