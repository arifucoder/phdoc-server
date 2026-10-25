import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import { IndexRoutes } from "./app/routes";

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

app.use("/api/v1", IndexRoutes);

export default app;
