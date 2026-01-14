#!/bin/bash

# ============================================
# 🗄️ Neon Database Setup Script
# Sets up PostgreSQL database for BaatCheet
# ============================================

echo "=================================================="
echo "🗄️ Neon Database Setup for BaatCheet"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}This script will help you set up a FREE PostgreSQL database on Neon.${NC}"
echo ""
echo "Follow these steps:"
echo ""
echo -e "${YELLOW}Step 1: Create Neon Account${NC}"
echo "  1. Open: https://neon.tech"
echo "  2. Click 'Sign Up' (use GitHub for fastest signup)"
echo "  3. Create a new project:"
echo "     - Project name: baatcheet"
echo "     - Region: Choose closest to you"
echo "     - PostgreSQL version: 16 (latest)"
echo ""
echo -e "${YELLOW}Step 2: Get Connection String${NC}"
echo "  1. After creating the project, you'll see 'Connection Details'"
echo "  2. Make sure 'Connection string' is selected"
echo "  3. Click the copy button next to the connection string"
echo "  4. It looks like:"
echo -e "     ${GREEN}postgresql://username:password@ep-xxx.region.aws.neon.tech/baatcheet?sslmode=require${NC}"
echo ""

read -p "Have you copied your Neon connection string? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please complete Steps 1-2 above first, then run this script again."
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Enter your Neon connection string${NC}"
read -p "Paste your Neon DATABASE_URL: " DATABASE_URL

if [[ -z "$DATABASE_URL" ]]; then
    echo "No URL provided. Exiting."
    exit 1
fi

# Validate URL format
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    echo "Invalid URL format. It should start with 'postgresql://'"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Initializing database schema...${NC}"
echo "Running Prisma migrations..."

cd /Users/muhammadsharjeel/Documents/BaatCheet/backend

# Export for Prisma
export DATABASE_URL="$DATABASE_URL"

# Push schema to database
npx prisma db push --skip-generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database schema created successfully!${NC}"
else
    echo "❌ Failed to create schema. Please check your connection string."
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 5: Setting DATABASE_URL in HuggingFace...${NC}"

# Set the secret in HuggingFace
python3 << PYTHON_SCRIPT
from huggingface_hub import HfApi
import sys

SPACE_NAME = "sharry121/BaatChhet"
DATABASE_URL = """$DATABASE_URL"""

try:
    api = HfApi()
    api.add_space_secret(SPACE_NAME, "DATABASE_URL", DATABASE_URL)
    print("✅ DATABASE_URL set in HuggingFace Spaces")
except Exception as e:
    print(f"⚠️ Could not set in HuggingFace: {e}")
    print("You may need to set it manually in Space settings")
PYTHON_SCRIPT

echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Database Setup Complete!${NC}"
echo "=================================================="
echo ""
echo "Your database is ready. The HuggingFace Space should now work."
echo ""
echo "If the Space is still building, wait a few minutes and check:"
echo "  https://huggingface.co/spaces/sharry121/BaatChhet"
echo ""
echo "Test your API:"
echo "  curl https://sharry121-baatchhet.hf.space/health"
echo ""
