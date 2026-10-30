import * as z from "zod";

const scheduleId = z.uuid("Each schedule id must be a valid UUID");

// ---------- Create ----------
const createDoctorScheduleZodSchema = z.object({
	scheduleIds: z
		.array(scheduleId, "scheduleIds must be an array of schedule ids")
		.min(1, "At least one schedule id is required")
		// একই id দুইবার এলে একবারই রাখি
		.transform((ids) => [...new Set(ids)]),
});

// ---------- Update (কিছু যোগ, কিছু বাদ) ----------
const updateDoctorScheduleZodSchema = z
	.object({
		scheduleIds: z
			.array(
				z.object({
					id: scheduleId,
					shouldDelete: z.boolean("shouldDelete must be true or false"),
				}),
				"scheduleIds must be an array",
			)
			.min(1, "At least one schedule is required"),
	})
	.refine((data) => new Set(data.scheduleIds.map((s) => s.id)).size === data.scheduleIds.length, {
		message: "Duplicate schedule id found",
		path: ["scheduleIds"],
	});

export const DoctorScheduleValidation = {
	createDoctorScheduleZodSchema,
	updateDoctorScheduleZodSchema,
};
