import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import { prisma } from "./app/lib/prisma";

const app = express();

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

app.use(express.json()); // request body থেকে JSON পড়ার জন্য
app.use(cors());

app.get("/", (req: Request, res: Response) => {
	res.json({
		message: "Welcome to phdoc!",
	});
});

app.post("/specialty", async (req: Request, res: Response) => {
	const specialty = await prisma.specialty.create({
		data: { title: "Neurology" },
	});
	res.status(201).json({ message: "specialty created", data: specialty });
});

export default app;
