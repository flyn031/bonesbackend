import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    console.log('[Auth] Register attempt:', { email, name }); // Don't log password

    // Validate input
    if (!email || !password || !name) {
      console.log('[Auth] Missing required fields');
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('[Auth] User already exists:', email);
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
        companyAddress: true,
        companyPhone: true,
        companyEmail: true,
        companyWebsite: true,
        companyVatNumber: true,
        companyLogo: true,
        useCompanyDetailsOnQuotes: true
      },
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || '',
      { expiresIn: '24h' }
    );

    console.log('[Auth] User registered successfully:', {
      userId: user.id,
      email: user.email,
      token: `${token.substring(0, 20)}...`
    });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log('[Auth] Login attempt for:', email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('[Auth] User not found:', email);
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('[Auth] Password valid:', validPassword);

    if (!validPassword) {
      console.log('[Auth] Invalid password for user:', email);
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    // Check JWT_SECRET
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[Auth] JWT_SECRET not configured');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn: '24h' }
    );

    console.log('[Auth] Login successful:', {
      userId: user.id,
      email: user.email,
      token: `${token.substring(0, 20)}...`
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyName: user.companyName,
        companyAddress: user.companyAddress,
        companyPhone: user.companyPhone,
        companyEmail: user.companyEmail,
        companyWebsite: user.companyWebsite,
        companyVatNumber: user.companyVatNumber,
        companyLogo: user.companyLogo,
        useCompanyDetailsOnQuotes: user.useCompanyDetailsOnQuotes,
      },
      token,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
};

// Get user profile including company details
export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
        companyAddress: true,
        companyPhone: true,
        companyEmail: true,
        companyWebsite: true,
        companyVatNumber: true,
        companyLogo: true,
        useCompanyDetailsOnQuotes: true,
        createdAt: true
      }
    });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('[Auth] Error getting user profile:', error);
    res.status(500).json({ error: 'Error retrieving user profile' });
  }
};

// Update user profile including company details
export const updateUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const {
      name,
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
      companyWebsite,
      companyVatNumber,
      companyLogo,
      useCompanyDetailsOnQuotes
    } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        companyName,
        companyAddress,
        companyPhone,
        companyEmail,
        companyWebsite,
        companyVatNumber,
        companyLogo,
        useCompanyDetailsOnQuotes
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
        companyAddress: true,
        companyPhone: true,
        companyEmail: true,
        companyWebsite: true,
        companyVatNumber: true,
        companyLogo: true,
        useCompanyDetailsOnQuotes: true
      }
    });
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('[Auth] Error updating user profile:', error);
    res.status(500).json({ error: 'Error updating user profile' });
  }
};