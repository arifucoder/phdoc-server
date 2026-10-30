import AppError from "@/app/errorHelpers/AppError";
import type { IQueryParams } from "@/app/interfaces/query.interface";
import { prisma } from "@/app/lib/prisma";
import { QueryBuilder } from "@/app/utils/QueryBuilder";
import type { Prisma, Schedule } from "@/generated/prisma/client";
import httpStatus from "http-status";
import {
	SCHEDULE_INTERVAL_MINUTES,
	scheduleFilterableFields,
	scheduleIncludeConfig,
	scheduleSelectableFields,
	scheduleSortableFields,
} from "./schedule.constant";
import type { ICreateSchedulePayload, IUpdateSchedulePayload } from "./schedule.interface";
import { addDaysToDateString, addMinutes, buildDateTime } from "./schedule.utils";
import { ScheduleValidation } from "./schedule.validation";

const createSchedule = async (payload: ICreateSchedulePayload) => {
	const { startDate, endDate, startTime, endTime } = payload;

	const slots: Prisma.ScheduleCreateManyInput[] = [];

	// "YYYY-MM-DD" string compare নিরাপদ (Zod format নিশ্চিত করেছে)
	for (let date = startDate; date <= endDate; date = addDaysToDateString(date, 1)) {
		const dayEnd = buildDateTime(date, endTime);

		let slotStart = buildDateTime(date, startTime);
		let slotEnd = addMinutes(slotStart, SCHEDULE_INTERVAL_MINUTES);

		while (slotEnd <= dayEnd) {
			slots.push({ startDateTime: slotStart, endDateTime: slotEnd });
			slotStart = slotEnd;
			slotEnd = addMinutes(slotStart, SCHEDULE_INTERVAL_MINUTES);
		}
	}

	if (slots.length === 0) {
		throw new AppError(httpStatus.BAD_REQUEST, `Time range must be at least ${SCHEDULE_INTERVAL_MINUTES} minutes`);
	}

	// ১টা query: duplicate হলে skip, শুধু নতুন তৈরি হওয়াগুলো return
	return prisma.schedule.createManyAndReturn({
		data: slots,
		skipDuplicates: true,
	});
};
const getAllSchedules = async (query: IQueryParams) => {
	// invalid হলে ZodError → globalErrorHandler → 400
	const { startDate, endDate } = ScheduleValidation.scheduleDateQueryZodSchema.parse(query);

	const dateRange: Prisma.ScheduleWhereInput = {};

	if (startDate) {
		// ঢাকার ওই দিনের রাত 12টা থেকে
		dateRange.startDateTime = { gte: buildDateTime(startDate, "00:00") };
	}

	if (endDate) {
		// endDate দিনটাও ধরা হবে → পরের দিনের রাত 12টা পর্যন্ত
		dateRange.endDateTime = { lte: buildDateTime(addDaysToDateString(endDate, 1), "00:00") };
	}

	const result = await new QueryBuilder<Schedule, Prisma.ScheduleWhereInput, Prisma.ScheduleInclude>(
		prisma.schedule,
		query,
		{
			filterableFields: scheduleFilterableFields,
			sortableFields: scheduleSortableFields,
			selectableFields: scheduleSelectableFields,
			defaultSortBy: "startDateTime",
		},
	)
		.where(dateRange)
		.filter()
		.sort()
		.paginate()
		.fields()
		.dynamicInclude(scheduleIncludeConfig)
		.execute();

	return result;
};

const getScheduleById = async (id: string) => {
	const schedule = await prisma.schedule.findUnique({
		where: { id },
		include: scheduleIncludeConfig,
	});

	if (!schedule) {
		throw new AppError(httpStatus.NOT_FOUND, "Schedule not found");
	}

	return schedule;
};

const updateSchedule = async (id: string, payload: IUpdateSchedulePayload) => {
	const { startDate, endDate, startTime, endTime } = payload;

	const schedule = await prisma.schedule.findUnique({
		where: { id },
		include: { _count: { select: { appointments: true } } },
	});

	if (!schedule) {
		throw new AppError(httpStatus.NOT_FOUND, "Schedule not found");
	}

	// booked slot-এর সময় বদলালে রোগীর appointment-ও চুপচাপ বদলে যেত
	if (schedule._count.appointments > 0) {
		throw new AppError(httpStatus.CONFLICT, "Cannot update a schedule that already has appointments");
	}

	// date-fns-এর বদলে নিজের util — সবসময় ঢাকার সময়
	const startDateTime = buildDateTime(startDate, startTime);
	const endDateTime = buildDateTime(endDate, endTime);

	// @@unique([startDateTime, endDateTime]) ভাঙলে Prisma P2002 → 500, তাই আগেই check
	const duplicate = await prisma.schedule.findFirst({
		where: { startDateTime, endDateTime, NOT: { id } },
	});

	if (duplicate) {
		throw new AppError(httpStatus.CONFLICT, "A schedule already exists at this time");
	}

	return prisma.schedule.update({
		where: { id },
		data: { startDateTime, endDateTime },
	});
};

const deleteSchedule = async (id: string) => {
	const schedule = await prisma.schedule.findUnique({
		where: { id },
		include: { _count: { select: { appointments: true } } },
	});

	if (!schedule) {
		throw new AppError(httpStatus.NOT_FOUND, "Schedule not found");
	}

	// Appointment-এ onDelete: Restrict — DB আটকাত, কিন্তু P2003 → 500 হতো
	if (schedule._count.appointments > 0) {
		throw new AppError(httpStatus.CONFLICT, "Cannot delete a schedule that already has appointments");
	}

	// DoctorSchedules নিজে থেকেই cascade হয়ে মুছবে
	await prisma.schedule.delete({ where: { id } });
};

export const ScheduleService = {
	createSchedule,
	getAllSchedules,
	getScheduleById,
	updateSchedule,
	deleteSchedule,
};
