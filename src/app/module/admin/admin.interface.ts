import type * as z from "zod";
import type { AdminValidation } from "./admin.validation";

export type IUpdateAdminPayload = z.infer<typeof AdminValidation.updateAdminValidationSchema>;
export type IChangeUserStatusPayload = z.infer<typeof AdminValidation.changeUserStatusValidationSchema>;
export type IChangeUserRolePayload = z.infer<typeof AdminValidation.changeUserRoleValidationSchema>;
