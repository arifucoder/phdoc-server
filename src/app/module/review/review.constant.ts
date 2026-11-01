import type { Prisma } from "@/generated/prisma/client";

export const reviewSearchableFields = ["comment"] as const;

export const reviewFilterableFields = ["doctorId", "rating"] as const;

export const reviewSortableFields = ["createdAt", "rating"] as const;

// public route — শুধু দেখানোর মতো field, email/phone/videoCallingId কখনো না
export const reviewPublicInclude = {
	patient: { select: { name: true, profilePhoto: true } },
	doctor: { select: { id: true, name: true, profilePhoto: true, designation: true } },
} satisfies Prisma.ReviewInclude;
