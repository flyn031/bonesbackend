"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Create a single instance of Prisma client to use throughout the app
const prisma = new client_1.PrismaClient();
exports.default = prisma;
