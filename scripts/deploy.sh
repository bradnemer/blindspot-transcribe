#!/bin/bash

# Podcast Manager - Deployment Script
# This script automates the deployment process for the podcast manager application

set -e  # Exit on any error

# Configuration
APP_NAME="podcast-manager"
NODE_ENV="production"
LOG_FILE="deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    local node_version=$(node --version)
    log "Node.js version: $node_version"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    local npm_version=$(npm --version)
    log "npm version: $npm_version"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        error "package.json not found. Run this script from the project root."
    fi
    
    success "Prerequisites check passed"
}

# Function to install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    npm ci --production=false
    
    success "Dependencies installed"
}

# Function to run tests
run_tests() {
    log "Running tests..."
    
    # Run linting
    log "Running ESLint..."
    npm run lint
    
    # Run unit tests
    log "Running unit tests..."
    npm run test
    
    # Run type checking
    log "Running TypeScript type checking..."
    npm run build:check
    
    success "All tests passed"
}

# Function to build application
build_application() {
    log "Building application..."
    
    # Clean previous builds
    npm run build:clean
    
    # Build client and server
    npm run build
    
    success "Application built successfully"
}

# Function to create production directories
create_directories() {
    log "Creating production directories..."
    
    # Create logs directory
    mkdir -p logs
    
    # Create benchmark results directory
    mkdir -p benchmark-results
    
    # Create downloads directory (if specified in env)
    if [ -n "$DOWNLOAD_DIRECTORY" ]; then
        mkdir -p "$DOWNLOAD_DIRECTORY"
        mkdir -p "$DOWNLOAD_DIRECTORY/done"
    else
        mkdir -p "/Users/brad/blindspot-files"
        mkdir -p "/Users/brad/blindspot-files/done"
    fi
    
    success "Production directories created"
}

# Function to setup environment
setup_environment() {
    log "Setting up production environment..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.production" ]; then
            cp .env.production .env
            log "Copied .env.production to .env"
        else
            warning "No .env file found. Please create one based on .env.example"
        fi
    fi
    
    # Set NODE_ENV
    export NODE_ENV=production
    
    success "Environment setup complete"
}

# Function to run security audit
security_audit() {
    log "Running security audit..."
    
    npm audit --audit-level high
    
    success "Security audit passed"
}

# Function to run performance benchmarks
performance_benchmark() {
    log "Running performance benchmarks..."
    
    npm run benchmark
    
    success "Performance benchmarks completed"
}

# Function to start application
start_application() {
    log "Starting application..."
    
    # Check if application is already running
    if pgrep -f "node.*server.js" > /dev/null; then
        warning "Application appears to be already running"
        read -p "Do you want to restart it? (y/N): " restart
        if [[ $restart =~ ^[Yy]$ ]]; then
            pkill -f "node.*server.js" || true
            sleep 2
        else
            log "Deployment complete. Application already running."
            exit 0
        fi
    fi
    
    # Start the application
    nohup npm run start > logs/app.log 2>&1 &
    APP_PID=$!
    
    # Wait a moment and check if it's still running
    sleep 3
    if kill -0 $APP_PID 2>/dev/null; then
        success "Application started successfully (PID: $APP_PID)"
        log "Application logs: tail -f logs/app.log"
        log "Application URL: http://localhost:3000"
    else
        error "Application failed to start. Check logs/app.log for details."
    fi
}

# Function to create systemd service (optional)
create_systemd_service() {
    if command -v systemctl &> /dev/null; then
        read -p "Create systemd service for auto-start? (y/N): " create_service
        if [[ $create_service =~ ^[Yy]$ ]]; then
            log "Creating systemd service..."
            
            cat > /tmp/podcast-manager.service << EOF
[Unit]
Description=Podcast Manager Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
ExecStart=$(which npm) run start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
            
            sudo mv /tmp/podcast-manager.service /etc/systemd/system/
            sudo systemctl daemon-reload
            sudo systemctl enable podcast-manager
            
            success "Systemd service created and enabled"
            log "Use 'sudo systemctl start podcast-manager' to start the service"
        fi
    fi
}

# Main deployment function
deploy() {
    log "Starting deployment of $APP_NAME..."
    log "Deployment started at $(date)"
    
    check_prerequisites
    install_dependencies
    run_tests
    security_audit
    build_application
    create_directories
    setup_environment
    performance_benchmark
    start_application
    create_systemd_service
    
    success "Deployment completed successfully!"
    log "Deployment completed at $(date)"
    
    echo ""
    echo "🚀 Podcast Manager is now running!"
    echo "📊 Application URL: http://localhost:3000"
    echo "📝 Logs: tail -f logs/app.log"
    echo "🔧 Stop: pkill -f 'node.*server.js'"
    echo ""
}

# Handle command line options
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "start")
        start_application
        ;;
    "stop")
        log "Stopping application..."
        pkill -f "node.*server.js" || true
        success "Application stopped"
        ;;
    "restart")
        log "Restarting application..."
        pkill -f "node.*server.js" || true
        sleep 2
        start_application
        ;;
    "test")
        run_tests
        ;;
    "benchmark")
        performance_benchmark
        ;;
    "build")
        build_application
        ;;
    *)
        echo "Usage: $0 [deploy|start|stop|restart|test|benchmark|build]"
        echo ""
        echo "Commands:"
        echo "  deploy    - Full deployment (default)"
        echo "  start     - Start the application"
        echo "  stop      - Stop the application"
        echo "  restart   - Restart the application"
        echo "  test      - Run tests only"
        echo "  benchmark - Run performance benchmarks"
        echo "  build     - Build application only"
        exit 1
        ;;
esac