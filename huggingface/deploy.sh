#!/bin/bash

# ===========================================
# BaatCheet - Hugging Face Deployment Script
# ===========================================
# Usage: ./deploy.sh YOUR_HF_USERNAME
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 BaatCheet Hugging Face Deployment Script${NC}"
echo "============================================"

# Check if username is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide your Hugging Face username${NC}"
    echo "Usage: ./deploy.sh YOUR_HF_USERNAME"
    exit 1
fi

HF_USERNAME=$1
SPACE_NAME="baatcheet-backend"
SPACE_URL="https://huggingface.co/spaces/${HF_USERNAME}/${SPACE_NAME}"

echo -e "${YELLOW}Deploying to: ${SPACE_URL}${NC}"

# Create temporary deployment directory
DEPLOY_DIR=$(mktemp -d)
echo -e "${GREEN}Created temp directory: ${DEPLOY_DIR}${NC}"

# Copy necessary files
echo -e "${YELLOW}Copying files...${NC}"
cp -r ../backend/src "${DEPLOY_DIR}/"
cp -r ../backend/prisma "${DEPLOY_DIR}/"
cp ../backend/package*.json "${DEPLOY_DIR}/"
cp ../backend/tsconfig.json "${DEPLOY_DIR}/"
cp ./Dockerfile "${DEPLOY_DIR}/"
cp ./README.md "${DEPLOY_DIR}/"

# Create .dockerignore
cat > "${DEPLOY_DIR}/.dockerignore" << 'EOF'
node_modules
.git
.env
.env.*
*.log
coverage
.nyc_output
EOF

# Initialize git and push
cd "${DEPLOY_DIR}"
git init
git add .
git commit -m "Deploy BaatCheet backend to Hugging Face"

# Add Hugging Face remote
git remote add hf "https://huggingface.co/spaces/${HF_USERNAME}/${SPACE_NAME}"

echo -e "${YELLOW}Pushing to Hugging Face...${NC}"
echo -e "${YELLOW}You may be prompted for your Hugging Face credentials${NC}"

git push -f hf main

# Cleanup
cd -
rm -rf "${DEPLOY_DIR}"

echo ""
echo -e "${GREEN}✅ Deployment initiated!${NC}"
echo ""
echo "Next steps:"
echo "1. Go to ${SPACE_URL}"
echo "2. Add your secrets in Settings → Repository secrets"
echo "3. Wait for the build to complete"
echo "4. Test: curl ${SPACE_URL/spaces/}/api/v1/health"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to add ALL your API keys as secrets!${NC}"
