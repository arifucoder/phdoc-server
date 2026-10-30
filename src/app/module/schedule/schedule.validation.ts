import * as z from "zod";

// ---------- Reusable field schemas ----------
const dateString = z.iso.date("Date must be in YYYY-MM-DD format");
const timeString = z.iso.time({ precision: -1, error: "Time must be in HH:mm format (e.g. 09:30)" });

// ---------- Base shape ----------
const scheduleBaseSchema = z.object({
	startDate: dateString,
	endDate: dateString,
	startTime: timeString,
	endTime: timeString,
});

// ---------- Create (range → অনেকগুলো slot) ----------
const createScheduleZodSchema = scheduleBaseSchema
	.refine((data) => data.endDate >= data.startDate, {
		message: "End date must be the same as or after start date",
		path: ["endDate"],
	})
	.refine((data) => data.endTime > data.startTime, {
		message: "End time must be after start time",
		path: ["endTime"],
	});

// ---------- Update (একটা slot-এর নতুন সময়) ----------
// teacher-এর service চারটা field-ই ব্যবহার করে, তাই partial না — সব required
const updateScheduleZodSchema = scheduleBaseSchema.refine(
	(data) => `${data.endDate}T${data.endTime}` > `${data.startDate}T${data.startTime}`,
	{
		message: "End date-time must be after start date-time",
		path: ["endTime"],
	},
);

// ---------- Get all (query-র date filter) ----------
const scheduleDateQueryZodSchema = z
	.object({
		startDate: dateString.optional(),
		endDate: dateString.optional(),
	})
	.refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
		message: "End date must be the same as or after start date",
		path: ["endDate"],
	});

export const ScheduleValidation = {
	createScheduleZodSchema,
	updateScheduleZodSchema,
	scheduleDateQueryZodSchema,
};
