import type { AppointmentStatus } from "@/generated/prisma/enums";

export interface IBookAppointmentPayload {
	doctorId: string;
	scheduleId: string;
}

export interface IChangeAppointmentStatusPayload {
	status: AppointmentStatus;
}
