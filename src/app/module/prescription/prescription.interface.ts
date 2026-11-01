export interface ICreatePrescriptionPayload {
	appointmentId: string;
	instructions: string;
	followUpDate?: Date;
}

export interface IUpdatePrescriptionPayload {
	instructions?: string;
	followUpDate?: Date | null; // null পাঠালে follow-up মুছে যাবে
}
