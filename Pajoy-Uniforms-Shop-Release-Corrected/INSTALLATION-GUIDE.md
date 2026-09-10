# Pajoy Uniforms POS - Shop Installation Guide

## What's in this folder

- `Pajoy-Uniforms-POS-0.0.0-win-x64.exe` - Desktop application installer for the cashier interface
- `api-server/` - Backend API server with database migrations

## Prerequisites

1. **Node.js 18+** - Required to run the API server
2. **PostgreSQL 14+** - Database server for storing all data
3. **Windows 10/11** - For the desktop application
4. **npm** - Package manager (comes with Node.js)

## Installation Steps

### Step 1: Install PostgreSQL

1. Download and install PostgreSQL from https://www.postgresql.org/download/windows/
2. During installation, set a password for the `postgres` user (remember this password)
3. Open pgAdmin or use the command line to create a database:
   ```sql
   CREATE DATABASE pajoy_pos;
   ```

### Step 2: Configure the API Server

1. Navigate to the `api-server` folder
2. Copy `.env.example` to `.env`:
   ```powershell
   copy .env.example .env
   ```
3. Edit `.env` with your settings:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pajoy_pos
   PORT=3001
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   BOOTSTRAP_ADMIN_USERNAME=admin
   BOOTSTRAP_ADMIN_PASSWORD=PajoyShop2026!
   JWT_SECRET=pajoy-pos-secret-key-2026
   ```
   
   **Important:** Change `BOOTSTRAP_ADMIN_PASSWORD` to a secure password. The example above is for testing only.

### Step 3: Install Dependencies

1. Open PowerShell in the `api-server` folder
2. Install dependencies:
   ```powershell
   npm install
   ```

### Step 4: Initialize the Database

1. In the `api-server` folder, run:
   ```powershell
   npm run production:init
   ```
2. This will:
   - Run database migrations
   - Create Shop 1 and Shop 2 if they don't exist
   - Create the admin user if none exists
   - Preserve existing data if the database already has an admin

### Step 5: Start the API Server

1. In the `api-server` folder, run:
   ```powershell
   npm start
   ```
2. The API will start on `http://localhost:3001`
3. Keep this window open - the POS app needs this running

**Note:** The API server automatically loads environment variables from the `.env` file.

**Optional: Run as a Windows Service**
To run the API server in the background, use a service manager like `pm2`:
```powershell
npm install -g pm2
cd api-server
pm2 start "npm start" --name pajoy-api
pm2 save
pm2 startup
```

### Step 6: Install the Desktop Application

1. Double-click `Pajoy-Uniforms-POS-0.0.0-win-x64.exe`
2. Follow the installation wizard
3. Launch "Pajoy Uniforms POS" from the desktop or Start menu

### Step 7: Configure and Login

1. On first launch, the app will ask for the API URL
2. Enter: `http://localhost:3001`
3. Login with the admin credentials you set in `.env`:
   - Username: `admin` (or what you set in `BOOTSTRAP_ADMIN_USERNAME`)
   - Password: The password from `BOOTSTRAP_ADMIN_PASSWORD`

### Step 8: Create Staff Accounts

1. After logging in as admin, go to Settings → Staff
2. Create cashier accounts for your shop staff
3. Assign appropriate permissions (admin, cashier, etc.)

## Adding Your Business Data

The system starts empty. You need to add:

1. **Products** - Go to Products → Add Product
2. **Customers** - Go to Customers → Add Customer
3. **Inventory** - Go to Inventory → Add Stock
4. **Branches** - Go to Settings → Branches (if you have multiple locations)

## Troubleshooting

### API won't start
- Check PostgreSQL is running
- Verify `DATABASE_URL` in `.env` is correct
- Ensure port 3001 is not in use
- Verify all dependencies installed with `npm install`

### Desktop app can't connect
- Verify API server is running on port 3001
- Check firewall settings
- Try accessing `http://localhost:3001/api/health` in a browser

### Database errors
- Ensure PostgreSQL service is running
- Check database name matches `DATABASE_URL`
- Verify user has proper permissions

### npm install fails
- Ensure Node.js 18+ is installed
- Try running `npm cache clean --force` then `npm install` again
- Check internet connection

## Security Notes

- **Never** commit `.env` files to version control
- Change default passwords immediately
- Use strong, unique passwords for admin accounts
- Keep the API server behind a firewall in production
- Regularly update dependencies with `npm update`

## File Structure After Installation

```
Shop Computer
├── Pajoy Uniforms POS (installed app)
└── api-server/
    ├── node_modules/
    ├── dist/
    ├── migrations/
    ├── production-init.mjs
    ├── .env (configured)
    └── database (PostgreSQL)
```

## Database Safety

The `production:init` script is designed to be safe to run on existing databases:
- Migrations only apply new changes
- Existing admin users are preserved
- Existing shops and branches are preserved
- Business data (products, orders, customers) is never deleted
