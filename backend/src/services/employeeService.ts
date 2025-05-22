import { PrismaClient } from '@prisma/client';
import { EmployeeInput } from '../types/employeeTypes'; // We'll define this type next

const prisma = new PrismaClient();

// Create a new employee
export const createEmployee = async (employeeData: EmployeeInput) => {
  return prisma.employee.create({
    data: {
      name: employeeData.name,
      email: employeeData.email,
      phone: employeeData.phone,
      jobTitle: employeeData.jobTitle,
      technicalQualifications: employeeData.technicalQualifications || [], // Ensure it's an array, even if empty
      isActive: typeof employeeData.isActive === 'boolean' ? employeeData.isActive : true, // Default to true if not provided
      hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : undefined,
      terminationDate: employeeData.terminationDate ? new Date(employeeData.terminationDate) : undefined,
      notes: employeeData.notes,
      userId: employeeData.userId, // Link to existing User if provided
    },
  });
};

// Get all employees
export const getAllEmployees = async (isActive?: boolean) => {
  const whereClause: { isActive?: boolean } = {};
  if (typeof isActive === 'boolean') {
    whereClause.isActive = isActive;
  }
  return prisma.employee.findMany({
    where: whereClause,
    orderBy: { name: 'asc' }, // Order alphabetically by name
  });
};

// Get employee by ID
export const getEmployeeById = async (id: string) => {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      user: true, // Include associated user details
      timeEntries: true, // Optionally include time entries here, or fetch separately
    },
  });
};

// Update an employee
export const updateEmployee = async (id: string, employeeData: Partial<EmployeeInput>) => {
  return prisma.employee.update({
    where: { id },
    data: {
      name: employeeData.name,
      email: employeeData.email,
      phone: employeeData.phone,
      jobTitle: employeeData.jobTitle,
      technicalQualifications: employeeData.technicalQualifications,
      isActive: typeof employeeData.isActive === 'boolean' ? employeeData.isActive : undefined, // Allow setting to undefined if not provided in partial update
      hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : undefined,
      terminationDate: employeeData.terminationDate ? new Date(employeeData.terminationDate) : undefined,
      notes: employeeData.notes,
      userId: employeeData.userId,
    },
  });
};

// Delete an employee (consider soft delete by setting isActive to false instead)
export const deleteEmployee = async (id: string) => {
  // Option 1: Hard delete (removes record from DB)
  return prisma.employee.delete({
    where: { id },
  });

  // Option 2: Soft delete (recommended for retaining historical data and relations)
  // return prisma.employee.update({
  //   where: { id },
  //   data: { isActive: false },
  // });
};