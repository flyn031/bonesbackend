"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const quoteService_1 = require("../../services/quoteService");
// Simple test to verify the test environment is working
describe('Backend Testing Environment', () => {
    test('jest is working', () => {
        expect(1 + 1).toBe(2);
    });
    test('can import functions', () => {
        expect(typeof quoteService_1.calculateQuoteTotals).toBe('function');
    });
});
