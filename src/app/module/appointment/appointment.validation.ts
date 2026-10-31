import { AppointmentStatus } from "@/generated/prisma/enums";
import * as z from "zod";

const bookAppointmentValidationSchema = z.object({
	doctorId: z.uuid("A valid doctorId is required"),
	scheduleId: z.uuid("A valid scheduleId is required"),
});

const changeAppointmentStatusValidationSchema = z.object({
	status: z.enum(AppointmentStatus, "Status must be SCHEDULED, INPROGRESS, COMPLETED or CANCELED"),
});

export const AppointmentValidation = {
	bookAppointmentValidationSchema,
	changeAppointmentStatusValidationSchema,
};
