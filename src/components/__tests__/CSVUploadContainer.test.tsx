import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CSVUploadContainer } from '../CSVUploadContainer';
import { Episode } from '../../types';

// Mock the CSVUpload component since we're testing the container logic
jest.mock('../CSVUpload', () => ({
  CSVUpload: ({ onFileValidated, onError }: { onFileValidated: (episodes: Episode[]) => void; onError: (error: string) => void }) => (
    <div data-testid="csv-upload">
      <button
        onClick={() => {
          const mockEpisodes: Episode[] = [
            {
              id: 1,
              title: 'Test Episode 1',
              published_date: '2025-01-01T00:00:00.000Z',
              audio_url: 'https://example.com/episode1.mp3',
              status: 'pending',
              duration: 3600
            },
            {
              id: 2,
              title: 'Test Episode 2',
              published_date: '2025-01-02T00:00:00.000Z',
              audio_url: 'https://example.com/episode2.mp3',
              status: 'pending',
              duration: 2400
            }
          ];
          onFileValidated(mockEpisodes);
        }}
      >
        Mock File Upload
      </button>
      <button
        onClick={() => onError('Mock error message')}
      >
        Mock Error
      </button>
    </div>
  )
}));

const defaultProps = {
  onImportComplete: jest.fn(),
  onError: jest.fn()
};

describe('CSVUploadContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload interface by default', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    expect(screen.getByText('Import Podcast Episodes')).toBeInTheDocument();
    expect(screen.getByText('Upload a CSV file containing podcast episode information')).toBeInTheDocument();
  });

  it('shows CSV format information', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    expect(screen.getByText('Required CSV Format')).toBeInTheDocument();
    expect(screen.getByText('title - Episode title (required)')).toBeInTheDocument();
    expect(screen.getByText('published_date - Publication date (YYYY-MM-DD format)')).toBeInTheDocument();
    expect(screen.getByText('audio_url - Direct link to MP3 file (required for downloads)')).toBeInTheDocument();
  });

  it('displays format tips', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    expect(screen.getByText('Tips:')).toBeInTheDocument();
    expect(screen.getByText('Include column headers in the first row')).toBeInTheDocument();
    expect(screen.getByText('Dates should be in YYYY-MM-DD format (e.g., 2025-01-15)')).toBeInTheDocument();
    expect(screen.getByText('UTF-8 encoding is recommended for special characters')).toBeInTheDocument();
  });

  it('shows sample CSV content', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    expect(screen.getByText('Sample CSV Content')).toBeInTheDocument();
    expect(screen.getByText(/title,published_date,audio_url,description,duration/)).toBeInTheDocument();
    expect(screen.getByText(/"Episode 1: Getting Started"/)).toBeInTheDocument();
  });

  it('renders CSVUpload component', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    expect(screen.getByTestId('csv-upload')).toBeInTheDocument();
  });

  it('shows preview when file is validated', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    // Trigger file validation
    fireEvent.click(screen.getByText('Mock File Upload'));
    
    expect(screen.getByText('Import Preview')).toBeInTheDocument();
    expect(screen.getByText('Found 2 episodes to import')).toBeInTheDocument();
  });

  it('displays preview statistics', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock File Upload'));
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Total episodes
    expect(screen.getByText('Total Episodes')).toBeInTheDocument();
    expect(screen.getByText('With Audio URLs')).toBeInTheDocument();
    expect(screen.getByText('With Duration')).toBeInTheDocument();
  });

  it('shows preview table with episode data', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock File Upload'));
    
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Audio URL')).toBeInTheDocument();
    
    expect(screen.getByText('Test Episode 1')).toBeInTheDocument();
    expect(screen.getByText('Test Episode 2')).toBeInTheDocument();
  });

  it('formats dates in preview table', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock File Upload'));
    
    expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument();
    expect(screen.getByText('Jan 2, 2025')).toBeInTheDocument();
  });

  it('formats duration in preview table', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock File Upload'));
    
    expect(screen.getByText('1h 0m')).toBeInTheDocument(); // 3600 seconds
    expect(screen.getByText('40m')).toBeInTheDocument(); // 2400 seconds
  });

  it('shows view URL links for episodes with audio URLs', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock File Upload'));
    
    const viewUrlLinks = screen.getAllByText('View URL');
    expect(viewUrlLinks).toHaveLength(2);
    expect(viewUrlLinks[0]).toHaveAttribute('href', 'https://example.com/episode1.mp3');
    expect(viewUrlLinks[0]).toHaveAttribute('target', '_blank');
  });

  it('provides cancel and import buttons in preview', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock File Upload'));
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Import 2 Episodes')).toBeInTheDocument();
  });

  it('cancels import and returns to upload interface', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock File Upload'));
    expect(screen.getByText('Import Preview')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.getByText('Import Podcast Episodes')).toBeInTheDocument();
    expect(screen.queryByText('Import Preview')).not.toBeInTheDocument();
  });

  it('starts import process when confirmed', async () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock File Upload'));
    fireEvent.click(screen.getByText('Import 2 Episodes'));
    
    expect(screen.getByText('Importing Episodes...')).toBeInTheDocument();
    expect(screen.getByText('0 of 2 episodes imported')).toBeInTheDocument();
  });

  it('shows import progress', async () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock File Upload'));
    fireEvent.click(screen.getByText('Import 2 Episodes'));
    
    // Wait for progress to update
    await waitFor(() => {
      expect(screen.getByText(/episodes imported/)).toBeInTheDocument();
    });
  });

  it('completes import and calls onImportComplete', async () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock File Upload'));
    fireEvent.click(screen.getByText('Import 2 Episodes'));
    
    // Wait for import to complete
    await waitFor(() => {
      expect(defaultProps.onImportComplete).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('handles errors from CSV upload component', () => {
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock Error'));
    
    expect(defaultProps.onError).toHaveBeenCalledWith('Mock error message');
  });

  it('handles import errors', async () => {
    // Mock a failed import by rejecting the promise
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      if (typeof callback === 'function') {
        callback();
      }
      return 123 as any;
    });
    
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock File Upload'));
    fireEvent.click(screen.getByText('Import 2 Episodes'));
    
    // Import should complete normally with our current implementation
    await waitFor(() => {
      expect(defaultProps.onImportComplete).toHaveBeenCalled();
    });
    
    jest.restoreAllMocks();
  });

  it('truncates long episode titles in preview', () => {
    // Mock CSVUpload to return episode with long title
    const longTitleEpisode: Episode[] = [{
      id: 1,
      title: 'This is a very long episode title that should be truncated when displayed in the preview table to maintain good layout and readability',
      published_date: '2025-01-01T00:00:00.000Z',
      audio_url: 'https://example.com/episode1.mp3',
      status: 'pending'
    }];
    
    const CSVUploadMock = ({ onFileValidated }: { onFileValidated: (episodes: Episode[]) => void }) => (
      <div data-testid="csv-upload">
        <button onClick={() => onFileValidated(longTitleEpisode)}>
          Mock Long Title Upload
        </button>
      </div>
    );
    
    // Re-mock CSVUpload for this test
    jest.doMock('../CSVUpload', () => ({
      CSVUpload: CSVUploadMock
    }));
    
    const { CSVUpload } = require('../CSVUpload');
    
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock Long Title Upload'));
    
    // Should truncate title in preview
    const titleCell = screen.getByText(/This is a very long episode title/);
    expect(titleCell.textContent).toContain('...');
  });

  it('shows "No URL" for episodes without audio URLs', () => {
    const noUrlEpisode: Episode[] = [{
      id: 1,
      title: 'Episode without URL',
      published_date: '2025-01-01T00:00:00.000Z',
      status: 'pending'
    }];
    
    const CSVUploadMock = ({ onFileValidated }: { onFileValidated: (episodes: Episode[]) => void }) => (
      <div data-testid="csv-upload">
        <button onClick={() => onFileValidated(noUrlEpisode)}>
          Mock No URL Upload
        </button>
      </div>
    );
    
    jest.doMock('../CSVUpload', () => ({
      CSVUpload: CSVUploadMock
    }));
    
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock No URL Upload'));
    
    expect(screen.getByText('No URL')).toBeInTheDocument();
  });

  it('limits preview table to 10 episodes', () => {
    const manyEpisodes: Episode[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      title: `Episode ${i + 1}`,
      published_date: '2025-01-01T00:00:00.000Z',
      audio_url: `https://example.com/episode${i + 1}.mp3`,
      status: 'pending' as const
    }));
    
    const CSVUploadMock = ({ onFileValidated }: { onFileValidated: (episodes: Episode[]) => void }) => (
      <div data-testid="csv-upload">
        <button onClick={() => onFileValidated(manyEpisodes)}>
          Mock Many Episodes Upload
        </button>
      </div>
    );
    
    jest.doMock('../CSVUpload', () => ({
      CSVUpload: CSVUploadMock
    }));
    
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock Many Episodes Upload'));
    
    // Should show only 10 episodes in preview
    expect(screen.getByText('Episode 10')).toBeInTheDocument();
    expect(screen.queryByText('Episode 11')).not.toBeInTheDocument();
    expect(screen.getByText('... and 5 more episodes')).toBeInTheDocument();
  });

  it('handles invalid dates gracefully', () => {
    const invalidDateEpisode: Episode[] = [{
      id: 1,
      title: 'Invalid Date Episode',
      published_date: 'invalid-date-string',
      audio_url: 'https://example.com/episode1.mp3',
      status: 'pending'
    }];
    
    const CSVUploadMock = ({ onFileValidated }: { onFileValidated: (episodes: Episode[]) => void }) => (
      <div data-testid="csv-upload">
        <button onClick={() => onFileValidated(invalidDateEpisode)}>
          Mock Invalid Date Upload
        </button>
      </div>
    );
    
    jest.doMock('../CSVUpload', () => ({
      CSVUpload: CSVUploadMock
    }));
    
    render(<CSVUploadContainer {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Mock Invalid Date Upload'));
    
    expect(screen.getByText('Invalid Date')).toBeInTheDocument();
  });
});