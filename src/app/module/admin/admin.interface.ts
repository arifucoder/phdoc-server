import type * as z from "zod";
import type { AdminValidation } from "./admin.validation";

export type IUpdateAdminPayload = z.infer<typeof AdminValidation.updateAdminValidationSchema>;
