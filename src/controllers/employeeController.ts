// backend/src/controllers/employeeController.ts

import { Response, NextFunction } from 'express';
import prisma from '../utils/prismaClient';
import { AuthRequest } from '../types/express';
import { Role } from '@prisma/client';

export const getAllEmployees = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Get all users who can be employees (exclude customer-only roles if any)
        const employees = await prisma.user.findMany({
            where: { 
                // Include all employee roles that can track time
                role: { 
                    in: [Role.USER, Role.ADMIN] // Only roles that exist in your schema
                }
            },
            select: {
                id: true,
                name: true, 
                email: true,
                role: true,
                // Add other fields you want in the dropdown
                createdAt: true
            },
            orderBy: {
                name: 'asc' // Sort alphabetically for better UX
            }
        });
        
        console.log('🔍 Backend found employees:', employees.length);
        
        // *** THIS IS THE KEY FIX: Return wrapped format ***
        res.json({ employees });
    } catch (error) {
        console.error('Error fetching employees:', error);
        next(error);
    }
};

export const getEmployeeById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const employee = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            }
        });
        
        if (!employee) {
            res.status(404).json({ message: 'Employee not found' });
            return;
        }
        
        res.json(employee);
    } catch (error) {
        next(error);
    }
};

export const createEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, email, role, ...data } = req.body;
        
        const employee = await prisma.user.create({
            data: {
                name,
                email,
                role: Role.USER,
                ...data
            }
        });
        
        res.status(201).json(employee);
    } catch (error) {
        next(error);
    }
};

export const updateEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { ...data } = req.body;
        
        const employee = await prisma.user.update({
            where: { id },
            data
        });
        
        res.json(employee);
    } catch (error) {
        next(error);
    }
};

export const deleteEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        await prisma.user.delete({
            where: { id }
        });
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};