import * as z from "zod";

// ---------- Reusable field schemas ----------
const dateString = z.iso.date("Date must be in YYYY-MM-DD format");
const timeString = z.iso.time({ precision: -1, error: "Time must be in HH:mm format (e.g. 09:30)" });

// ---------- Base shape (refine ছাড়া, যাতে .partial() করা যায়) ----------
const scheduleBaseSchema = z.object({
	startDate: dateString,
	endDate: dateString,
	startTime: timeString,
	endTime: timeString,
});

// ---------- Create ----------
const createScheduleZodSchema = scheduleBaseSchema
	.refine((data) => data.endDate >= data.startDate, {
		message: "End date must be the same as or after start date",
		path: ["endDate"],
	})
	.refine((data) => data.endTime > data.startTime, {
		message: "End time must be after start time",
		path: ["endTime"],
	});

// ---------- Update ----------
const updateScheduleZodSchema = scheduleBaseSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field is required to update",
	})
	.refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
		message: "End date must be the same as or after start date",
		path: ["endDate"],
	})
	.refine((data) => !data.startTime || !data.endTime || data.endTime > data.startTime, {
		message: "End time must be after start time",
		path: ["endTime"],
	});

export const ScheduleValidation = {
	createScheduleZodSchema,
	updateScheduleZodSchema,
};
