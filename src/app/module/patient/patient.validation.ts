import { BloodGroup, Gender, MaritalStatus } from "@/generated/prisma/enums";
import * as z from "zod";

const patientInfoZodSchema = z.object({
	name: z
		.string("Name must be a string")
		.trim()
		.min(1, "Name cannot be empty")
		.max(100, "Name must be less than 100 characters")
		.optional(),
	contactNumber: z
		.string("Contact number must be a string")
		.trim()
		.min(1, "Contact number cannot be empty")
		.max(20, "Contact number must be less than 20 characters")
		.optional(),
	address: z
		.string("Address must be a string")
		.trim()
		.min(1, "Address cannot be empty")
		.max(200, "Address must be less than 200 characters")
		.optional(),
	// profilePhoto এখানে নেই — শুধু upload করা file থেকে আসবে (unknown key Zod strip করে দেয়)
});

const patientHealthDataZodSchema = z.object({
	gender: z.enum(Gender, "Gender must be MALE, FEMALE or OTHER").optional(),
	dateOfBirth: z.iso
		.date("Date of birth must be in YYYY-MM-DD format")
		// UTC মাঝরাত → @db.Date-এ ঠিক তারিখটাই save হবে
		.transform((date) => new Date(`${date}T00:00:00.000Z`))
		.refine((date) => date <= new Date(), "Date of birth cannot be in the future")
		.optional(),
	bloodGroup: z.enum(BloodGroup, "Invalid blood group").optional(),
	height: z
		.number("Height must be a number (cm)")
		.positive("Height must be positive")
		.max(300, "Height looks invalid")
		.optional(),
	weight: z
		.number("Weight must be a number (kg)")
		.positive("Weight must be positive")
		.max(500, "Weight looks invalid")
		.optional(),
	hasAllergies: z.boolean("hasAllergies must be true/false").optional(),
	hasDiabetes: z.boolean("hasDiabetes must be true/false").optional(),
	smokingStatus: z.boolean("smokingStatus must be true/false").optional(),
	pregnancyStatus: z.boolean("pregnancyStatus must be true/false").optional(),
	hasPastSurgeries: z.boolean("hasPastSurgeries must be true/false").optional(),
	recentAnxiety: z.boolean("recentAnxiety must be true/false").optional(),
	recentDepression: z.boolean("recentDepression must be true/false").optional(),
	dietaryPreferences: z.string().trim().max(200).optional(),
	mentalHealthHistory: z.string().trim().max(2000).optional(),
	immunizationStatus: z.string().trim().max(200).optional(),
	maritalStatus: z.enum(MaritalStatus, "Invalid marital status").optional(),
});

// client JSON থেকে শুধু delete করা যায়; নতুন report আসে file upload থেকে
const medicalReportDeleteZodSchema = z.object({
	reportId: z.uuid("Invalid report id"),
	shouldDelete: z.literal(true),
});

const updatePatientProfileZodSchema = z.object({
	patientInfo: patientInfoZodSchema.optional(),
	patientHealthData: patientHealthDataZodSchema.optional(),
	medicalReports: z.array(medicalReportDeleteZodSchema).max(20, "Too many reports at once").optional(),
});

export const PatientValidation = {
	updatePatientProfileZodSchema,
};
