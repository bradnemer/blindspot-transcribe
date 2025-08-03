# Podcast Episode Manager

A comprehensive desktop application for managing podcast episodes with automated downloading, transcription, and organization capabilities.

## Features

- **CSV Import**: Bulk import episodes from CSV files with flexible header mapping
- **Automated Downloads**: Queue-based downloading with retry logic and progress tracking
- **Real-time Progress**: Live updates of download progress and status
- **Episode Management**: Organize, filter, and search through your episode library
- **Error Handling**: Comprehensive error tracking and recovery mechanisms
- **Performance Monitoring**: Built-in performance analysis and optimization suggestions
- **Cross-browser Testing**: Playwright-based E2E testing across multiple browsers

## Prerequisites

- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher
- **Operating System**: macOS, Windows, or Linux

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bradnemer/blindspot-transcribe.git
   cd blindspot-transcribe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers** (for E2E testing)
   ```bash
   npx playwright install
   ```

## Development Setup

### Running the Application

1. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

2. **Build for production**
   ```bash
   npm run build
   ```

3. **Preview production build**
   ```bash
   npm run preview
   ```

### Database Setup

The application uses SQLite for local data storage. The database is automatically initialized on first run.

**Database location**: `./podcast-manager.db`

**Schema**: Automatically created and managed through migrations

### Testing

#### Unit Tests
```bash
# Run all unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

#### E2E Tests
```bash
# Run E2E tests (all browsers)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests for specific browser
npm run test:e2e -- --project=chromium
```

### Code Quality

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Architecture

### Core Services

- **Logger**: Centralized logging with multiple output targets
- **PerformanceMonitor**: Real-time performance tracking and analysis
- **ErrorHandler**: Global error capture and reporting
- **DownloadQueue**: Queue-based episode downloading with concurrency control
- **EpisodesDAL**: Database access layer with caching and performance monitoring

### Frontend Components

- **App**: Main application component with tabbed interface
- **EpisodeList**: Episode management and display with filtering/sorting
- **CSVUploadContainer**: CSV file import with validation and preview
- **DownloadManager**: Real-time download progress monitoring
- **ErrorBoundary**: React error boundary with detailed error reporting

### Database Layer

- **SQLite**: Local database with better-sqlite3 driver
- **Migrations**: Automatic schema management
- **DAL Pattern**: Data access layer with caching and monitoring

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Development settings
NODE_ENV=development
VITE_LOG_LEVEL=debug

# Database settings
DATABASE_PATH=./podcast-manager.db

# Download settings
MAX_CONCURRENT_DOWNLOADS=3
DOWNLOAD_TIMEOUT=300000
```

### Application Settings

Settings are stored in the database and can be configured through the Settings panel:

- **Download concurrency**: Maximum concurrent downloads
- **Cache settings**: Enable/disable caching and TTL configuration
- **Logging**: Log levels and output targets
- **Performance**: Monitoring thresholds and recommendations

## Usage

### Importing Episodes

1. **Prepare CSV file** with the following columns:
   - `title` or `episode_title` (required)
   - `published_date` or `date` (required)
   - `audio_url` or `url` (required)
   - `description` (optional)
   - `duration` (optional, in seconds)

2. **Upload via CSV Upload tab**
   - Click "Choose File" and select your CSV
   - Review the preview and column mapping
   - Click "Import Episodes" to add to database

### Managing Episodes

1. **View Episodes**: Episodes tab shows all imported episodes
2. **Filter/Sort**: Use dropdown controls to filter by status or sort by date/title
3. **Bulk Actions**: Select multiple episodes for batch downloads
4. **Status Tracking**: Real-time status updates (pending → downloading → downloaded → failed)

### Monitoring Downloads

1. **Downloads tab**: Shows active downloads with progress bars
2. **Queue management**: Pause, resume, or cancel downloads
3. **Error handling**: Automatic retry with exponential backoff
4. **Performance metrics**: Real-time speed and ETA calculations

## API Documentation

### Core Services API

Comprehensive JSDoc documentation is available for all services:

- **Logger API**: `src/services/logger.ts`
- **PerformanceMonitor API**: `src/services/performance.ts`
- **EpisodesDAL API**: `src/database/dal/episodes.ts`
- **ErrorHandler API**: `src/services/errorHandler.ts`

### Example Usage

```typescript
import { logger } from './services/logger';
import { performanceMonitor } from './services/performance';
import { EpisodesDAL } from './database/dal/episodes';

// Logging
logger.info('App', 'Application started');
logger.logDownloadStart(1, 'Episode Title', 'http://example.com/audio.mp3');

// Performance monitoring
const timingId = performanceMonitor.startTiming('database-query');
// ... perform operation
const duration = performanceMonitor.endTiming(timingId);

// Database operations
const dal = EpisodesDAL.getInstance();
const episodes = dal.getAll();
const pending = dal.getPendingDownloads();
```

## Testing Strategy

### Coverage Goals
- **Overall**: 80%+ statement coverage
- **Services**: 85%+ coverage for core business logic
- **Components**: 70%+ coverage for UI components
- **Database**: 90%+ coverage for data access layer

### Test Types
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Service interaction testing
- **E2E Tests**: Playwright cross-browser testing
- **Performance Tests**: Load and stress testing

## Troubleshooting

### Common Issues

1. **Database locked errors**
   ```bash
   # Stop the application and remove lock file
   rm ./podcast-manager.db-wal
   rm ./podcast-manager.db-shm
   ```

2. **Port already in use**
   ```bash
   # Kill process using port 5173
   lsof -ti:5173 | xargs kill -9
   ```

3. **NPM dependency issues**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Playwright browser issues**
   ```bash
   # Reinstall browsers
   npx playwright install --force
   ```

### Performance Issues

1. **Check performance recommendations**
   ```typescript
   import { performanceMonitor } from './services/performance';
   console.log(performanceMonitor.getRecommendations());
   ```

2. **Enable debug logging**
   ```typescript
   import { logger } from './services/logger';
   logger.configure({ logLevel: 'debug' });
   ```

3. **Monitor memory usage**
   ```typescript
   import { performanceMonitor } from './services/performance';
   console.log(performanceMonitor.getMemoryUsage());
   ```

## Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**: Follow existing code style and patterns
4. **Add tests**: Ensure 80%+ coverage for new code
5. **Run quality checks**: `npm run lint && npm test`
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open Pull Request**

### Code Style

- **TypeScript**: Strict mode with full type safety
- **ESLint**: Airbnb configuration with React rules
- **Prettier**: Automated code formatting
- **JSDoc**: Comprehensive API documentation

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

## Support

For support, please:

1. **Check the troubleshooting section** above
2. **Review existing issues** on GitHub
3. **Create a new issue** with detailed reproduction steps
4. **Include logs** from the browser console and application logs

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and breaking changes.