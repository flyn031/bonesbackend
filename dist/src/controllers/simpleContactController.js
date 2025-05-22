"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContactPersons = exports.createContactPerson = void 0;
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const createContactPerson = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        const { name, email, phone, role, notes, isPrimary } = req.body;
        console.log(`[SimpleContactCtrl] Creating contact for customer ${customerId}`);
        // Find the customer
        const customer = yield prismaClient_1.default.customer.findUnique({
            where: { id: customerId }
        });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        // Create the contact without any validation
        const contact = yield prismaClient_1.default.contactPerson.create({
            data: {
                name,
                email: email || null,
                phone: phone || null,
                role: role, // Force bypass type checking
                notes: notes || null,
                isPrimary: isPrimary || false,
                customer: { connect: { id: customerId } }
            }
        });
        console.log(`[SimpleContactCtrl] Created contact: ${contact.id}`);
        return res.status(201).json(contact);
    }
    catch (error) {
        console.error('[SimpleContactCtrl] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});
exports.createContactPerson = createContactPerson;
const getContactPersons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        const contacts = yield prismaClient_1.default.contactPerson.findMany({
            where: { customerId }
        });
        return res.status(200).json(contacts);
    }
    catch (error) {
        console.error('[SimpleContactCtrl] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});
exports.getContactPersons = getContactPersons;
