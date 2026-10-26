import AppError from "@/app/errorHelpers/AppError";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { tokenUtils } from "@/app/utils/token";
import { UserStatus } from "@/generated/prisma/enums";
import httpStatus from "http-status";

interface IRegisterPatientPayload {
	name: string;
	email: string;
	password: string;
}

interface ILoginUserPayload {
	email: string;
	password: string;
}

// Better Auth-এর user থেকে access + refresh token বানানো
type TAuthUser = Awaited<ReturnType<typeof auth.api.signInEmail>>["user"];

const generateAuthTokens = (user: TAuthUser) => {
	const jwtPayload = {
		userId: user.id,
		role: user.role,
		name: user.name,
		email: user.email,
		status: user.status,
		isDeleted: user.isDeleted,
		emailVerified: user.emailVerified,
	};

	return {
		accessToken: tokenUtils.getAccessToken(jwtPayload),
		refreshToken: tokenUtils.getRefreshToken(jwtPayload),
	};
};

const registerPatient = async (payload: IRegisterPatientPayload) => {
	const { name, email, password } = payload;

	const data = await auth.api.signUpEmail({
		body: { name, email, password },
	});

	// শুধু patient তৈরি fail করলে user মুছে ফেলা হবে
	let patient: Awaited<ReturnType<typeof prisma.patient.create>>;
	try {
		patient = await prisma.patient.create({
			data: {
				userId: data.user.id,
				name,
				email,
			},
		});
	} catch (error) {
		console.error("Failed to create patient:", error);
		await prisma.user.delete({ where: { id: data.user.id } });
		throw error;
	}

	const { accessToken, refreshToken } = generateAuthTokens(data.user);

	return {
		...data,
		accessToken,
		refreshToken,
		patient,
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	const { email, password } = payload;

	// sign in-এর আগে check, যাতে blocked/deleted user-এর session তৈরি না হয়
	const user = await prisma.user.findUnique({ where: { email } });

	if (!user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.NOT_FOUND, "User is deleted");
	}

	const data = await auth.api.signInEmail({
		body: { email, password },
	});

	const { accessToken, refreshToken } = generateAuthTokens(data.user);

	return {
		...data,
		accessToken,
		refreshToken,
	};
};

export const AuthService = {
	registerPatient,
	loginUser,
};
