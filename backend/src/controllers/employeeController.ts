// backend/src/controllers/employeeController.ts

import { Response, NextFunction } from 'express';
import prisma from '../utils/prismaClient';
import { AuthRequest } from '../types/express';
import { Role } from '@prisma/client';

export const getAllEmployees = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Fix for the role issue - using an appropriate existing role from the enum
        const employees = await prisma.user.findMany({
            where: { 
                // Using equals filter with an existing role from the enum
                role: Role.USER 
            }
        });
        res.json(employees);
    } catch (error) {
        next(error);
    }
};

export const getEmployeeById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const employee = await prisma.user.findUnique({
            where: { id }
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
                role: Role.USER, // Changed from 'EMPLOYEE' to a valid role
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