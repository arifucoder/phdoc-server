import { deleteFileFromCloudinary } from "@/app/config/cloudinary.config";
import { prisma } from "@/app/lib/prisma";
import type { Specialty } from "@/generated/prisma/client";
import type { TCreateSpecialtyPayload } from "./specialty.validation";

const createSpecialty = async (payload: TCreateSpecialtyPayload): Promise<Specialty> => {
	try {
		return await prisma.specialty.create({ data: payload });
	} catch (error) {
		// DB fail করলে (যেমন duplicate title) upload হওয়া ছবি মুছে দাও
		if (payload.icon) await deleteFileFromCloudinary(payload.icon);
		throw error;
	}
};

const getAllSpecialties = async (): Promise<Specialty[]> => {
	const specialties = await prisma.specialty.findMany();

	return specialties;
};

const deleteSpecialty = async (id: string) => {
	const specialty = await prisma.specialty.delete({
		where: {
			id,
		},
	});
	return specialty;
};

export const SpecialtyService = {
	createSpecialty,
	getAllSpecialties,
	deleteSpecialty,
};
