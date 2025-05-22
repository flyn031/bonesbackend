// backend/src/types/employeeTypes.ts

// This type represents the data expected when creating or updating an employee
export interface EmployeeInput {
    name: string;
    email?: string; // Optional email
    phone?: string; // Optional phone
    jobTitle: string;
    technicalQualifications?: string[]; // Optional array of strings. If not provided, will default to [] in service.
    isActive?: boolean; // Optional, defaults to true in service
    hireDate?: string; // Can be string (ISO date) from frontend, converted to Date object in service
    terminationDate?: string; // Can be string (ISO date) from frontend, converted to Date object in service
    notes?: string;
    userId?: string; // Optional: Link to an existing User if this employee is also a system user
  }
  
  // This type represents the data structure of an Employee as returned from Prisma (database)
  // It includes the 'id' and timestamps, and relations.
  // For robust typing, you can import the Prisma generated type like:
  // import { Employee as PrismaEmployee } from '@prisma/client';
  // export type EmployeeResponse = PrismaEmployee;
  // For now, this manual definition is sufficient for what the service expects to return,
  // but be aware that the actual Prisma client might return more fields (like relations).
  export interface EmployeeResponse {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    jobTitle: string;
    technicalQualifications: string[]; // This will be an empty array if not set, not null.
    isActive: boolean;
    hireDate: Date | null;
    terminationDate: Date | null;
    notes: string | null;
    userId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }