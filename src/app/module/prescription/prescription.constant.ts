import type { Prisma } from "@/generated/prisma/client";

export const prescriptionSearchableFields = ["instructions", "doctor.name", "patient.name"] as const;

export const prescriptionFilterableFields = ["doctorId", "patientId", "appointmentId"] as const;

export const prescriptionSortableFields = ["createdAt", "followUpDate"] as const;

// response-এ শুধু দরকারি field — videoCallingId, contactNumber, address কখনো না
export const prescriptionInclude = {
	doctor: { select: { id: true, name: true, email: true, profilePhoto: true, designation: true } },
	patient: { select: { id: true, name: true, email: true, profilePhoto: true } },
	appointment: {
		select: {
			id: true,
			status: true,
			schedule: { select: { startDateTime: true, endDateTime: true } },
		},
	},
} satisfies Prisma.PrescriptionInclude;

// update-এর সময় নতুন PDF বানাতে যা যা লাগে
export const prescriptionPdfInclude = {
	doctor: {
		select: {
			name: true,
			email: true,
			specialties: { select: { specialty: { select: { title: true } } } },
		},
	},
	patient: { select: { name: true, email: true } },
	appointment: { select: { schedule: { select: { startDateTime: true } } } },
} satisfies Prisma.PrescriptionInclude;
