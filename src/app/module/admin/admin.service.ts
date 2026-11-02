import AppError from "@/app/errorHelpers/AppError";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { Role, UserStatus } from "@/generated/prisma/enums";
import httpStatus from "http-status";
import type { IChangeUserRolePayload, IChangeUserStatusPayload, IUpdateAdminPayload } from "./admin.interface";

const getAllAdmins = async () => {
	const admins = await prisma.admin.findMany({
		where: { isDeleted: false },
		include: { user: true },
	});
	return admins;
};

const getAdminById = async (id: string) => {
	const admin = await prisma.admin.findUnique({
		where: { id, isDeleted: false },
		include: { user: true },
	});

	if (!admin) {
		throw new AppError(httpStatus.NOT_FOUND, "Admin not found");
	}

	return admin;
};

const updateAdmin = async (id: string, payload: IUpdateAdminPayload, user: IRequestUser) => {
	//TODO: Validate who is updating the admin user. Only super admin can update admin user and only super admin can update super admin user but admin user cannot update super admin user

	const isAdminExist = await prisma.admin.findUnique({
		where: { id, isDeleted: false },
		include: { user: true },
	});

	if (!isAdminExist) {
		throw new AppError(httpStatus.NOT_FOUND, "Admin not found");
	}

	// ADMIN can update ADMIN, but only SUPER_ADMIN can update SUPER_ADMIN
	if (isAdminExist.user.role === Role.SUPER_ADMIN && user.role !== Role.SUPER_ADMIN) {
		throw new AppError(httpStatus.FORBIDDEN, "Only super admin can update a super admin");
	}

	const { admin } = payload;

	const updatedAdmin = await prisma.$transaction(async (tx) => {
		// keep User table in sync (used in login / JWT)
		if (admin.name !== undefined || admin.profilePhoto !== undefined) {
			await tx.user.update({
				where: { id: isAdminExist.userId },
				data: {
					name: admin.name,
					image: admin.profilePhoto,
				},
			});
		}

		return tx.admin.update({
			where: { id },
			data: admin,
			include: { user: true },
		});
	});

	return updatedAdmin;
};

//soft delete admin user by setting isDeleted to true and also delete the user session and account
const deleteAdmin = async (id: string, user: IRequestUser) => {
	//TODO: Validate who is deleting the admin user. Only super admin can delete admin user and only super admin can delete super admin user but admin user cannot delete super admin user

	const isAdminExist = await prisma.admin.findUnique({
		where: { id, isDeleted: false },
		include: { user: true },
	});

	if (!isAdminExist) {
		throw new AppError(httpStatus.NOT_FOUND, "Admin not found");
	}

	if (isAdminExist.userId === user.userId) {
		throw new AppError(httpStatus.BAD_REQUEST, "You cannot delete yourself");
	}
	// ADMIN can delete ADMIN, but only SUPER_ADMIN can delete SUPER_ADMIN
	if (isAdminExist.user.role === Role.SUPER_ADMIN && user.role !== Role.SUPER_ADMIN) {
		throw new AppError(httpStatus.FORBIDDEN, "Only super admin can delete a super admin");
	}

	const deletedAt = new Date();

	const result = await prisma.$transaction(async (tx) => {
		await tx.admin.update({
			where: { id },
			data: { isDeleted: true, deletedAt },
		});

		await tx.user.update({
			where: { id: isAdminExist.userId },
			data: {
				isDeleted: true,
				deletedAt,
				status: UserStatus.DELETED,
			},
		});

		await tx.session.deleteMany({
			where: { userId: isAdminExist.userId },
		});

		await tx.account.deleteMany({
			where: { userId: isAdminExist.userId },
		});

		return tx.admin.findUnique({
			where: { id },
			include: { user: true },
		});
	});

	return result;
};

// response-এ শুধু দরকারি field
const userPublicSelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	status: true,
	updatedAt: true,
} satisfies Prisma.UserSelect;

// SUPER_ADMIN → নিজে বাদে যে কারো status বদলাতে পারে
// ADMIN → শুধু DOCTOR আর PATIENT-এর status বদলাতে পারে
const changeUserStatus = async (user: IRequestUser, payload: IChangeUserStatusPayload) => {
	const { userId, userStatus } = payload;

	if (userId === user.userId) {
		throw new AppError(httpStatus.BAD_REQUEST, "You cannot change your own status");
	}

	const targetUser = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true, status: true, isDeleted: true },
	});

	// deleted user-কে আবার ACTIVE করা যাবে না
	if (!targetUser || targetUser.isDeleted || targetUser.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const isTargetAdminLevel = targetUser.role === Role.ADMIN || targetUser.role === Role.SUPER_ADMIN;

	if (user.role === Role.ADMIN && isTargetAdminLevel) {
		throw new AppError(httpStatus.FORBIDDEN, "Only super admin can change the status of an admin or super admin");
	}

	if (targetUser.status === userStatus) {
		throw new AppError(httpStatus.BAD_REQUEST, `User is already ${userStatus}`);
	}

	return prisma.$transaction(async (tx) => {
		const updatedUser = await tx.user.update({
			where: { id: userId },
			data: { status: userStatus },
			select: userPublicSelect,
		});

		// block হলে সব device থেকে logout
		if (userStatus === UserStatus.BLOCKED) {
			await tx.session.deleteMany({ where: { userId } });
		}

		return updatedUser;
	});
};

// শুধু SUPER_ADMIN, আর শুধু ADMIN ↔ SUPER_ADMIN
const changeUserRole = async (user: IRequestUser, payload: IChangeUserRolePayload) => {
	const { userId, role } = payload;

	if (userId === user.userId) {
		throw new AppError(httpStatus.BAD_REQUEST, "You cannot change your own role");
	}

	const targetUser = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true, status: true, isDeleted: true },
	});

	if (!targetUser || targetUser.isDeleted || targetUser.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	// DOCTOR/PATIENT-এর আলাদা profile table আছে, তাই role বদলানো যাবে না
	if (targetUser.role === Role.DOCTOR || targetUser.role === Role.PATIENT) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Role of doctor or patient cannot be changed. Delete and recreate the user with the new role",
		);
	}

	if (targetUser.role === role) {
		throw new AppError(httpStatus.BAD_REQUEST, `User is already ${role}`);
	}

	return prisma.$transaction(async (tx) => {
		const updatedUser = await tx.user.update({
			where: { id: userId },
			data: { role },
			select: userPublicSelect,
		});

		// পুরনো role-এর JWT যেন আর না চলে → আবার login করতে হবে
		await tx.session.deleteMany({ where: { userId } });

		return updatedUser;
	});
};

export const AdminService = {
	getAllAdmins,
	getAdminById,
	updateAdmin,
	deleteAdmin,
	changeUserStatus,
	changeUserRole,
};
