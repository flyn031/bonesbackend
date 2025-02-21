import { PrismaClient } from '@prisma/client';

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

export class SupplierPerformanceService {
 private prisma: PrismaClient;

 constructor() {
   this.prisma = new PrismaClient();
 }

 async calculatePerformanceScore(supplierId: string): Promise<PerformanceMetrics> {
   console.log(`Calculating performance for supplier: ${supplierId}`);
   
   const supplier = await this.prisma.supplier.findUnique({
     where: { id: supplierId }
   });

   if (!supplier) {
     console.error(`No supplier found with ID: ${supplierId}`);
     throw new Error('Supplier not found');
   }

   const performanceHistory = supplier.performanceHistory 
     ? JSON.parse(supplier.performanceHistory as string) 
     : [];

   const completionRate = supplier.totalOrders > 0 
     ? (supplier.completedOrders / supplier.totalOrders) * 100 
     : 0;

   const performanceTrend = performanceHistory.length > 0 
     ? this.determinePerformanceTrend(performanceHistory.slice(-5)) 
     : 'STABLE';

   let performanceScore = 0;
   performanceScore += completionRate * 0.4;
   performanceScore += (100 - Math.min(supplier.averageDeliveryTime, 100)) * 0.3;
   performanceScore += this.getTrendScore(performanceTrend) * 0.3;

   return {
     supplierId: supplier.id,
     name: supplier.name,
     totalOrders: supplier.totalOrders,
     completedOrders: supplier.completedOrders,
     completionRate: Number(completionRate.toFixed(2)),
     averageDeliveryTime: supplier.averageDeliveryTime,
     status: supplier.status,
     performanceScore: Number(performanceScore.toFixed(2)),
     lastOrderDate: supplier.lastOrderDate || undefined,
     performanceTrend,
     recentPerformanceHistory: performanceHistory
   };
 }

 private determinePerformanceTrend(history: any[]): 'IMPROVING' | 'DECLINING' | 'STABLE' {
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

 async getSupplierPerformanceReport(supplierId: string) {
   return this.calculatePerformanceScore(supplierId);
 }

 async getAllSuppliersPerformance() {
   console.log('Starting getAllSuppliersPerformance');
   
   try {
     const suppliers = await this.prisma.supplier.findMany();
     
     console.log(`Total suppliers found: ${suppliers.length}`);
     console.log('Supplier IDs:', suppliers.map(s => s.id));
     
     if (suppliers.length === 0) {
       return [];
     }
     
     const performanceReports = [];
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