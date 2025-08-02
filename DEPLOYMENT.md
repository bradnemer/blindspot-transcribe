# Deployment Guide

## Overview
This guide covers deployment options for the Podcast Manager application.

## Prerequisites
- Node.js 20+ LTS
- npm 9+
- SQLite 3
- 2GB+ available RAM
- 10GB+ available disk space

## Deployment Options

### 1. Native Deployment (Recommended for Development)

#### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd blindspot-transcribe
npm install

# Deploy with automated script
npm run deploy
```

#### Manual Deployment Steps
```bash
# 1. Install dependencies
npm ci --production=false

# 2. Run tests and validation
npm run validate

# 3. Build application
npm run build

# 4. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 5. Create directories
mkdir -p logs benchmark-results
mkdir -p /Users/brad/blindspot-files/done

# 6. Start application
npm run start:prod
```

### 2. Docker Deployment (Recommended for Production)

#### Development
```bash
# Start development environment
npm run deploy:docker:dev

# Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

#### Production
```bash
# Build and start production container
npm run deploy:docker

# Access application
# Application: http://localhost:3000
```

#### Docker Management
```bash
# View logs
docker-compose logs -f podcast-manager

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Clean up
docker-compose down -v  # Removes volumes too
```

## Environment Configuration

### Required Environment Variables
```bash
NODE_ENV=production
PORT=3000
DATABASE_PATH=./podcast-manager.db
DOWNLOAD_DIRECTORY=/Users/brad/blindspot-files
```

### Optional Environment Variables
```bash
# Security
SESSION_SECRET=your-secret-key-here

# Performance
MAX_CONCURRENT_DOWNLOADS=3
RETRY_ATTEMPTS=3
RETRY_DELAY_SECONDS=30

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## Directory Structure

### Production Layout
```
podcast-manager/
├── dist/                    # Built frontend files
├── dist-server/            # Built server files
├── logs/                   # Application logs
├── benchmark-results/      # Performance benchmarks
├── podcast-manager.db      # SQLite database
├── .env                    # Environment configuration
└── server.js              # Production server entry
```

### Data Directories
```
/Users/brad/blindspot-files/     # Downloaded episodes
/Users/brad/blindspot-files/done/ # Transcribed episodes
```

## Monitoring and Maintenance

### Health Checks
- Application: `GET /api/health`
- Response: `{"status": "ok", "timestamp": "...", "version": "1.0.0"}`

### Log Files
- Application logs: `logs/app.log`
- Deployment logs: `deployment.log`
- Performance results: `benchmark-results/`

### Performance Monitoring
```bash
# Run benchmarks
npm run benchmark

# Check system resources
htop  # or top
df -h  # disk usage
```

### Database Maintenance
```bash
# Backup database
cp podcast-manager.db podcast-manager.db.backup

# Check database integrity
sqlite3 podcast-manager.db "PRAGMA integrity_check;"

# Optimize database
sqlite3 podcast-manager.db "VACUUM;"
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Permission Errors
```bash
# Fix file permissions
chmod +x scripts/deploy.sh
chmod 755 logs/
chmod 755 benchmark-results/
```

#### Node.js Version Issues
```bash
# Check version
node --version

# Install correct version with nvm
nvm install 20
nvm use 20
```

#### Database Lock Errors
```bash
# Check for running processes
ps aux | grep node

# Remove lock files (if safe)
rm -f podcast-manager.db-wal
rm -f podcast-manager.db-shm
```

### Performance Issues

#### High Memory Usage
- Check for memory leaks in logs
- Restart application: `npm run deploy restart`
- Monitor with: `htop` or `ps aux`

#### Slow Database Operations
- Run database vacuum: `sqlite3 podcast-manager.db "VACUUM;"`
- Check disk space: `df -h`
- Review query performance in logs

#### Download Failures
- Check network connectivity
- Verify download directory permissions
- Review retry configuration in `.env`

## Security Considerations

### Production Checklist
- [ ] Change default SESSION_SECRET
- [ ] Use HTTPS in production
- [ ] Regular security updates: `npm audit`
- [ ] File system permissions properly set
- [ ] Firewall configured (if needed)
- [ ] Regular database backups

### Updates and Patches
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Security audit
npm audit
npm audit fix
```

## Backup and Recovery

### Database Backup
```bash
# Manual backup
cp podcast-manager.db "backup-$(date +%Y%m%d).db"

# Automated backup (add to cron)
0 2 * * * cp /path/to/podcast-manager.db "/backups/podcast-$(date +\%Y\%m\%d).db"
```

### Full Application Backup
```bash
# Backup application data
tar -czf podcast-manager-backup-$(date +%Y%m%d).tar.gz \
  podcast-manager.db \
  logs/ \
  .env \
  /Users/brad/blindspot-files/
```

### Recovery
```bash
# Restore database
cp backup-YYYYMMDD.db podcast-manager.db

# Restart application
npm run deploy restart
```

## Support

### Getting Help
- Check logs: `tail -f logs/app.log`
- Run diagnostics: `npm run validate`
- Performance check: `npm run benchmark`

### Reporting Issues
Include the following information:
- Node.js version: `node --version`
- npm version: `npm --version`
- Application logs
- System information: `uname -a`
- Error reproduction steps