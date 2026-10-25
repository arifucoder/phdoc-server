import { prisma } from "@/app/lib/prisma";
import type { Specialty } from "@/generated/prisma/client";

const createSpecialty = async (payload: Specialty): Promise<Specialty> => {
	const specialty = await prisma.specialty.create({
		data: payload,
	});

	return specialty;
};

export const SpecialtyService = {
	createSpecialty,
};
