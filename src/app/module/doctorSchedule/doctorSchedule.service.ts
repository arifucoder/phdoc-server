import AppError from "@/app/errorHelpers/AppError";
import type { IQueryParams } from "@/app/interfaces/query.interface";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { prisma } from "@/app/lib/prisma";
import { QueryBuilder } from "@/app/utils/QueryBuilder";
import type { DoctorSchedules, Prisma } from "@/generated/prisma/client";
import httpStatus from "http-status";
import {
	DOCTOR_SCHEDULE_TIE_BREAKERS,
	doctorScheduleFilterableFields,
	doctorScheduleIncludeConfig,
	doctorScheduleSearchableFields,
	doctorScheduleSortableFields,
} from "./doctorSchedule.constant";
import type { ICreateDoctorSchedulePayload, IUpdateDoctorSchedulePayload } from "./doctorSchedule.interface";

// ---------- helpers ----------

// logged-in user-এর doctor profile (না থাকলে 404, 500 না)
const getDoctorByEmail = async (email: string) => {
	const doctor = await prisma.doctor.findUnique({
		where: { email },
		select: { id: true, isDeleted: true },
	});

	if (!doctor || doctor.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor profile not found");
	}

	return doctor;
};

// সব id সত্যিই আছে কিনা + ভবিষ্যতের slot কিনা
const ensureSchedulesAvailable = async (scheduleIds: string[]) => {
	if (scheduleIds.length === 0) return;

	const schedules = await prisma.schedule.findMany({
		where: { id: { in: scheduleIds }, startDateTime: { gt: new Date() } },
		select: { id: true },
	});

	if (schedules.length !== scheduleIds.length) {
		const found = new Set(schedules.map((s) => s.id));
		const invalidIds = scheduleIds.filter((id) => !found.has(id));
		throw new AppError(httpStatus.BAD_REQUEST, `Invalid or past schedule id(s): ${invalidIds.join(", ")}`);
	}
};

// ---------- services ----------

const createMyDoctorSchedule = async (user: IRequestUser, payload: ICreateDoctorSchedulePayload) => {
	const doctor = await getDoctorByEmail(user.email);
	await ensureSchedulesAvailable(payload.scheduleIds);

	const data: Prisma.DoctorSchedulesCreateManyInput[] = payload.scheduleIds.map((scheduleId) => ({
		doctorId: doctor.id,
		scheduleId,
	}));

	// আগে থেকে নেওয়া slot হলে error না — skip
	await prisma.doctorSchedules.createMany({ data, skipDuplicates: true });

	return prisma.doctorSchedules.findMany({
		where: { doctorId: doctor.id, scheduleId: { in: payload.scheduleIds } },
		include: { schedule: true },
		orderBy: { schedule: { startDateTime: "asc" } },
	});
};

const getMyDoctorSchedules = async (user: IRequestUser, query: IQueryParams) => {
	const doctor = await getDoctorByEmail(user.email);

	return (
		new QueryBuilder<DoctorSchedules, Prisma.DoctorSchedulesWhereInput, Prisma.DoctorSchedulesInclude>(
			prisma.doctorSchedules,
			query,
			{
				filterableFields: doctorScheduleFilterableFields,
				sortableFields: doctorScheduleSortableFields,
				tieBreakerFields: DOCTOR_SCHEDULE_TIE_BREAKERS,
				defaultSortBy: "schedule.startDateTime",
			},
		)
			// code থেকে fixed condition — query দিয়ে override করা যাবে না
			.where({ doctorId: doctor.id })
			.filter()
			.sort()
			.paginate()
			.include({ schedule: true })
			.execute()
	);
};

const getAllDoctorSchedules = async (query: IQueryParams) => {
	return new QueryBuilder<DoctorSchedules, Prisma.DoctorSchedulesWhereInput, Prisma.DoctorSchedulesInclude>(
		prisma.doctorSchedules,
		query,
		{
			searchableFields: doctorScheduleSearchableFields,
			filterableFields: doctorScheduleFilterableFields,
			sortableFields: doctorScheduleSortableFields,
			tieBreakerFields: DOCTOR_SCHEDULE_TIE_BREAKERS,
			defaultSortBy: "schedule.startDateTime",
		},
	)
		.search()
		.filter()
		.sort()
		.paginate()
		.dynamicInclude(doctorScheduleIncludeConfig, ["schedule"])
		.execute();
};

const getDoctorScheduleById = async (doctorId: string, scheduleId: string) => {
	const doctorSchedule = await prisma.doctorSchedules.findUnique({
		where: { doctorId_scheduleId: { doctorId, scheduleId } },
		include: { schedule: true, doctor: true },
	});

	if (!doctorSchedule) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor schedule not found");
	}

	return doctorSchedule;
};

const updateMyDoctorSchedule = async (user: IRequestUser, payload: IUpdateDoctorSchedulePayload) => {
	const doctor = await getDoctorByEmail(user.email);

	const deleteIds = payload.scheduleIds.filter((s) => s.shouldDelete).map((s) => s.id);
	const createIds = payload.scheduleIds.filter((s) => !s.shouldDelete).map((s) => s.id);

	await ensureSchedulesAvailable(createIds);

	return prisma.$transaction(async (tx) => {
		if (deleteIds.length > 0) {
			const booked = await tx.doctorSchedules.findMany({
				where: { doctorId: doctor.id, scheduleId: { in: deleteIds }, isBooked: true },
				select: { scheduleId: true },
			});

			// throw করলে পুরো transaction rollback
			if (booked.length > 0) {
				throw new AppError(
					httpStatus.BAD_REQUEST,
					`Booked schedule(s) cannot be removed: ${booked.map((b) => b.scheduleId).join(", ")}`,
				);
			}
		}

		const deleted = await tx.doctorSchedules.deleteMany({
			where: { doctorId: doctor.id, isBooked: false, scheduleId: { in: deleteIds } },
		});

		const created = await tx.doctorSchedules.createMany({
			data: createIds.map((scheduleId) => ({ doctorId: doctor.id, scheduleId })),
			skipDuplicates: true,
		});

		return { deletedCount: deleted.count, createdCount: created.count };
	});
};

const deleteMyDoctorSchedule = async (scheduleId: string, user: IRequestUser) => {
	const doctor = await getDoctorByEmail(user.email);

	const doctorSchedule = await prisma.doctorSchedules.findUnique({
		where: { doctorId_scheduleId: { doctorId: doctor.id, scheduleId } },
		select: { isBooked: true },
	});

	if (!doctorSchedule) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor schedule not found");
	}

	if (doctorSchedule.isBooked) {
		throw new AppError(httpStatus.BAD_REQUEST, "Booked schedule cannot be deleted");
	}

	// check আর delete-এর মাঝে কেউ book করে ফেললে count 0 হবে
	const { count } = await prisma.doctorSchedules.deleteMany({
		where: { doctorId: doctor.id, scheduleId, isBooked: false },
	});

	if (count === 0) {
		throw new AppError(httpStatus.CONFLICT, "Schedule was just booked and cannot be deleted");
	}
};

export const DoctorScheduleService = {
	createMyDoctorSchedule,
	getMyDoctorSchedules,
	getAllDoctorSchedules,
	getDoctorScheduleById,
	updateMyDoctorSchedule,
	deleteMyDoctorSchedule,
};
