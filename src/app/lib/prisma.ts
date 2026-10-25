import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import "dotenv/config";
import { envVars } from "../config/env";

const adapter = new PrismaPg({ connectionString: envVars.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
