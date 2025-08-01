# Podcast Manager - Technical Specification

## Summary
The purpose of this application is to download a set of podcast episodes, transcribe them using a local transcription engine (future feature), and manage the files.

## Tech Stack
- **Runtime**: Node.js (v18+ LTS)
- **Language**: TypeScript (v5+)
- **Frontend**: React (v18+)
- **Package Manager**: npm (v9+)
- **Database**: SQLite (via better-sqlite3)
- **Testing**: Jest + React Testing Library + Playwright
- **Linting/Formatting**: ESLint + Prettier
- **Build Tool**: Vite

## Development Environment
- **Local Deployment**: MacBook Air M2
- **Node Version Manager**: nvm (recommended)
- **IDE**: Claude Code on the command line
- **Browser Support**: Latest Safari

## Features

### Core Functionality
- Upload a CSV file containing podcast episode metadata (sample format is provided in the sample file new-episodes-2025-07-30T16-41-47-418Z.csv)
- Download podcast episodes as MP3 files to a local directory (save the location in settings)
- Automatically retry failed downloads
- Monitor and display download progress with percentage completion
- Maintain application state and settings in a local SQLite database
- Handle transcription workflow integration

### User Interface
- Responsive web interface built with React
- Episode list view with status indicators:
  - Downloading (% complete)
  - Downloaded (blue badge)
  - Transcribed (green badge)
- Error handling and user feedback

### File Management
- **Downloads Directory Structure**:
  ```
  /Users/brad/
    /blindspot-files       # Successful mp3 downloads
    /blindspot-files/done   # Successfully transcribed mp3 files
  ```
- Automatic file organization based on status
- File naming convention: `{podcast_id}_{episode_id}_{published_date}.mp3`

### Future Integration
- Placeholder for local transcription service
- WebSocket support for real-time updates
- API endpoint for transcription service callback

## Development Approach

### Project Setup
1. Initialize npm project with TypeScript
2. Set up Vite for development server and build
3. Configure ESLint and Prettier
4. Set up testing frameworks (Jest + Playwright)
5. Initialize Git repository with appropriate .gitignore

### Development Workflow
1. **Branching Strategy**:
   - `main`: Production-ready code
   - `develop`: Integration branch
   - Feature branches: `feature/description`
   - Hotfix branches: `hotfix/description`

2. **Commit Message Convention**:
   ```
   type(scope): short description
   
   [optional body]
   ```
   Types: feat, fix, docs, style, refactor, test, chore

3. **Testing Strategy**:
   - Unit tests for utility functions and components
   - Integration tests for API endpoints
   - E2E tests for critical user flows
   - Minimum 80% test coverage

### Code Quality
- TypeScript strict mode enabled
- ESLint with TypeScript and React plugins
- Prettier for code formatting
- Pre-commit hooks for linting and testing
- Code reviews required before merging to develop/main

### Documentation
- API documentation using JSDoc
- Component documentation using Storybook (future)
- README with setup and development instructions
- CHANGELOG.md for version history

## Development Checklist

### Phase 1: Project Foundation ✅
- [ ] Initialize npm project with TypeScript - **Commit & Push**: "feat: initialize TypeScript project with npm"
- [ ] Set up Vite for development server and build - **Commit & Push**: "feat: configure Vite build system"
- [ ] Configure ESLint and Prettier - **Commit & Push**: "feat: add ESLint and Prettier configuration"
- [ ] Set up testing frameworks (Jest + Playwright) - **Commit & Push**: "feat: configure Jest and Playwright testing"
- [ ] Initialize Git repository with appropriate .gitignore - **Commit & Push**: "chore: setup Git with .gitignore"
- [ ] Create basic project structure - **Commit & Push**: "feat: create basic project directory structure"

### Phase 2: Database & Core Models ✅
- [ ] Set up SQLite database with better-sqlite3 - **Commit & Push**: "feat: setup SQLite database with better-sqlite3"
- [ ] Create database schema for episodes, downloads, settings - **Commit & Push**: "feat: create database schema for core models"
- [ ] Implement data access layer (DAL) - **Commit & Push**: "feat: implement data access layer"
- [ ] Add database migration system - **Commit & Push**: "feat: add database migration system"
- [ ] Write unit tests for database operations - **Commit & Push**: "test: add unit tests for database operations"

### Phase 3: File Management System ✅
- [ ] Create file system utilities - **Commit & Push**: "feat: create file system utilities"
- [ ] Implement directory structure creation - **Commit & Push**: "feat: implement directory structure creation"
- [ ] Add file naming convention logic - **Commit & Push**: "feat: add file naming convention logic"
- [ ] Handle file move operations (download → done) - **Commit & Push**: "feat: handle file move operations"
- [ ] Add error handling for file operations - **Commit & Push**: "feat: add error handling for file operations"
- [ ] Write tests for file management - **Commit & Push**: "test: add tests for file management"

### Phase 4: CSV Upload & Parsing ✅
- [ ] Create CSV file upload component - **Commit & Push**: "feat: create CSV file upload component"
- [ ] Implement CSV parsing with validation - **Commit & Push**: "feat: implement CSV parsing with validation"
- [ ] Handle malformed CSV data gracefully - **Commit & Push**: "feat: handle malformed CSV data gracefully"
- [ ] Store parsed episode data in database - **Commit & Push**: "feat: store parsed episode data in database"
- [ ] Add progress feedback during upload - **Commit & Push**: "feat: add progress feedback during upload"
- [ ] Write integration tests for CSV workflow - **Commit & Push**: "test: add integration tests for CSV workflow"

### Phase 5: Download Engine ✅
- [ ] Implement HTTP download with progress tracking - **Commit & Push**: "feat: implement HTTP download with progress tracking"
- [ ] Handle URL redirects (301, 302, 307, 308) - **Commit & Push**: "feat: handle URL redirects in downloads"
- [ ] Add retry logic for failed downloads - **Commit & Push**: "feat: add retry logic for failed downloads"
- [ ] Handle concurrent downloads with queue management - **Commit & Push**: "feat: handle concurrent downloads with queue management"
- [ ] Implement pause/resume functionality - **Commit & Push**: "feat: implement pause/resume functionality"
- [ ] Add download status persistence - **Commit & Push**: "feat: add download status persistence"
- [ ] Monitor disk space before downloads - **Commit & Push**: "feat: monitor disk space before downloads"
- [ ] Write comprehensive download tests - **Commit & Push**: "test: add comprehensive download tests"

### Phase 6: React Frontend ✅
- [ ] Set up React application structure - **Commit & Push**: "feat: setup React application structure"
- [ ] Create episode list component with status indicators - **Commit & Push**: "feat: create episode list component with status indicators"
- [ ] Implement upload interface - **Commit & Push**: "feat: implement upload interface"
- [ ] Add download progress display - **Commit & Push**: "feat: add download progress display"
- [ ] Create settings management UI - **Commit & Push**: "feat: create settings management UI"
- [ ] Add error boundary and user feedback - **Commit & Push**: "feat: add error boundary and user feedback"
- [ ] Implement responsive design - **Commit & Push**: "feat: implement responsive design"
- [ ] Write component tests - **Commit & Push**: "test: write component tests"

### Phase 7: Integration & Polish ✅
- [ ] Connect frontend to backend services - **Commit & Push**: "feat: connect frontend to backend services"
- [ ] Add real-time progress updates - **Commit & Push**: "feat: add real-time progress updates"
- [ ] Implement comprehensive error handling - **Commit & Push**: "feat: implement comprehensive error handling"
- [ ] Add logging and monitoring - **Commit & Push**: "feat: add logging and monitoring"
- [ ] Performance optimization - **Commit & Push**: "perf: optimize application performance"
- [ ] Cross-browser testing - **Commit & Push**: "test: add cross-browser testing"

### Phase 8: Testing & Documentation ✅
- [ ] Achieve 80%+ test coverage - **Commit & Push**: "test: achieve 80%+ test coverage"
- [ ] Run E2E tests with Playwright - **Commit & Push**: "test: add E2E tests with Playwright"
- [ ] Complete API documentation - **Commit & Push**: "docs: complete API documentation"
- [ ] Update README with setup instructions - **Commit & Push**: "docs: update README with setup instructions"
- [ ] Create user guide documentation - **Commit & Push**: "docs: create user guide documentation"

### Phase 9: Deployment Preparation ✅
- [ ] Build optimization - **Commit & Push**: "perf: optimize build for production"
- [ ] Production environment configuration - **Commit & Push**: "feat: add production environment configuration"
- [ ] Security audit - **Commit & Push**: "security: complete security audit"
- [ ] Performance benchmarking - **Commit & Push**: "test: add performance benchmarking"
- [ ] Create deployment scripts - **Commit & Push**: "chore: create deployment scripts"

## Commit & Push Workflow

### Regular Development Commits
- **Frequency**: Commit after completing each logical unit of work
- **Size**: Small, focused commits (1-3 edits typically)
- **Push**: Push to GitHub after every 2-3 commits or at end of work session

### Required Commits
- After completing each phase checklist item
- Before and after major refactoring
- When fixing critical bugs
- Before switching branches or ending work session

### Commit Message Examples
```
feat(csv): add episode metadata parsing with validation
fix(download): handle network timeout errors gracefully  
refactor(database): extract query builders to separate module
test(download): add comprehensive retry logic tests
docs(readme): update setup instructions for M2 Macs
```
