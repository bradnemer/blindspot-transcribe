# Blindspot Transcribe

A podcast episode management application with CSV upload functionality and transcription capabilities.

## 🚀 Quick Start

### Starting the Application

**Recommended Method (Uses Node.js LTS):**
```bash
./start-with-lts.sh
```
This script automatically:
- Switches to Node.js v22.18.0 LTS for optimal compatibility
- Starts both API server and frontend concurrently
- Opens the application in your browser

**Alternative Methods:**
```bash
# Start both servers together
npm run dev

# Start servers separately (use two terminals)
npm run dev:api      # Terminal 1 - API Server
npm run dev:frontend # Terminal 2 - Frontend
```

### Stopping the Application

- **Quick Stop**: Press `Ctrl+C` in the terminal running the app
- **Manual Stop**: `pkill -f tsx && pkill -f vite`

### Application URLs

Once started, access the application at:
- **Frontend**: http://localhost:5173
- **API Server**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

## 📋 Features

- **CSV Upload**: Import podcast episode data from CSV files
- **Episode Management**: View, track, and manage podcast episodes
- **Download Management**: Queue and monitor episode downloads with retry logic
- **Progress Tracking**: Real-time download and processing progress
- **AI Transcription**: Full WhisperX integration with speaker diarization and high-accuracy transcription
- **Toast Notifications**: User-friendly feedback system
- **Error Handling**: Comprehensive error tracking and recovery

## 🛠 Prerequisites

- **Node.js**: v22.18.0 LTS (automatically handled by start script)
- **npm**: v10.9.3 or higher
- **Git**: For version control

## 📁 Project Structure

```
blindspot-transcribe/
├── src/
│   ├── App.tsx                 # Main application component
│   ├── api/                    # API client layer
│   │   ├── client.ts           # HTTP client configuration
│   │   ├── episodes.ts         # Episode API endpoints
│   │   ├── downloads.ts        # Download API endpoints
│   │   └── transcription.ts    # Transcription API endpoints
│   ├── components/             # React components
│   │   ├── EpisodeList.tsx     # Episode display and management
│   │   ├── OverallProgressBar.tsx # Progress tracking
│   │   └── Toast.tsx           # Notification system
│   ├── hooks/                  # Custom React hooks
│   │   └── useToast.ts         # Toast notification hook
│   └── styles/                 # CSS styling
├── simple-api-server.ts        # Main API server with all endpoints
├── start-with-lts.sh          # Node.js LTS startup script
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## 🔧 Development

### Installation

```bash
# Clone the repository
git clone https://github.com/bradnemer/blindspot-transcribe.git
cd blindspot-transcribe

# Install dependencies
npm install

# Start development servers
./start-with-lts.sh
```

### Available Scripts

- `npm run dev` - Start both API and frontend servers
- `npm run dev:api` - Start only the API server
- `npm run dev:frontend` - Start only the frontend server
- `npm run build` - Build the application for production
- `npm run preview` - Preview production build
- `npm run lint` - Run code linting
- `npm run lint:fix` - Fix linting issues automatically
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run end-to-end tests

### CSV Upload Format

The application expects CSV files with the following columns:
- **Episode ID**: Unique identifier for the episode
- **Podcast ID**: Identifier for the podcast
- **Podcast Name**: Name of the podcast
- **Episode Title**: Title of the episode
- **Published Date**: Publication date (YYYY-MM-DD format)
- **Audio URL**: Direct link to the audio file

**Example CSV:**
```csv
Episode ID,Podcast ID,Podcast Name,Episode Title,Published Date,Audio URL
1,101,Tech Talk,Introduction to AI,2024-01-15,https://example.com/episode1.mp3
2,101,Tech Talk,Machine Learning Basics,2024-01-22,https://example.com/episode2.mp3
```

## 🎯 API Endpoints

### Health & Status
- `GET /api/health` - Health check endpoint
- `GET /api/downloads/status` - Download queue status

### Episode Management
- `GET /api/episodes` - Get all episodes
- `GET /api/episodes/:id` - Get specific episode
- `PUT /api/episodes/:id` - Update episode
- `DELETE /api/episodes/:id` - Delete specific episode
- `DELETE /api/episodes` - Clear all episodes

### CSV Upload
- `POST /api/upload-csv` - Upload and process CSV file

### Download Management
- `POST /api/downloads/start` - Start specific downloads
- `POST /api/downloads/start-all` - Start all pending downloads
- `POST /api/downloads/stop` - Stop specific downloads
- `POST /api/downloads/sync` - Sync downloaded files with database

### Retry Management
- `GET /api/downloads/retry-stats` - Get retry statistics
- `POST /api/downloads/retry/:id` - Manually retry episode download
- `POST /api/downloads/cancel-retries` - Cancel all scheduled retries

### Transcription Management
- `GET /api/transcription/status` - Get transcription service status and queue information
- `POST /api/transcription/queue` - Queue a file for transcription
- `POST /api/transcription/pause` - Pause transcription processing
- `POST /api/transcription/resume` - Resume transcription processing
- `POST /api/transcription/stop` - Stop all transcription processing and clear queue
- `GET /api/transcription/progress` - Get current transcription progress
- `GET /api/transcription/download/:id` - Download completed transcription file
- `POST /api/transcription/config` - Update transcription configuration

### Settings
- `GET /api/settings` - Get application settings
- `PUT /api/settings` - Update application settings

## 🔒 Configuration

### Default Settings
- **API Port**: 3001
- **Frontend Port**: 5173 (auto-assigned by Vite)
- **Download Directory**: `/Users/brad/blindspot-files`
- **Database**: SQLite (`podcast-manager.db`)
- **Max Concurrent Downloads**: 3
- **Retry Attempts**: 3 with exponential backoff

### Environment Variables

Create a `.env.local` file for custom configuration:
```env
# API Configuration
API_PORT=3001

# Download Configuration
MAX_CONCURRENT_DOWNLOADS=3
DOWNLOAD_DIRECTORY=/path/to/downloads

# Development
NODE_ENV=development
```

## 🐛 Troubleshooting

### Common Issues

**1. Port Already in Use:**
```bash
# Kill existing processes
pkill -f tsx && pkill -f vite
# Then restart
./start-with-lts.sh
```

**2. Node.js Version Issues:**
```bash
# The startup script handles this automatically
./start-with-lts.sh
# Or manually switch to LTS
nvm use --lts
```

**3. Package Installation Issues:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**4. Database Issues:**
```bash
# Remove database lock files
rm -f podcast-manager.db-wal podcast-manager.db-shm
# Database will be recreated on next start
```

**5. Server Not Responding:**
- Check if processes are running: `ps aux | grep -E "(tsx|vite)"`
- Verify ports are available: `lsof -i :3001 && lsof -i :5173`
- Check terminal output for error messages
- Try restarting with `./start-with-lts.sh`

### Development Tips

- **Auto-reload**: Frontend automatically reloads on code changes
- **API Changes**: Restart only the API server (`npm run dev:api`) for server-side changes
- **Database**: Located at `./podcast-manager.db` in project root
- **Uploads**: Temporary files stored in `./uploads/` directory
- **Logs**: Check terminal output for debugging information
- **Health Check**: Visit http://localhost:3001/api/health to verify API is running

## 🎙️ Transcription Setup

### Prerequisites for Transcription

The application includes full WhisperX transcription support. To enable transcription functionality:

**1. Install WhisperX (Python 3.9-3.12 required):**
```bash
# Create Python virtual environment (Python 3.12 recommended)
python3.12 -m venv whisperx-env

# Activate virtual environment
source whisperx-env/bin/activate

# Install WhisperX
pip install whisperx
```

**2. Verify Installation:**
```bash
# Test WhisperX availability
source whisperx-env/bin/activate
whisperx --help
```

### Transcription Features

**✅ Automatic Processing:**
- Episodes are automatically queued for transcription after download
- Progress tracking with real-time updates
- Speaker diarization (identifies different speakers)
- High-accuracy large-v3 model with optimized performance

**✅ Supported Formats:**
- **Input**: MP3, WAV, M4A, and other common audio formats
- **Output**: JSON format with timestamps and speaker labels
- **Language**: English with automatic language detection support
- **Quality**: Large-v3 model for high accuracy transcription

**✅ Configuration:**
```json
{
  "model": "large-v3",
  "language": "en", 
  "outputFormat": "json",
  "diarize": true,
  "speakerEmbeddings": true,
  "computeType": "int8",
  "segmentResolution": "sentence"
}
```

### Transcription Workflow

1. **Upload CSV** - Import podcast episodes
2. **Download Episodes** - Audio files are downloaded to local storage  
3. **Automatic Queueing** - Episodes are automatically queued for transcription
4. **Processing** - WhisperX processes audio with speaker diarization
5. **Completion** - JSON transcription files are saved alongside audio files
6. **Access** - Download transcriptions via API or web interface

### Transcription Troubleshooting

**WhisperX Not Available:**
```bash
# Ensure Python 3.9-3.12 is installed
python3.12 --version

# Recreate virtual environment
rm -rf whisperx-env
python3.12 -m venv whisperx-env
source whisperx-env/bin/activate
pip install whisperx
```

**Permission Issues:**
```bash
# Ensure whisperx-env directory has correct permissions
chmod -R 755 whisperx-env
```

**Model Download Issues:**
- First transcription will download required models (may take time)
- Ensure stable internet connection for initial setup
- Models are cached locally after first download

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## 🚢 Deployment

### Production Build
```bash
# Build the application
npm run build

# Preview production build locally
npm run preview
```

### Docker Support
```bash
# Build and run with Docker
docker-compose up -d

# Development mode with Docker
docker-compose --profile dev up -d
```

## 📊 Performance

### Download Management
- **Concurrent Downloads**: Configurable (default: 3)
- **Retry Logic**: Exponential backoff with jitter
- **Progress Tracking**: Real-time progress updates
- **Error Recovery**: Automatic retry with failure tracking

### Database Performance
- **SQLite with WAL mode**: Optimized for concurrent reads
- **Indexed queries**: Fast episode lookups and filtering
- **Prepared statements**: Optimized database operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes following the existing code style
4. Add tests for new functionality
5. Run quality checks: `npm run lint && npm run test`
6. Commit changes: `git commit -m "Description of changes"`
7. Push to branch: `git push origin feature-name`
8. Submit a pull request

### Code Style Guidelines

- **TypeScript**: Use strict mode with proper type definitions
- **ESLint**: Follow the configured linting rules
- **Prettier**: Code is automatically formatted
- **Testing**: Maintain good test coverage for new features

## 📄 License

This project is licensed under the ISC License.

## 🔗 Links

- **Repository**: https://github.com/bradnemer/blindspot-transcribe
- **Issues**: https://github.com/bradnemer/blindspot-transcribe/issues

## 📝 Recent Updates

### Latest Changes
- **WhisperX Integration**: Complete AI transcription setup with speaker diarization
- **Node.js Compatibility**: Fixed version conflicts and native module issues
- **Major Cleanup**: Removed duplicate files and technical debt (87 files, 17K+ lines removed)
- **Dependency Fix**: Resolved corrupted node_modules issues
- **Simplified Architecture**: Single source of truth for components
- **Enhanced Startup**: Reliable Node.js LTS startup script with automatic module rebuilding
- **Improved Documentation**: Comprehensive README with transcription setup and troubleshooting

### Architecture Improvements
- Consolidated multiple App components into single `App.tsx`
- Removed unused service layer duplicating API server functionality
- Enhanced `.gitignore` to prevent build artifact commits
- Streamlined package.json and reduced dependencies

---

For additional help or questions, please check the [issues section](https://github.com/bradnemer/blindspot-transcribe/issues) or create a new issue with detailed information about your problem.