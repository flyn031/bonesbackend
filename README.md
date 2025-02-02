# Supply Chain Management System

## Overview

This Supply Chain Management System is a robust TypeScript-based application designed to streamline business operations, including order management, customer tracking, supplier relationship management, and financial reporting.

## 🚀 Features

### User Management
- Authentication and authorization
- Role-based access control (USER, ADMIN)

### Customer Management
- Customer profile tracking
- Order history
- Contact information management

### Supplier Management
- Supplier registration and tracking
- Material and inventory management
- Supplier performance rating

### Order Management
- Multiple order types
- Order status tracking
- Job-linked and customer-linked orders

### Financial Reporting
- Order cost tracking
- Import and export functionality
- Comprehensive financial logs

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT
- **PDF Generation**: PDFKit

## 📋 Prerequisites

- Node.js (v16+)
- PostgreSQL
- npm or yarn

## 🔧 Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/supply-chain-management.git
cd supply-chain-management
src/
├── controllers/       # Business logic
├── middleware/        # Express middleware
├── routes/            # API route definitions
├── services/          # Additional services
└── server.ts          # Main application entry point

prisma/
└── schema.prisma      # Database schema definition

🔐 Authentication
The system uses JWT for authentication with two primary roles:

USER: Standard access
ADMIN: Full system access

📊 Reporting
Supports comprehensive financial and operational reporting with:

Import logs
Order tracking
Supplier performance metrics

🤝 Contributing

Fork the repository
Create your feature branch (git checkout -b feature/AmazingFeature)
Commit your changes (git commit -m 'Add some AmazingFeature')
Push to the branch (git push origin feature/AmazingFeature)
Open a Pull Request

📜 License
Distributed under the MIT License. See LICENSE for more information.
