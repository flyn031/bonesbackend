"use strict";
// backend/src/controllers/dashboardController.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderTrendKPIData = exports.getCustomerHealthDashboard = exports.getRecentActivityData = exports.getOrderTrendsData = exports.getDashboardData = void 0;
const customerHealthService_1 = require("../services/customerHealthService"); // Assuming path is correct
const dashboardService_1 = require("../services/dashboardService"); // Adjust path if needed
// --- getDashboardData ---
const getDashboardData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Controller: Fetching dashboard stats...');
        const dashboardData = yield (0, dashboardService_1.getDashboardStats)();
        console.log('Controller: Dashboard stats fetched:', dashboardData);
        res.json(dashboardData);
    }
    catch (error) {
        console.error('Controller: Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
    }
});
exports.getDashboardData = getDashboardData;
// --- getOrderTrendsData ---
const getOrderTrendsData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Controller: Fetching order trends data for chart...');
        const monthlyTrendsArray = yield (0, dashboardService_1.getOrderTrends)();
        console.log('Controller: Processed Monthly Trends for chart:', monthlyTrendsArray);
        res.json(monthlyTrendsArray);
    }
    catch (error) {
        console.error('Controller: Error fetching order trends for chart:', error);
        res.status(500).json({ error: 'Failed to fetch order trends', details: error.message });
    }
});
exports.getOrderTrendsData = getOrderTrendsData;
// --- getRecentActivityData ---
const getRecentActivityData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Controller: Fetching recent activity...');
        const activityData = yield (0, dashboardService_1.getRecentActivity)();
        const recentOrders = activityData.recentOrders || [];
        const recentCustomers = activityData.recentCustomers || [];
        console.log('Controller: Raw recent orders from service:', recentOrders);
        console.log('Controller: Raw recent customers from service:', recentCustomers);
        // Formatting Logic
        const formatDate = (date) => {
            if (!date)
                return 'N/A';
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            if (isNaN(dateObj.getTime()))
                return 'Invalid Date';
            return dateObj.toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        };
        const orderActivities = recentOrders.map((order) => {
            var _a;
            return ({
                id: order.id,
                title: `Order: ${order.projectTitle || 'N/A'}`,
                time: formatDate(order.updatedAt),
                status: `Status: ${order.status}`,
                description: `Customer: ${order.customerName || ((_a = order.customer) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown'}`,
                type: 'order',
                entityId: order.id,
                originalDate: order.updatedAt
            });
        });
        const customerActivities = recentCustomers.map((customer) => ({
            id: customer.id,
            title: `New Customer: ${customer.name}`,
            time: formatDate(customer.createdAt),
            status: 'Added',
            description: `Email: ${customer.email || 'N/A'}`,
            type: 'customer',
            entityId: customer.id,
            originalDate: customer.createdAt
        }));
        const combinedActivities = [...orderActivities, ...customerActivities]
            .sort((a, b) => new Date(b.originalDate).getTime() - new Date(a.originalDate).getTime())
            .slice(0, 5)
            .map((_a) => {
            var { originalDate } = _a, rest = __rest(_a, ["originalDate"]);
            return rest;
        });
        // End Formatting
        console.log('Controller: Combined recent activity:', combinedActivities);
        res.json(combinedActivities);
    }
    catch (error) {
        console.error('Controller: Error fetching/formatting recent activity:', error);
        res.status(500).json({ error: 'Failed to fetch recent activity', details: error.message });
    }
});
exports.getRecentActivityData = getRecentActivityData;
// --- getCustomerHealthDashboard --- (VERIFY THIS FUNCTION IS FULLY REPLACED)
const getCustomerHealthDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Controller: Fetching customer health dashboard data...');
        // Call the service function - it returns the summary object
        const customerHealthSummary = yield (0, customerHealthService_1.calculateCustomerHealth)();
        // Construct the response using the data ALREADY calculated by the service
        const dashboardData = {
            healthScores: customerHealthSummary.healthScores, // Use array from summary
            lastUpdated: new Date(),
            totalCustomers: customerHealthSummary.totalCustomers, // Use count from summary
            churnRiskBreakdown: customerHealthSummary.churnRiskBreakdown, // Use breakdown from summary
            // upsellOpportunities: customerHealthSummary.upsellOpportunities // Optionally include if needed
        };
        console.log('Controller: Customer health dashboard data fetched:', dashboardData); // Log the data being sent
        res.json(dashboardData); // Send the correctly structured data
    }
    catch (error) {
        console.error('Controller: Error in getCustomerHealthDashboard:', error instanceof Error ? error.message : error); // Log specific error
        // Send back a generic error message + the specific details from the caught error
        res.status(500).json({
            error: 'Failed to generate customer health dashboard', // Keep generic error message
            details: error instanceof Error ? error.message : String(error) // Send specific details
        });
    }
});
exports.getCustomerHealthDashboard = getCustomerHealthDashboard;
// --- getOrderTrendKPIData ---
const getOrderTrendKPIData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Controller: Fetching order trend KPI data...');
        const kpiData = yield (0, dashboardService_1.getOrderTrendKPI)();
        console.log('Controller: Order trend KPI data fetched:', kpiData);
        res.json(kpiData);
    }
    catch (error) {
        console.error('Controller: Error fetching order trend KPI:', error);
        res.status(500).json({ error: 'Failed to fetch order trend KPI data', details: error.message });
    }
});
exports.getOrderTrendKPIData = getOrderTrendKPIData;
