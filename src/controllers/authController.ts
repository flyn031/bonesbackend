import { Request, Response } from 'express';
import { PrismaClient, Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to build user response without password
const buildUserResponse = (user: any) => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    console.log('[Auth][Register] Attempt:', { email, name });
    
    if (!email || !password || !name) {
      console.log('[Auth][Register] Missing required fields');
      res.status(400).json({ message: 'Email, password, and name are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('[Auth][Register] User already exists:', email);
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role && Object.values(Role).includes(role.toUpperCase() as Role)
      ? (role.toUpperCase() as Role)
      : Role.USER;

    const createdUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: userRole,
      }
    });

    const userResponse = buildUserResponse(createdUser);

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[Auth][Register] JWT_SECRET not configured');
      res.status(201).json({
        user: userResponse,
        message: "User registered successfully, but session token could not be generated due to server configuration. Please try logging in."
      });
      return;
    }

    const token = jwt.sign({ id: createdUser.id, role: createdUser.role }, secret, { expiresIn: '24h' });

    console.log('[Auth][Register] User registered successfully:', { userId: createdUser.id, email: createdUser.email });
    res.status(201).json({ user: userResponse, token });
    
  } catch (error) {
    console.error('[Auth][Register] Registration error:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        res.status(400).json({ message: `An account with this email already exists.` });
        return;
      }
      console.error('[Auth][Register] Prisma Error Code:', error.code, error.meta);
    }
    
    res.status(500).json({ message: 'An unexpected error occurred during registration.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('[Auth][Login] Attempt for:', email);

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('[Auth][Login] User not found:', email);
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('[Auth][Login] Invalid password for user:', email);
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[Auth][Login] JWT_SECRET not configured');
      res.status(500).json({ message: 'Server configuration error: Unable to generate session token.' });
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: '24h' });

    console.log('[Auth][Login] Login successful for user:', { userId: user.id, email: user.email });
    
    const userResponse = buildUserResponse(user);
    res.json({
      user: userResponse,
      token,
    });
    
  } catch (error) {
    console.error('[Auth][Login] Login error:', error);
    res.status(500).json({ message: 'An unexpected error occurred during login.' });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    console.log('[Auth][getProfile] Attempting for userId:', userId);
    
    if (!userId) {
      console.log('[Auth][getProfile] Unauthorized - userId not in req.user');
      res.status(401).json({ message: 'Unauthorized - User ID missing' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
      }
    });

    if (!user) {
      console.log('[Auth][getProfile] User not found with ID:', userId);
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const companySettings = await prisma.companySettings.findFirst();

    // UPDATED: Include all company settings including quote terms
    const userProfileResponse = {
      ...user,
      companyName: companySettings?.companyName || null,
      companyAddress: companySettings?.companyAddress || null,
      companyPhone: companySettings?.companyPhone || null,
      companyEmail: companySettings?.companyEmail || null,
      companyWebsite: companySettings?.companyWebsite || null,
      companyVatNumber: companySettings?.companyVatNumber || null,
      companyLogo: companySettings?.companyLogo || null,
      
      // NEW: Quote terms fields
      standardWarranty: companySettings?.standardWarranty || null,
      standardDeliveryTerms: companySettings?.standardDeliveryTerms || null,
      defaultLeadTimeWeeks: companySettings?.defaultLeadTimeWeeks || null,
      standardExclusions: companySettings?.standardExclusions || null,
      useCompanyDetailsOnQuotes: companySettings?.useCompanyDetailsOnQuotes || false
    };

    console.log('[Auth][getProfile] Successfully fetched profile for userId:', userId);
    console.log('[Auth][getProfile] Returning complete profile:', JSON.stringify(userProfileResponse, null, 2));
    res.status(200).json(userProfileResponse);
    
    
  } catch (error) {
    console.error('[Auth][getProfile] Error getting user profile:', error);
    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('[Auth][getProfile] Prisma Validation Error Details:', error.message);
      res.status(500).json({ message: "Error constructing profile query.", details: error.message });
      return;
    }
    res.status(500).json({ message: 'Error retrieving user profile' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    console.log(`[Auth][updateProfile] Attempting for userId: ${userId} with body:`, req.body);
    
    if (!userId) {
      console.log('[Auth][updateProfile] Unauthorized - userId not in req.user');
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { name } = req.body;
    const { 
      companyName, companyAddress, companyPhone, companyEmail, companyWebsite, 
      companyVatNumber, companyLogo, quoteReferencePrefix, lastQuoteReferenceSeq,
      // NEW: Quote terms fields
      standardWarranty, standardDeliveryTerms, defaultLeadTimeWeeks, standardExclusions,
      useCompanyDetailsOnQuotes
    } = req.body;

    // Update user data if provided
    const userDataToUpdate: any = {};
    if (name !== undefined) userDataToUpdate.name = name;

    let updatedUserFromDb;
    if (Object.keys(userDataToUpdate).length > 0) {
      updatedUserFromDb = await prisma.user.update({
        where: { id: userId },
        data: userDataToUpdate,
      });
      console.log(`[Auth][updateProfile] User details updated for userId: ${userId}`);
    } else {
      updatedUserFromDb = await prisma.user.findUnique({ where: { id: userId } });
    }

    if (!updatedUserFromDb) {
      res.status(404).json({ message: "User to update not found." });
      return;
    }

    const userResponse = buildUserResponse(updatedUserFromDb);

    // UPDATED: Company settings data including new quote terms
    const companySettingsDataToUpdate: any = {};
    if (companyName !== undefined) companySettingsDataToUpdate.companyName = companyName;
    if (companyAddress !== undefined) companySettingsDataToUpdate.companyAddress = companyAddress;
    if (companyPhone !== undefined) companySettingsDataToUpdate.companyPhone = companyPhone;
    if (companyEmail !== undefined) companySettingsDataToUpdate.companyEmail = companyEmail;
    if (companyWebsite !== undefined) companySettingsDataToUpdate.companyWebsite = companyWebsite;
    if (companyVatNumber !== undefined) companySettingsDataToUpdate.companyVatNumber = companyVatNumber;
    if (companyLogo !== undefined) companySettingsDataToUpdate.companyLogo = companyLogo;
    
    // NEW: Quote terms fields
    if (standardWarranty !== undefined) companySettingsDataToUpdate.standardWarranty = standardWarranty;
    if (standardDeliveryTerms !== undefined) companySettingsDataToUpdate.standardDeliveryTerms = standardDeliveryTerms;
    if (defaultLeadTimeWeeks !== undefined) companySettingsDataToUpdate.defaultLeadTimeWeeks = defaultLeadTimeWeeks;
    if (standardExclusions !== undefined) companySettingsDataToUpdate.standardExclusions = standardExclusions;
    if (useCompanyDetailsOnQuotes !== undefined) companySettingsDataToUpdate.useCompanyDetailsOnQuotes = useCompanyDetailsOnQuotes;
    
    if (quoteReferencePrefix !== undefined) companySettingsDataToUpdate.quoteReferencePrefix = quoteReferencePrefix;
    if (lastQuoteReferenceSeq !== undefined) companySettingsDataToUpdate.lastQuoteReferenceSeq = lastQuoteReferenceSeq;

    let currentCompanySettings = await prisma.companySettings.findFirst();
    
    if (Object.keys(companySettingsDataToUpdate).length > 0) {
      if (currentCompanySettings) {
        currentCompanySettings = await prisma.companySettings.update({
          where: { id: currentCompanySettings.id },
          data: companySettingsDataToUpdate,
        });
        console.log(`[Auth][updateProfile] CompanySettings updated (ID: ${currentCompanySettings.id}).`);
      } else {
        // Create with defaults for required fields
        const createData = {
          quoteReferencePrefix: quoteReferencePrefix || 'QR',
          lastQuoteReferenceSeq: lastQuoteReferenceSeq || 0,
          
          // Include all the company settings fields
          ...companySettingsDataToUpdate
        };

        // Filter out undefined values
        const filteredCreateData = Object.fromEntries(
          Object.entries(createData).filter(([, value]) => value !== undefined)
        );
        
        if (Object.keys(filteredCreateData).length > 0) {
          currentCompanySettings = await prisma.companySettings.create({ data: filteredCreateData });
          console.log(`[Auth][updateProfile] CompanySettings created (ID: ${currentCompanySettings?.id}).`);
        }
      }
    }

    // UPDATED: Return all company settings including quote terms
    const profileResponse = {
      ...userResponse,
      companyName: currentCompanySettings?.companyName || null,
      companyAddress: currentCompanySettings?.companyAddress || null,
      companyPhone: currentCompanySettings?.companyPhone || null,
      companyEmail: currentCompanySettings?.companyEmail || null,
      companyWebsite: currentCompanySettings?.companyWebsite || null,
      companyVatNumber: currentCompanySettings?.companyVatNumber || null,
      companyLogo: currentCompanySettings?.companyLogo || null,
      
      // NEW: Include quote terms in response
      standardWarranty: currentCompanySettings?.standardWarranty || null,
      standardDeliveryTerms: currentCompanySettings?.standardDeliveryTerms || null,
      defaultLeadTimeWeeks: currentCompanySettings?.defaultLeadTimeWeeks || null,
      standardExclusions: currentCompanySettings?.standardExclusions || null,
      useCompanyDetailsOnQuotes: currentCompanySettings?.useCompanyDetailsOnQuotes || false
    };

    console.log(`[Auth][updateProfile] Profile update processed successfully for userId: ${userId}`);
    res.status(200).json(profileResponse);
    
  } catch (error) {
    console.error('[Auth][updateProfile] Error updating user profile:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        res.status(404).json({ message: "Record to update not found." });
        return;
      }
      console.error('[Auth][updateProfile] Prisma Error Code:', error.code, error.meta);
    }
    res.status(500).json({ message: 'Error updating user profile' });
  }
};