# Bhavishya Road Carriers - Transport Management System

A comprehensive Transport & Accounts Management Web Application for Bhavishya Road Carriers.

## Features

### Core Modules
- **Loading Slip**: Auto-generate slip numbers, manage freight details, create memos and bills
- **Memo**: Supplier/Vehicle owner memos with commission calculations
- **Bills**: Party bills with TDS, penalties, and POD attachments
- **Banking**: Credit/Debit entries with automatic ledger updates
- **Ledgers**: Party, Supplier, and General ledgers with detailed tracking
- **POD**: Proof of Delivery image management
- **Dashboard**: Real-time analytics and profit tracking

### Key Features
- Auto-numbering system for all documents (editable)
- PDF generation for all documents with proper formatting
- Real-time data sync across multiple devices
- LAN and Cloud deployment support
- Advanced search functionality
- Professional ledger management

## Bank Details
- **Beneficiary Name**: BHAVISHYA ROAD CARRIERS
- **Account No**: 231005501207
- **IFSC Code**: ICIC0002310
- **Branch**: Ghodasar, Ahmedabad

## Setup Instructions

### For Cloud Deployment (Recommended)
1. Click "Connect to Supabase" button in the top right
2. Set up your Supabase project
3. The application will automatically sync data across all devices

### For LAN Mode
1. The application runs on `0.0.0.0:5173` by default
2. Access from any device on your network using `http://[your-ip]:5173`
3. Data will be stored locally and synced across devices on the same network

## Usage
1. Start by creating Loading Slips for each transport job
2. Generate Memos for suppliers (with 6% commission deduction)
3. Create Bills for parties
4. Use Banking module to record all financial transactions
5. Monitor all accounts through comprehensive Ledgers
6. Upload POD images and attach to bills
7. Track business performance through the Dashboard

## Technology Stack
- React + TypeScript
- Tailwind CSS for styling
- Supabase for database and real-time sync
- PDF generation with jsPDF
- Responsive design for all devices