import type * as z from "zod";
import type { ScheduleValidation } from "./schedule.validation";

export type ICreateSchedulePayload = z.infer<typeof ScheduleValidation.createScheduleZodSchema>;
export type IUpdateSchedulePayload = z.infer<typeof ScheduleValidation.updateScheduleZodSchema>;
