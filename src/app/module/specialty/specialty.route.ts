import { Router } from "express";
import { SpecialtyController } from "./specialty.controller";

const router = Router();

router.post("/create-specialty", SpecialtyController.createSpecialty);

export const SpecialtyRoutes = router;
