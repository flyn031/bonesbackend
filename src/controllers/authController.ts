// backend/src/controllers/authController.ts

import { Request, Response } from 'express'; // Ensure Request is imported
import { PrismaClient, Prisma, Role as PrismaRole, User as PrismaUser } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// REMOVED: AuthRequest no longer needs to be imported as we've augmented the global Express.Request type.

const prisma = new PrismaClient();

// Helper to build user response without password
const buildUserResponse = (user: Partial<PrismaUser>) => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

export const register = async (req: Request, res: Response): Promise<void> => {
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
      select: {
        id: true,
        email: true
      }
    });

    if (existingUser) {
      console.log('[Auth][Register] User already exists:', email);
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRole: PrismaRole = role && Object.values(PrismaRole).includes(role.toUpperCase())
                                  ? role.toUpperCase() as PrismaRole
                                  : PrismaRole.USER;

    const createdUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: userRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true
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

    const token = jwt.sign(
      { id: createdUser.id, role: createdUser.role },
      secret,
      { expiresIn: '24h' }
    );

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

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log('[Auth][Login] Attempt for:', email);

    if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
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

    const token = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn: '24h' }
    );

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

// Use Request from 'express' because the 'user' property is now augmented globally
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id; // 'user' property is now available on Request
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

    const userProfileResponse = {
        ...user,
        companyName: companySettings?.companyName || null,
        companyAddress: companySettings?.companyAddress || null,
        companyPhone: companySettings?.companyPhone || null,
        companyEmail: companySettings?.companyEmail || null,
        companyWebsite: companySettings?.companyWebsite || null,
        companyVatNumber: companySettings?.companyVatNumber || null,
        companyLogo: companySettings?.companyLogo || null,
    };

    console.log('[Auth][getProfile] Successfully fetched profile for userId:', userId);
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

// Use Request from 'express' because the 'user' property is now augmented globally
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id; // 'user' property is now available on Request
    console.log(`[Auth][updateProfile] Attempting for userId: ${userId} with body:`, req.body);

    if (!userId) {
      console.log('[Auth][updateProfile] Unauthorized - userId not in req.user');
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { name } = req.body;
    const {
      companyName, companyAddress, companyPhone, companyEmail,
      companyWebsite, companyVatNumber, companyLogo,
      // Extracted for clarity, they will be used in createData for new settings
      quoteReferencePrefix, lastQuoteReferenceSeq
    } = req.body;

    const userDataToUpdate: Prisma.UserUpdateInput = {};
    if (name !== undefined) userDataToUpdate.name = name;

    let updatedUserFromDb;
    if (Object.keys(userDataToUpdate).length > 0) {
        updatedUserFromDb = await prisma.user.update({
            where: { id: userId },
            data: userDataToUpdate,
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              createdAt: true,
              updatedAt: true
            }
        });
        console.log(`[Auth][updateProfile] User details updated for userId: ${userId}`);
    } else {
        // If no user-specific data to update, just fetch the current user to build the response
        updatedUserFromDb = await prisma.user.findUnique({ 
          where: {id: userId},
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        });
    }

    if (!updatedUserFromDb) {
        res.status(404).json({ message: "User to update not found."});
        return;
    }
    const userResponse = buildUserResponse(updatedUserFromDb);


    const companySettingsDataToUpdate: Prisma.CompanySettingsUpdateInput = {};
    if (companyName !== undefined) companySettingsDataToUpdate.companyName = companyName;
    if (companyAddress !== undefined) companySettingsDataToUpdate.companyAddress = companyAddress;
    if (companyPhone !== undefined) companySettingsDataToUpdate.companyPhone = companyPhone;
    if (companyEmail !== undefined) companySettingsDataToUpdate.companyEmail = companyEmail;
    if (companyWebsite !== undefined) companySettingsDataToUpdate.companyWebsite = companyWebsite;
    if (companyVatNumber !== undefined) companySettingsDataToUpdate.companyVatNumber = companyVatNumber;
    if (companyLogo !== undefined) companySettingsDataToUpdate.companyLogo = companyLogo;
    // Handle quoteReferencePrefix and lastQuoteReferenceSeq as update inputs
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
            // Create CompanySettings if they don't exist and there's data for them
            // Ensure values for createData are plain strings/numbers, not update inputs
            const createData: Prisma.CompanySettingsCreateInput = {
                // Extract actual values from potentially Prisma update inputs
                quoteReferencePrefix:
                    (typeof quoteReferencePrefix === 'object' && quoteReferencePrefix !== null && 'set' in quoteReferencePrefix)
                        ? (quoteReferencePrefix.set as string)
                        : (quoteReferencePrefix as string), // Cast directly if it's already a string or undefined

                lastQuoteReferenceSeq:
                    (typeof lastQuoteReferenceSeq === 'object' && lastQuoteReferenceSeq !== null && 'set' in lastQuoteReferenceSeq)
                        ? (lastQuoteReferenceSeq.set as number)
                        : (lastQuoteReferenceSeq as number), // Cast directly if it's already a number or undefined

                // Carry over other explicitly handled simple properties for creation
                companyName: companySettingsDataToUpdate.companyName as string | undefined,
                companyAddress: companySettingsDataToUpdate.companyAddress as string | undefined,
                companyPhone: companySettingsDataToUpdate.companyPhone as string | undefined,
                companyEmail: companySettingsDataToUpdate.companyEmail as string | undefined,
                companyWebsite: companySettingsDataToUpdate.companyWebsite as string | undefined,
                companyVatNumber: companySettingsDataToUpdate.companyVatNumber as string | undefined,
                companyLogo: companySettingsDataToUpdate.companyLogo as string | undefined,
                // Add more fields here if they are simple types and should be part of creation
                // and you aren't already handling them above.
            };

            // Provide default values if required fields are still undefined for creation
            if (createData.quoteReferencePrefix === undefined) {
                createData.quoteReferencePrefix = 'QR';
            }
            if (createData.lastQuoteReferenceSeq === undefined) {
                createData.lastQuoteReferenceSeq = 0;
            }

            // Filter out undefined values from createData if needed by Prisma's create method
            const filteredCreateData = Object.fromEntries(
                Object.entries(createData).filter(([, value]) => value !== undefined)
            ) as Prisma.CompanySettingsCreateInput;


            if (Object.keys(filteredCreateData).length > 0) {
                 currentCompanySettings = await prisma.companySettings.create({ data: filteredCreateData });
                 console.log(`[Auth][updateProfile] CompanySettings created as none existed (ID: ${currentCompanySettings?.id}).`);
            }
        }
    }

    const profileResponse = {
        ...userResponse,
        companyName: currentCompanySettings?.companyName || null,
        companyAddress: currentCompanySettings?.companyAddress || null,
        companyPhone: currentCompanySettings?.companyPhone || null,
        companyEmail: currentCompanySettings?.companyEmail || null,
        companyWebsite: currentCompanySettings?.companyWebsite || null,
        companyVatNumber: currentCompanySettings?.companyVatNumber || null,
        companyLogo: currentCompanySettings?.companyLogo || null,
    };

    console.log(`[Auth][updateProfile] Profile update processed successfully for userId: ${userId}`);
    res.status(200).json(profileResponse);

  } catch (error) {
    console.error('[Auth][updateProfile] Error updating user profile:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') { // "Record to update not found"
            res.status(404).json({ message: "Record to update not found." });
            return;
        }
        console.error('[Auth][updateProfile] Prisma Error Code:', error.code, error.meta);
    }
    res.status(500).json({ message: 'Error updating user profile' });
  }
};