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
- **IDE**: Windsurf, based on VS Code with ESLint and Prettier extensions
- **Browser Support**: Latest Chrome/Safari

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