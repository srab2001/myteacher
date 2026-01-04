#!/bin/bash

# MyTeacher Setup Script
# Installs all dependencies and sets up the development environment

set -e

echo "========================================"
echo "  MyTeacher Setup Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found. Installing pnpm...${NC}"
    npm install -g pnpm
fi
echo -e "${GREEN}✓ pnpm $(pnpm -v) detected${NC}"

echo ""
echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
pnpm install

echo ""
echo -e "${YELLOW}Step 3: Setting up environment files...${NC}"

# Create packages/db/.env if it doesn't exist
if [ ! -f "packages/db/.env" ]; then
    echo -e "${YELLOW}Creating packages/db/.env...${NC}"
    cat > packages/db/.env << 'EOF'
# Database connection string
# Replace with your Neon database URL
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
EOF
    echo -e "${YELLOW}⚠ Please update packages/db/.env with your Neon database credentials${NC}"
else
    echo -e "${GREEN}✓ packages/db/.env already exists${NC}"
fi

# Create apps/api/.env if it doesn't exist
if [ ! -f "apps/api/.env" ]; then
    echo -e "${YELLOW}Creating apps/api/.env from example...${NC}"
    if [ -f "apps/api/.env.example" ]; then
        cp apps/api/.env.example apps/api/.env
        echo -e "${YELLOW}⚠ Please update apps/api/.env with your credentials${NC}"
    else
        cat > apps/api/.env << 'EOF'
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Session
SESSION_SECRET="your-session-secret-min-32-chars"

# CORS
CORS_ORIGIN="http://localhost:3000"

# Port
PORT=4000
EOF
        echo -e "${YELLOW}⚠ Please update apps/api/.env with your credentials${NC}"
    fi
else
    echo -e "${GREEN}✓ apps/api/.env already exists${NC}"
fi

# Create apps/web/.env if it doesn't exist
if [ ! -f "apps/web/.env" ]; then
    echo -e "${YELLOW}Creating apps/web/.env from example...${NC}"
    if [ -f "apps/web/.env.example" ]; then
        cp apps/web/.env.example apps/web/.env
        echo -e "${YELLOW}⚠ Please update apps/web/.env with your credentials${NC}"
    else
        cat > apps/web/.env << 'EOF'
# API URL for development
NEXT_PUBLIC_API_URL="http://localhost:4000"

# Google OAuth (for NextAuth if used)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-min-32-chars"
EOF
        echo -e "${YELLOW}⚠ Please update apps/web/.env with your credentials${NC}"
    fi
else
    echo -e "${GREEN}✓ apps/web/.env already exists${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4: Generating Prisma client...${NC}"
cd packages/db
npx prisma generate || true
cd ../..

echo ""
echo -e "${YELLOW}Step 5: Checking database connection...${NC}"
# Only run if DATABASE_URL is set properly
if grep -q "postgresql://USER:PASSWORD" packages/db/.env 2>/dev/null; then
    echo -e "${YELLOW}⚠ Skipping database check - please update DATABASE_URL first${NC}"
else
    cd packages/db
    npx prisma db push --accept-data-loss 2>/dev/null || echo -e "${YELLOW}⚠ Database sync skipped - check your DATABASE_URL${NC}"
    cd ../..
fi

echo ""
echo "========================================"
echo -e "${GREEN}  Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Update .env files with your credentials:"
echo "     - packages/db/.env (DATABASE_URL)"
echo "     - apps/api/.env (Google OAuth, Session Secret)"
echo "     - apps/web/.env (API URL, NextAuth)"
echo ""
echo "  2. Set up the database:"
echo "     cd packages/db && npx prisma db push"
echo ""
echo "  3. Start the development servers:"
echo "     pnpm dev"
echo ""
echo "  Or start individually:"
echo "     pnpm --filter api dev    # API on port 4000"
echo "     pnpm --filter web dev    # Web on port 3000"
echo ""
