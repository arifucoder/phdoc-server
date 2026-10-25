import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { UserStatus } from "@/generated/prisma/enums";

interface IRegisterPatientPayload {
	name: string;
	email: string;
	password: string;
}

const registerPatient = async (payload: IRegisterPatientPayload) => {
	const { name, email, password } = payload;

	const data = await auth.api.signUpEmail({
		body: {
			name,
			email,
			password,
			//default values
			// needsPasswordChange: false,
			// role: Role.PATIENT
		},
	});

	if (!data.user) {
		throw new Error("Failed to register patient");
	}
	try {
		const patient = await prisma.$transaction(async (tx) => {
			const patientTx = await tx.patient.create({
				data: {
					userId: data.user.id,
					name,
					email,
				},
			});

			return patientTx;
		});

		return {
			...data,
			patient,
		};
	} catch (error) {
		console.error("Failed to create patient:", error);
		throw error;
	}
};

interface ILoginUserPayload {
	email: string;
	password: string;
}

const loginUser = async (payload: ILoginUserPayload) => {
	const { email, password } = payload;

	const data = await auth.api.signInEmail({
		body: {
			email,
			password,
		},
	});

	if (data.user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	return data;
};

export const AuthService = {
	registerPatient,
	loginUser,
};
