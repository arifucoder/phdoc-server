import type { Prisma } from "@/generated/prisma/client";

// startDate / endDate filter service-এ আলাদা করে handle হয় (Dhaka time অনুযায়ী)
// ?doctorSchedules.doctor.id=<uuid> → ওই doctor-এর নেওয়া slot-গুলো
export const scheduleFilterableFields = ["doctorSchedules.doctor.id"] as const;

export const scheduleSortableFields = ["startDateTime", "endDateTime", "createdAt"] as const;

export const scheduleSelectableFields = ["id", "startDateTime", "endDateTime", "createdAt"] as const;

// appointments ইচ্ছা করে রাখা হয়নি — রোগীর data appointment module থেকে আসবে
export const scheduleIncludeConfig = {
	doctorSchedules: { include: { doctor: true } },
} satisfies Prisma.ScheduleInclude;

export const SCHEDULE_INTERVAL_MINUTES = 30;

// Asia/Dhaka — Bangladesh-এ DST নেই, তাই fixed offset নিরাপদ
export const CLINIC_UTC_OFFSET = "+06:00";
