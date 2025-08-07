#!/bin/bash
echo "🚀 Starting with Node.js LTS..."

# Source nvm and use LTS
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Use LTS and execute all subsequent commands in this context
nvm exec --lts bash -c '
echo "📦 Using Node.js $(node --version) and npm $(npm --version)"

# Check if we need to rebuild native modules for this Node.js version
NODE_VERSION_FILE=".node-version-used"
CURRENT_NODE_VERSION=$(node --version)

if [ ! -f "$NODE_VERSION_FILE" ] || [ "$(cat $NODE_VERSION_FILE 2>/dev/null)" != "$CURRENT_NODE_VERSION" ]; then
    echo "🔧 Node.js version changed or first run - rebuilding native modules..."
    npm rebuild
    echo "$CURRENT_NODE_VERSION" > "$NODE_VERSION_FILE"
fi

# Install dependencies if node_modules is missing or corrupted
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

echo "🚀 Starting development servers..."
npm run dev
'