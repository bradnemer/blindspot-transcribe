# Podcast Episode Manager - User Guide

Welcome to the Podcast Episode Manager! This guide will walk you through all the features and help you get the most out of the application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Importing Episodes](#importing-episodes)
3. [Managing Your Episode Library](#managing-your-episode-library)
4. [Downloading Episodes](#downloading-episodes)
5. [Settings and Configuration](#settings-and-configuration)
6. [Tips and Best Practices](#tips-and-best-practices)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### First Launch

When you first open the Podcast Episode Manager, you'll see a clean interface with four main tabs:

- **Episodes**: Your episode library (initially empty)
- **Upload CSV**: Import episodes from CSV files
- **Downloads**: Monitor active downloads
- **Settings**: Configure application preferences

### Interface Overview

The application uses a tabbed interface for easy navigation:
- Clear visual indicators show which tab is active
- Status indicators show download progress and episode counts
- Error messages appear at the top when issues occur

## Importing Episodes

### Preparing Your CSV File

Before importing, prepare a CSV file with your podcast episodes. The file should include these columns:

#### Required Columns
- **Episode Title**: The name of the episode
  - Accepted headers: `title`, `episode_title`, `episode name`, `name`
- **Published Date**: When the episode was published
  - Accepted headers: `published_date`, `publish_date`, `date published`, `date`, `release_date`
  - Format: YYYY-MM-DD (e.g., "2023-12-25")
- **Audio URL**: Direct link to the audio file
  - Accepted headers: `audio_url`, `url`, `audio url`, `download url`, `mp3 url`, `link`

#### Optional Columns
- **Description**: Episode summary or show notes
  - Accepted headers: `description`, `summary`, `desc`, `episode description`
- **Duration**: Episode length in seconds
  - Accepted headers: `duration`, `length`, `runtime`, `duration_seconds`

#### Example CSV Format
```csv
title,published_date,audio_url,description,duration
"Episode 1: Introduction","2023-01-01","https://example.com/episode1.mp3","Welcome to our podcast",3600
"Episode 2: Getting Started","2023-01-08","https://example.com/episode2.mp3","Learn the basics",2700
```

### Import Process

1. **Navigate to Upload CSV Tab**
   - Click the "Upload CSV" tab at the top of the application

2. **Select Your File**
   - Click "Choose File" button
   - Browse and select your CSV file
   - Supported formats: `.csv`, `.txt`

3. **Review the Preview**
   - The application will show a preview of your data
   - Column headers are automatically mapped to the correct fields
   - Check that the data looks correct

4. **Handle Import Issues**
   - **Invalid dates**: The system will attempt to parse various date formats
   - **Missing required fields**: Episodes without title, date, or URL will be skipped
   - **Duplicates**: Episodes with the same title and date will be ignored

5. **Complete the Import**
   - Click "Import Episodes" to add them to your library
   - You'll see a progress indicator during import
   - The Episodes tab will automatically open when complete

### Import Results

After import, you'll see:
- **Success count**: Number of episodes successfully imported
- **Duplicate count**: Episodes that already existed
- **Error count**: Episodes that couldn't be imported
- **Detailed log**: Any issues encountered during import

## Managing Your Episode Library

### Viewing Episodes

The Episodes tab shows all your imported episodes in a grid layout. Each episode card displays:

- **Title**: Episode name (truncated if too long)
- **Published Date**: When the episode was published
- **Status Badge**: Current download status with color coding:
  - 🟡 **Pending**: Ready to download
  - 🔵 **Downloading**: Currently being downloaded (with progress bar)
  - 🟢 **Downloaded**: Successfully downloaded
  - 🟣 **Transcribed**: Downloaded and transcribed
  - 🔴 **Failed**: Download failed

### Filtering and Sorting

#### Filter by Status
Use the "Filter" dropdown to show only episodes with specific statuses:
- **All Episodes**: Show everything
- **Pending**: Episodes waiting to be downloaded
- **Downloading**: Currently active downloads
- **Downloaded**: Successfully downloaded episodes
- **Transcribed**: Episodes that have been transcribed
- **Failed**: Episodes that failed to download

#### Sort Options
Use the "Sort by" dropdown to organize episodes:
- **Date**: Sort by published date (newest first)
- **Title**: Alphabetical order
- **Status**: Group by download status

### Episode Statistics

The header shows useful statistics:
- **Total**: Total number of episodes
- **Pending**: Episodes ready for download
- **Downloaded**: Successfully downloaded episodes
- **Transcribed**: Episodes with transcriptions
- **Failed**: Episodes that encountered errors (only shown if > 0)

### Bulk Actions

Select multiple episodes for batch operations:

1. **Select Episodes**
   - Use individual checkboxes on each episode
   - Or use "Select All" to choose all visible episodes

2. **Bulk Download**
   - Click "Download Selected" to queue multiple episodes
   - Only pending episodes will be added to the download queue

### Individual Episode Actions

Each episode card provides action buttons based on its status:

- **Original URL**: Link to the original audio file
- **Open File**: (Downloaded episodes) Open the local audio file
- **Retry**: (Failed episodes) Attempt download again

## Downloading Episodes

### Download Manager

The Downloads tab shows:
- **Active Downloads**: Currently downloading episodes with progress bars
- **Queue Status**: Number of downloads in progress
- **Speed and ETA**: Real-time download statistics

### Download Process

1. **Add to Queue**
   - Select episodes in the Episodes tab
   - Click "Download Selected" or download individual episodes

2. **Monitor Progress**
   - Switch to Downloads tab to see active downloads
   - Progress bars show completion percentage
   - Speed indicators show download rate (MB/s, KB/s)
   - ETA shows estimated time remaining

3. **Queue Management**
   - **Pause**: Temporarily stop all downloads
   - **Resume**: Continue paused downloads
   - **Cancel**: Remove specific downloads from queue

### Download Settings

The system automatically manages:
- **Concurrent Downloads**: Maximum 3 simultaneous downloads (configurable)
- **Retry Logic**: Failed downloads are automatically retried with increasing delays
- **File Organization**: Downloaded files are saved with sanitized names

### Error Handling

If downloads fail:
- Episodes are marked with "Failed" status
- Error messages are logged for troubleshooting
- Automatic retry with exponential backoff
- Manual retry option available

## Settings and Configuration

### Access Settings

Click the Settings tab to configure the application.

### Download Settings

- **Max Concurrent Downloads**: Number of simultaneous downloads (1-5)
- **Download Directory**: Where audio files are saved
- **Retry Attempts**: How many times to retry failed downloads
- **Timeout Settings**: Maximum time to wait for downloads

### Performance Settings

- **Cache Duration**: How long to cache episode data
- **Performance Monitoring**: Enable/disable performance tracking
- **Memory Management**: Automatic cleanup settings

### Logging Settings

- **Log Level**: Amount of detail in logs (Debug, Info, Warning, Error)
- **Console Output**: Show logs in browser console
- **Local Storage**: Save logs locally for troubleshooting

### Import Settings

- **Duplicate Handling**: What to do with duplicate episodes
- **Date Format Parsing**: How to interpret date formats
- **Character Encoding**: Text encoding for CSV files

## Tips and Best Practices

### CSV File Preparation

1. **Use Standard Headers**: Stick to common column names like "title", "date", "url"
2. **Consistent Date Format**: Use YYYY-MM-DD format for best results
3. **Clean URLs**: Ensure audio URLs are direct links to files
4. **Validate Data**: Check for missing or malformed entries before import

### Download Management

1. **Batch Processing**: Download in small batches (10-20 episodes) for better performance
2. **Network Considerations**: Be mindful of bandwidth usage and server load
3. **Storage Space**: Monitor available disk space for downloads
4. **Error Monitoring**: Check failed downloads regularly and investigate issues

### Performance Optimization

1. **Regular Cleanup**: Clear old logs and cache periodically
2. **Memory Management**: Close unused tabs and restart occasionally
3. **Database Maintenance**: Keep episode database clean and organized

### Data Backup

1. **Export Settings**: Note your configuration settings
2. **Database Backup**: Copy the podcast-manager.db file regularly
3. **CSV Archives**: Keep original CSV files as backups

## Troubleshooting

### Common Issues

#### "No Episodes Yet" Message
- **Cause**: No episodes have been imported
- **Solution**: Use the Upload CSV tab to import episodes

#### Import Fails Completely
- **Cause**: CSV file format issues
- **Solutions**:
  - Check file encoding (should be UTF-8)
  - Verify required columns exist
  - Remove special characters from headers
  - Try a smaller test file first

#### Downloads Get Stuck
- **Cause**: Network issues or server problems
- **Solutions**:
  - Check internet connection
  - Try downloading one episode at a time
  - Verify audio URLs are still valid
  - Clear browser cache

#### "Failed" Download Status
- **Causes**: 
  - Audio URL no longer valid
  - Server blocking downloads
  - Network timeout
- **Solutions**:
  - Check the original URL in a browser
  - Try downloading later
  - Update the audio URL if needed

#### Application Runs Slowly
- **Causes**:
  - Large number of episodes
  - Browser memory issues
  - Background downloads
- **Solutions**:
  - Filter episodes to show fewer at once
  - Restart the browser
  - Pause downloads temporarily
  - Check browser memory usage

#### Error Messages Persist
- **Solution**: Check browser console for detailed error information
- **Report**: Copy error details for support

### Getting Help

1. **Check Browser Console**: Press F12 → Console tab for detailed errors
2. **Review Logs**: Settings tab → view application logs
3. **Performance Metrics**: Check for performance recommendations
4. **Documentation**: Refer to README.md for technical details

### Performance Monitoring

The application includes built-in performance monitoring:
- **Slow Operations**: Automatically identifies performance bottlenecks
- **Memory Usage**: Tracks browser memory consumption
- **Database Performance**: Monitors query execution times
- **Recommendations**: Provides specific optimization suggestions

Access performance data through:
- Browser developer tools
- Application logs
- Settings panel performance section

## Advanced Features

### Keyboard Shortcuts

- **Ctrl/Cmd + R**: Refresh episode list
- **Ctrl/Cmd + A**: Select all episodes (when episode list is focused)
- **Space**: Toggle episode selection (when episode card is focused)

### URL Validation

The application automatically validates:
- Audio URL accessibility
- File format compatibility
- Server response codes

### Data Export

While not directly available in the UI, you can export data by:
- Copying the database file (podcast-manager.db)
- Using browser developer tools to access raw data
- Generating reports from the logging system

## Conclusion

The Podcast Episode Manager is designed to make podcast management simple and efficient. With its automated downloading, comprehensive monitoring, and flexible import system, you can easily organize and access your podcast library.

For technical support or feature requests, please refer to the project's GitHub repository or documentation.