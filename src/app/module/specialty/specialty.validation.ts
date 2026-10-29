import * as z from "zod";

const createSpecialtyZodSchema = z.object({
	title: z.string("Title is required"),
	description: z.string("Description is required").optional(),
});

export type TCreateSpecialtyPayload = z.infer<typeof createSpecialtyZodSchema>;

export const SpecialtyValidation = {
	createSpecialtyZodSchema,
};
