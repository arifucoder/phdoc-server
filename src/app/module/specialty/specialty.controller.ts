import type { Request, Response } from "express";
import { SpecialtyService } from "./specialty.service";

const createSpecialty = async (req: Request, res: Response) => {
	try {
		const payload = req.body;
		const result = await SpecialtyService.createSpecialty(payload);

		res.status(201).json({
			success: true,
			message: "Specialty created successfully",
			data: result,
		});
		// oxlint-disable-next-line no-unused-vars
	} catch (error: any) {
		console.log(error);
		res.status(500).json({
			success: false,
			message: "Specialty create failed",
			error: error instanceof Error ? error.message : "unknown error",
		});
	}
};

const getAllSpecialties = async (req: Request, res: Response) => {
	try {
		const result = await SpecialtyService.getAllSpecialties();

		res.status(201).json({
			success: true,
			message: "Specialty fetched successfully",
			data: result,
		});
		// oxlint-disable-next-line no-unused-vars
	} catch (error: any) {
		console.log(error);
		res.status(500).json({
			success: false,
			message: "Specialty fetched failed",
			error: error instanceof Error ? error.message : "unknown error",
		});
	}
};

const deleteSpecialty = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const result = await SpecialtyService.deleteSpecialty(id as string);

		res.status(201).json({
			success: true,
			message: "Specialty deleted successfully",
			data: result,
		});
		// oxlint-disable-next-line no-unused-vars
	} catch (error: any) {
		console.log(error);
		res.status(500).json({
			success: false,
			message: "Specialty delete failed",
			error: error instanceof Error ? error.message : "unknown error",
		});
	}
};

export const SpecialtyController = {
	createSpecialty,
	getAllSpecialties,
	deleteSpecialty,
};
