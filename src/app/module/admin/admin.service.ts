import AppError from "@/app/errorHelpers/AppError";
import type { IRequestUser } from "@/app/interfaces/requestUser.interface";
import { prisma } from "@/app/lib/prisma";
import { Role, UserStatus } from "@/generated/prisma/enums";
import httpStatus from "http-status";
import type { IUpdateAdminPayload } from "./admin.interface";

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

export const AdminService = {
	getAllAdmins,
	getAdminById,
	updateAdmin,
	deleteAdmin,
};
