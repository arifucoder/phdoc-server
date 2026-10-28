export interface ILoginUserPayload {
	email: string;
	password: string;
}

export interface IRegisterPatientPayload {
	name: string;
	email: string;
	password: string;
}

export interface IChangePasswordPayload {
	currentPassword: string;
	newPassword: string;
}

export interface IVerifyEmailPayload {
	email: string;
	otp: string;
}

export interface IForgetPasswordPayload {
	email: string;
}

export interface IResetPasswordPayload {
	email: string;
	otp: string;
	newPassword: string;
}
