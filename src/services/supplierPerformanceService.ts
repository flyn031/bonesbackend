import { PrismaClient, Supplier, SupplierStatus } from '@prisma/client';

// Define an extended interface for Supplier with the expected properties
interface SupplierWithPerformance extends Supplier {
  // These properties don't actually exist in the DB schema, but will be calculated
  performanceHistory?: string | null;
  totalOrders?: number;
  completedOrders?: number;
  averageDeliveryTime?: number;
  lastOrderDate?: Date | null;
}

interface PerformanceMetrics {
 supplierId: string;
 name: string;
 totalOrders: number;
 completedOrders: number;
 completionRate: number;
 averageDeliveryTime: number;
 status: string;
 performanceScore: number;
 lastOrderDate?: Date;
 performanceTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
 recentPerformanceHistory: Array<{
   date: Date;
   deliveryTime: number;
   orderCompleted: boolean;
 }>;
}

// Define interface for performance history entries
interface PerformanceHistoryEntry {
  date: Date;
  deliveryTime: number;
  orderCompleted: boolean;
}

export class SupplierPerformanceService {
 private prisma: PrismaClient;

 constructor() {
   this.prisma = new PrismaClient();
 }

 async calculatePerformanceScore(supplierId: string): Promise<PerformanceMetrics> {
   console.log(`Calculating performance for supplier: ${supplierId}`);
   
   // Get the base supplier info
   const supplierBase = await this.prisma.supplier.findUnique({
     where: { id: supplierId },
     include: {
       // Include any relevant relations to help calculate performance metrics
       // For example:
       // materials: true,
       // orders: true, // Assuming there might be an orders relation
     }
   });

   if (!supplierBase) {
     console.error(`No supplier found with ID: ${supplierId}`);
     throw new Error('Supplier not found');
   }

   // Create an extended supplier object with calculated performance data
   const supplier: SupplierWithPerformance = supplierBase;
   
   // Calculate performance metrics dynamically
   // Here you would normally calculate these from related data like orders
   // For now, using default values as placeholders
   
   // Example calculation (in a real system, this would be based on actual data)
   const calculatedTotalOrders = 0; // This would be calculated from orders relation
   const calculatedCompletedOrders = 0; // This would be calculated from orders relation
   const calculatedAvgDeliveryTime = 0; // This would be calculated from orders relation
   
   // Assign calculated values
   supplier.totalOrders = calculatedTotalOrders;
   supplier.completedOrders = calculatedCompletedOrders;
   supplier.averageDeliveryTime = calculatedAvgDeliveryTime;
   supplier.performanceHistory = '[]'; // Default empty history as JSON string
   
   // Parse performanceHistory or use empty array if not available with proper typing
   let performanceHistory: PerformanceHistoryEntry[] = [];
   try {
     performanceHistory = supplier.performanceHistory 
       ? JSON.parse(supplier.performanceHistory) 
       : [];
   } catch (error) {
     console.warn(`Failed to parse performance history for supplier ${supplierId}:`, error);
     performanceHistory = [];
   }

   // Calculate completion rate safely
   const completionRate = (supplier.totalOrders || 0) > 0 
     ? ((supplier.completedOrders || 0) / (supplier.totalOrders || 1)) * 100 
     : 0;

   const performanceTrend = performanceHistory.length > 0 
     ? this.determinePerformanceTrend(performanceHistory.slice(-5)) 
     : 'STABLE';

   let performanceScore = 0;
   performanceScore += completionRate * 0.4;
   performanceScore += (100 - Math.min(supplier.averageDeliveryTime || 0, 100)) * 0.3;
   performanceScore += this.getTrendScore(performanceTrend) * 0.3;

   return {
     supplierId: supplier.id,
     name: supplier.name,
     totalOrders: supplier.totalOrders || 0,
     completedOrders: supplier.completedOrders || 0,
     completionRate: Number(completionRate.toFixed(2)),
     averageDeliveryTime: supplier.averageDeliveryTime || 0,
     status: supplier.status,
     performanceScore: Number(performanceScore.toFixed(2)),
     lastOrderDate: supplier.lastOrderDate || undefined,
     performanceTrend,
     recentPerformanceHistory: performanceHistory
   };
 }

 private determinePerformanceTrend(history: PerformanceHistoryEntry[]): 'IMPROVING' | 'DECLINING' | 'STABLE' {
   if (history.length < 2) return 'STABLE';

   const completedOrderRates = history.map(entry => 
     entry.orderCompleted ? 1 : 0
   );

   const trend = completedOrderRates.reduce((acc, curr, index) => {
     if (index > 0) {
       acc += curr - completedOrderRates[index - 1];
     }
     return acc;
   }, 0);

   if (trend > 0.5) return 'IMPROVING';
   if (trend < -0.5) return 'DECLINING';
   return 'STABLE';
 }

 private getTrendScore(trend: 'IMPROVING' | 'DECLINING' | 'STABLE'): number {
   switch (trend) {
     case 'IMPROVING': return 100;
     case 'STABLE': return 50;
     case 'DECLINING': return 0;
   }
 }

 async getSupplierPerformanceReport(supplierId: string): Promise<PerformanceMetrics> {
   return this.calculatePerformanceScore(supplierId);
 }

 async getAllSuppliersPerformance(): Promise<PerformanceMetrics[]> {
   console.log('Starting getAllSuppliersPerformance');
   
   try {
     const suppliers = await this.prisma.supplier.findMany();
     
     console.log(`Total suppliers found: ${suppliers.length}`);
     console.log('Supplier IDs:', suppliers.map(s => s.id));
     
     if (suppliers.length === 0) {
       return [];
     }
     
     // ✅ FIXED: Properly type the performanceReports array to prevent "never" type inference
     const performanceReports: PerformanceMetrics[] = [];
     for (const supplier of suppliers) {
       try {
         const report = await this.calculatePerformanceScore(supplier.id);
         performanceReports.push(report);
       } catch (error) {
         console.error(`Error calculating performance for supplier ${supplier.id}:`, error);
       }
     }

     console.log(`Total performance reports: ${performanceReports.length}`);
     return performanceReports;
   } catch (error) {
     console.error('Unexpected error in getAllSuppliersPerformance:', error);
     throw error;
   }
 }
}