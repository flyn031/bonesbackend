// seed-smart-quote-customers.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSmartQuoteCustomers() {
  try {
    // Get or create admin user
    let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@bones.com',
          password: 'hashedpassword',
          name: 'Admin User',
          role: 'ADMIN'
        }
      });
    }

    // Get existing materials or create some
    let materials = await prisma.material.findMany();
    console.log(`Found ${materials.length} existing materials`);
    
    if (materials.length === 0) {
              materials = await Promise.all([
        prisma.material.create({
          data: {
            name: 'Standard 0.75kW 3-Phase Motor',
            code: 'SP003',
            description: 'Standard 0.75kW 3-phase motor, commonly used in conveyor systems.',
            unitPrice: 280.00,
            unit: 'each',
            currentStock: 25,
            category: 'MOTORS_DRIVES'
          }
        }),
        prisma.material.create({
          data: {
            name: 'Light Duty Flat Belt Conveyor',
            code: 'BC001',
            description: 'Light duty flat belt conveyor for general material handling.',
            unitPrice: 950.00,
            unit: 'each',
            currentStock: 8,
            category: 'BELT_CONVEYORS'
          }
        }),
        prisma.material.create({
          data: {
            name: 'Heavy Duty Roller Conveyor',
            code: 'RC002',
            description: 'Heavy duty roller conveyor for large item transport.',
            unitPrice: 1250.00,
            unit: 'each',
            currentStock: 5,
            category: 'ROLLER_CONVEYORS'
          }
        }),
        prisma.material.create({
          data: {
            name: 'Electrical Control Panel',
            code: 'EP001',
            description: 'Complete electrical control panel for conveyor systems.',
            unitPrice: 850.00,
            unit: 'each',
            currentStock: 12,
            category: 'ELECTRICAL'
          }
        }),
        prisma.material.create({
          data: {
            name: 'Safety Barrier System',
            code: 'SB001',
            description: 'Modular safety barrier system for industrial applications.',
            unitPrice: 320.00,
            unit: 'each',
            currentStock: 30,
            category: 'SAFETY'
          }
        }),
        prisma.material.create({
          data: {
            name: 'Rubber Conveyor Matting',
            code: 'RM001',
            description: 'Anti-slip rubber matting for conveyor surfaces.',
            unitPrice: 45.00,
            unit: 'm²',
            currentStock: 100,
            category: 'ACCESSORIES'
          }
        })
      ]);
    }

    // Create diverse customer profiles
    const customerProfiles = [
      {
        name: 'MegaWarehouse Solutions Ltd',
        email: 'procurement@megawarehouse.com',
        phone: '0203-555-0101',
        address: '45 Industrial Park, Manchester M1 2AB',
        type: 'high-volume',
        notes: 'Large warehouse operation, frequent bulk orders'
      },
      {
        name: 'Precision Manufacturing Co',
        email: 'orders@precision-mfg.co.uk',
        phone: '0121-555-0202',
        address: '12 Factory Lane, Birmingham B2 3CD',
        type: 'specialty-electrical',
        notes: 'Specializes in electrical components and control systems'
      },
      {
        name: 'GreenTech Logistics',
        email: 'supply@greentech-logistics.com',
        phone: '0113-555-0303',
        address: '78 Eco Park Road, Leeds LS1 4EF',
        type: 'eco-focused',
        notes: 'Environmentally conscious, prefers energy-efficient solutions'
      },
      {
        name: 'StartUp Fulfillment Hub',
        email: 'hello@startupfulfillment.co.uk',
        phone: '0207-555-0404',
        address: '23 Tech Street, London E1 6GH',
        type: 'new-growing',
        notes: 'New customer, rapidly expanding operations'
      },
      {
        name: 'Seasonal Storage Systems',
        email: 'contact@seasonalstorage.com',
        phone: '01904-555-0505',
        address: '156 Commerce Way, York YO1 7IJ',
        type: 'seasonal',
        notes: 'Peak demand during holiday seasons'
      },
      {
        name: 'AutoParts Distribution Centre',
        email: 'logistics@autoparts-dc.com',
        phone: '0191-555-0606',
        address: '89 Transport Hub, Newcastle NE1 8KL',
        type: 'automotive',
        notes: 'Automotive parts distribution, heavy-duty requirements'
      }
    ];

    console.log('Creating customers with purchase histories...');

    for (const profile of customerProfiles) {
      // Check if customer already exists
      let customer = await prisma.customer.findUnique({
        where: { email: profile.email }
      });

      if (customer) {
        console.log(`Customer already exists: ${customer.name}`);
      } else {
        // Create customer
        customer = await prisma.customer.create({
          data: {
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            address: profile.address
          }
        });
        console.log(`Created customer: ${customer.name}`);
      }

      // Create purchase history based on customer type
      await createPurchaseHistory(customer, materials, adminUser, profile.type);
    }

    console.log('✅ Successfully seeded Smart Quote customers with purchase histories!');
    console.log('📊 Created:', customerProfiles.length, 'customers with realistic purchase patterns');

  } catch (error) {
    console.error('❌ Error seeding customers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createPurchaseHistory(customer, materials, adminUser, customerType) {
  const quoteNumber = `QR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  console.log(`  Available materials: ${materials.map(m => m.code).join(', ')}`);
  
  // Use available materials flexibly
  let items = [];
  
  // Get first few materials as fallback
  const availableMaterials = materials.slice(0, 6);
  
  if (availableMaterials.length === 0) {
    console.log(`  ⚠️ No materials available, skipping purchase history for ${customer.name}`);
    return;
  }
  
  switch (customerType) {
    case 'high-volume':
      // Use first 3 available materials
      items = [
        { material: availableMaterials[0], quantity: 5 },
        { material: availableMaterials[1], quantity: 3 },
        { material: availableMaterials[2] || availableMaterials[0], quantity: 20 }
      ];
      break;
      
    case 'specialty-electrical':
      items = [
        { material: availableMaterials[0], quantity: 2 },
        { material: availableMaterials[1] || availableMaterials[0], quantity: 3 }
      ];
      break;
      
    case 'eco-focused':
      items = [
        { material: availableMaterials[0], quantity: 2 },
        { material: availableMaterials[1] || availableMaterials[0], quantity: 6 }
      ];
      break;
      
    case 'new-growing':
      items = [
        { material: availableMaterials[0], quantity: 1 },
        { material: availableMaterials[1] || availableMaterials[0], quantity: 5 }
      ];
      break;
      
    case 'seasonal':
      items = [
        { material: availableMaterials[0], quantity: 2 },
        { material: availableMaterials[1] || availableMaterials[0], quantity: 4 },
        { material: availableMaterials[2] || availableMaterials[0], quantity: 15 }
      ];
      break;
      
    case 'automotive':
      items = [
        { material: availableMaterials[0], quantity: 3 },
        { material: availableMaterials[1] || availableMaterials[0], quantity: 1 },
        { material: availableMaterials[2] || availableMaterials[0], quantity: 8 }
      ];
      break;
  }

  // Filter out any undefined materials and calculate total
  items = items.filter(item => item.material && item.material.unitPrice !== undefined);
  
  if (items.length === 0) {
    console.log(`  ⚠️ No valid materials for ${customer.name}, skipping`);
    return;
  }

  const totalAmount = items.reduce((sum, item) => 
    sum + (item.material.unitPrice * item.quantity), 0
  );

  // Create quote with purchase history
  const quote = await prisma.quote.create({
    data: {
      customerId: customer.id,
      title: `${customer.name} - System Installation`,
      description: `Equipment quote for ${customerType} customer`,
      notes: `Customer preference: ${customerType} solutions. Previous successful delivery.`,
      totalAmount: totalAmount,
      status: 'APPROVED', // Mark as approved to simulate purchase history
      createdById: adminUser.id,
      quoteNumber: quoteNumber,
      quoteReference: quoteNumber.replace('QR-', 'REF-'),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      contactEmail: customer.email,
      contactPerson: 'Purchasing Manager'
    }
  });

  // Add line items
  for (const item of items) {
    await prisma.quoteLineItem.create({
      data: {
        quoteId: quote.id,
        description: item.material.name,
        quantity: item.quantity,
        unitPrice: item.material.unitPrice,
        materialId: item.material.id
      }
    });
  }

  console.log(`  📝 Created quote ${quote.quoteNumber} with ${items.length} items (£${totalAmount.toFixed(2)})`);
}

// Run the seed function
seedSmartQuoteCustomers();