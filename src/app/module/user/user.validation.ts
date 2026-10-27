import { Gender } from "@/generated/prisma/enums";
import * as z from "zod";

const createDoctorValidationSchema = z.object({
	password: z
		.string("Password is required")
		.min(6, "Password must be at least 6 characters")
		.max(32, "Password must be at most 32 characters"),

	doctor: z.object({
		name: z
			.string("Name is required and must be a string")
			.trim()
			.min(3, "Name must be at least 3 characters")
			.max(30, "Name must be at most 30 characters"),

		email: z.email("Invalid email address").toLowerCase(),

		contactNumber: z
			.string("Contact number is required")
			.trim()
			.regex(/^(\+?880|0)1[3-9]\d{8}$/, "Invalid Bangladeshi phone number"),

		address: z
			.string("Address must be a string")
			.trim()
			.min(10, "Address must be at least 10 characters")
			.max(100, "Address must be at most 100 characters")
			.optional(),

		registrationNumber: z
			.string("Registration number is required")
			.trim()
			.min(1, "Registration number cannot be empty"),

		experience: z.int("Experience must be an integer").nonnegative("Experience cannot be negative").optional(),

		gender: z.enum(Gender, "Gender must be either MALE or FEMALE"),

		appointmentFee: z.number("Appointment fee must be a number").nonnegative("Appointment fee cannot be negative"),

		qualification: z
			.string("Qualification is required")
			.trim()
			.min(2, "Qualification must be at least 2 characters")
			.max(50, "Qualification must be at most 50 characters"),

		currentWorkingPlace: z
			.string("Current working place is required")
			.trim()
			.min(2, "Current working place must be at least 2 characters")
			.max(50, "Current working place must be at most 50 characters"),

		designation: z
			.string("Designation is required")
			.trim()
			.min(2, "Designation must be at least 2 characters")
			.max(50, "Designation must be at most 50 characters"),
	}),

	specialties: z
		.array(z.uuid("Each specialty must be a valid UUID"), "Specialties must be an array")
		.min(1, "At least one specialty is required")
		.refine((ids) => new Set(ids).size === ids.length, "Duplicate specialties are not allowed"),
});

const createAdminValidationSchema = z.object({
	password: z
		.string("Password is required")
		.min(6, "Password must be at least 6 characters")
		.max(32, "Password must be at most 32 characters"),

	admin: z.object({
		name: z
			.string("Name is required")
			.trim()
			.min(3, "Name must be at least 3 characters")
			.max(30, "Name must be at most 30 characters"),

		email: z.email("Invalid email address").toLowerCase(),

		profilePhoto: z.url({ protocol: /^https?$/, error: "Profile photo must be a valid http/https URL" }).optional(),

		contactNumber: z
			.string("Contact number is required")
			.trim()
			.regex(/^(\+?880|0)1[3-9]\d{8}$/, "Invalid Bangladeshi phone number"),
	}),
});

export const UserValidation = {
	createDoctorValidationSchema,
	createAdminValidationSchema,
};
