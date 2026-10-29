import * as z from "zod";

const createSpecialtyZodSchema = z.object({
	title: z.string("Title is required").trim(),
	description: z.string("Description is required").trim().optional(),
});

export type TCreateSpecialtyPayload = z.infer<typeof createSpecialtyZodSchema> & {
	icon?: string;
};

export const SpecialtyValidation = {
	createSpecialtyZodSchema,
};
