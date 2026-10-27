import type { Gender } from "@/generated/prisma/enums";

export interface IUpdateDoctorPayload {
	doctor: {
		name?: string;
		profilePhoto?: string;
		contactNumber?: string;
		address?: string;
		experience?: number;
		gender?: Gender;
		appointmentFee?: number;
		qualification?: string;
		currentWorkingPlace?: string;
		designation?: string;
	};
}
