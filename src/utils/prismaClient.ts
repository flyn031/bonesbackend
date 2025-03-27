import { PrismaClient } from "@prisma/client";

// Create a single instance of Prisma client to use throughout the app
const prisma = new PrismaClient();

export default prisma;
