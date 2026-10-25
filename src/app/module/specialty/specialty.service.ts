import { prisma } from "@/app/lib/prisma";
import type { Specialty } from "@/generated/prisma/client";

const createSpecialty = async (payload: Specialty): Promise<Specialty> => {
	const specialty = await prisma.specialty.create({
		data: payload,
	});

	return specialty;
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
