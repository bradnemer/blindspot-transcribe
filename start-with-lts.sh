#!/bin/bash
echo "🚀 Starting with Node.js LTS..."

# Source nvm and use LTS
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
nvm use --lts

echo "📦 Using Node.js $(node --version) and npm $(npm --version)"

# Install dependencies if node_modules is missing or corrupted
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

echo "🚀 Starting development servers..."
npm run dev