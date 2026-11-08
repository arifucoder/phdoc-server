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

const dateString = z.iso.date("Date must be in YYYY-MM-DD format");

// ---------- Public: doctor-এর খালি slot (date range) ----------
const MAX_RANGE_DAYS = 31;

const availableScheduleQueryZodSchema = z
	.object({
		startDate: dateString,
		endDate: dateString,
	})
	.refine((data) => data.endDate >= data.startDate, {
		message: "End date must be the same as or after start date",
		path: ["endDate"],
	})
	// সীমা না দিলে কেউ ১০ বছরের range চেয়ে DB-কে চাপ দিতে পারে
	.refine((data) => (Date.parse(data.endDate) - Date.parse(data.startDate)) / 86_400_000 < MAX_RANGE_DAYS, {
		message: `Date range can be at most ${MAX_RANGE_DAYS} days`,
		path: ["endDate"],
	});

export const DoctorScheduleValidation = {
	createDoctorScheduleZodSchema,
	updateDoctorScheduleZodSchema,
	availableScheduleQueryZodSchema,
};
