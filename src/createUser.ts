import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUser() {
  const hashedPassword = await bcrypt.hash('Password123', 10);
  
  try {
    const user = await prisma.user.create({
      data: {
        email: 'test2@example.com',
        name: 'Test User 2',
        password: hashedPassword,
        role: 'USER'
      }
    });
    console.log('User created:', user);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
