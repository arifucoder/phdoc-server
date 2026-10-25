import type { Server } from "http";
import app from "./app";
import { envVars } from "./app/config/env";

let server: Server;
const PORT = envVars.PORT;
const startServer = async () => {
	try {
		server = app.listen(PORT, () => {
			console.log(`Server is running on port http://localhost:${PORT}`);
		});
	} catch (error) {
		console.log(error);
	}
};

await startServer();
