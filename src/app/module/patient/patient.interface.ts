import type * as z from "zod";
import type { PatientValidation } from "./patient.validation";

// Zod থেকেই type — schema বদলালে type নিজে নিজে বদলাবে
export type TUpdatePatientProfileInput = z.infer<typeof PatientValidation.updatePatientProfileZodSchema>;
export type THealthDataInput = NonNullable<TUpdatePatientProfileInput["patientHealthData"]>;

export interface INewMedicalReport {
	reportName: string;
	reportLink: string;
	reportPublicId: string;
}

// validation-এর পরে middleware এই দুইটা যোগ করে (শুধু নিজের upload করা file)
export type TUpdatePatientProfilePayload = TUpdatePatientProfileInput & {
	profilePhoto?: string;
	newMedicalReports?: INewMedicalReport[];
};
