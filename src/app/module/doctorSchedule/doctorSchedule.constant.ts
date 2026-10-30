import type { Prisma } from "@/generated/prisma/client";

// ?searchTerm=rahim → doctor-এর নাম/email দিয়ে খোঁজা (UUID-এ contains অর্থহীন)
export const doctorScheduleSearchableFields = ["doctor.name", "doctor.email"] as const;

// "id" নেই — DoctorSchedules-এর composite key (doctorId + scheduleId)
export const doctorScheduleFilterableFields = [
	"doctorId",
	"scheduleId",
	"isBooked",
	"schedule.startDateTime",
	"schedule.endDateTime",
	"createdAt",
] as const;

export const doctorScheduleSortableFields = ["createdAt", "schedule.startDateTime", "schedule.endDateTime"] as const;

// composite key দিয়ে tie-break
export const DOCTOR_SCHEDULE_TIE_BREAKERS = ["doctorId", "scheduleId"] as const;

// appointments ইচ্ছা করে রাখা হয়নি — রোগীর data appointment module থেকে আসবে
export const doctorScheduleIncludeConfig = {
	doctor: { include: { specialties: { include: { specialty: true } } } },
	schedule: true,
} satisfies Prisma.DoctorSchedulesInclude;
