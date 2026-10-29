import type { Prisma } from "@/generated/prisma/client";

export const doctorSearchableFields = [
	"name",
	"email",
	"qualification",
	"designation",
	"currentWorkingPlace",
	"specialties.specialty.title",
] as const;

export const doctorFilterableFields = [
	"gender",
	"experience",
	"appointmentFee",
	"averageRating",
	"designation",
	"specialties.specialty.title",
] as const;

export const doctorSortableFields = ["createdAt", "name", "experience", "appointmentFee", "averageRating"] as const;

export const doctorSelectableFields = [
	"id",
	"name",
	"email",
	"profilePhoto",
	"experience",
	"gender",
	"address",
	"appointmentFee",
	"qualification",
	"designation",
	"currentWorkingPlace",
	"averageRating",
	"createdAt",
] as const;

export const doctorIncludeConfig = {
	appointments: { include: { patient: true, schedule: true } },
	doctorSchedules: { include: { schedule: true } },
	prescriptions: true,
	reviews: true,
} satisfies Prisma.DoctorInclude;

export const doctorEnumFields = ["gender"] as const;

export const doctorCaseInsensitiveFields = ["designation", "specialties.specialty.title"] as const;
