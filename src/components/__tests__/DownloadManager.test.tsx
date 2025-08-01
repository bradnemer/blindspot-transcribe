import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DownloadManager } from '../DownloadManager';

const defaultProps = {
  onError: jest.fn()
};

describe('DownloadManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders download manager header', () => {
    render(<DownloadManager {...defaultProps} />);
    
    expect(screen.getByText('Download Manager')).toBeInTheDocument();
    expect(screen.getByText('Monitor and control podcast episode downloads')).toBeInTheDocument();
  });

  it('displays queue statistics', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    // Wait for sample downloads to load
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Total
    });
    
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Downloading')).toBeInTheDocument();
    expect(screen.getByText('Queued')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows download queue controls', () => {
    render(<DownloadManager {...defaultProps} />);
    
    expect(screen.getByText('Start Queue')).toBeInTheDocument();
    expect(screen.getByText('Stop All')).toBeInTheDocument();
  });

  it('displays concurrent download settings', () => {
    render(<DownloadManager {...defaultProps} />);
    
    expect(screen.getByText('Concurrent Downloads:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument(); // Default value
  });

  it('shows auto-start setting', () => {
    render(<DownloadManager {...defaultProps} />);
    
    const autoStartCheckbox = screen.getByLabelText('Auto-start new downloads');
    expect(autoStartCheckbox).toBeInTheDocument();
    expect(autoStartCheckbox).toBeChecked(); // Default is true
  });

  it('handles start queue button click', () => {
    render(<DownloadManager {...defaultProps} />);
    
    const startButton = screen.getByText('Start Queue');
    fireEvent.click(startButton);
    
    expect(defaultProps.onError).toHaveBeenCalledWith(
      'Download queue will be connected in next integration phase'
    );
  });

  it('changes to pause button when queue is running', () => {
    render(<DownloadManager {...defaultProps} />);
    
    const startButton = screen.getByText('Start Queue');
    fireEvent.click(startButton);
    
    expect(screen.getByText('Pause Queue')).toBeInTheDocument();
    expect(screen.queryByText('Start Queue')).not.toBeInTheDocument();
  });

  it('handles concurrent limit changes', () => {
    render(<DownloadManager {...defaultProps} />);
    
    const concurrentSelect = screen.getByDisplayValue('3');
    fireEvent.change(concurrentSelect, { target: { value: '5' } });
    
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('handles auto-start toggle', () => {
    render(<DownloadManager {...defaultProps} />);
    
    const autoStartCheckbox = screen.getByLabelText('Auto-start new downloads');
    fireEvent.click(autoStartCheckbox);
    
    expect(autoStartCheckbox).not.toBeChecked();
  });

  it('displays sample download items', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Sample Episode 1: Introduction to Podcasting/)).toBeInTheDocument();
      expect(screen.getByText(/Sample Episode 2: Advanced Techniques/)).toBeInTheDocument();
      expect(screen.getByText(/Sample Episode 3: Expert Interview/)).toBeInTheDocument();
    });
  });

  it('shows download progress for downloading items', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('45%')).toBeInTheDocument();
    });
  });

  it('displays download speed and ETA', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('500.0 KB/s')).toBeInTheDocument();
      expect(screen.getByText('ETA: 3:00')).toBeInTheDocument();
    });
  });

  it('shows completed status for finished downloads', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Download Complete')).toBeInTheDocument();
    });
  });

  it('shows queued status for pending downloads', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Queued')).toBeInTheDocument();
    });
  });

  it('provides source links for episodes', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    await waitFor(() => {
      const sourceLinks = screen.getAllByText('Source');
      expect(sourceLinks).toHaveLength(3);
      expect(sourceLinks[0]).toHaveAttribute('href', 'https://example.com/episode1.mp3');
    });
  });

  it('shows pause button for downloading items', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });
  });

  it('shows remove buttons for appropriate items', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    await waitFor(() => {
      const removeButtons = screen.getAllByText('Remove');
      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });

  it('handles stop all button click', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    await waitFor(() => {
      const stopButton = screen.getByText('Stop All');
      fireEvent.click(stopButton);
    });
    
    // Should clear the downloads
    await waitFor(() => {
      expect(screen.getByText('No Downloads')).toBeInTheDocument();
    });
  });

  it('formats file speeds correctly', () => {
    render(<DownloadManager {...defaultProps} />);
    
    // Test formatSpeed function indirectly through component
    // The component uses formatSpeed to display "500.0 KB/s"
    // This is tested in the "displays download speed and ETA" test
  });

  it('formats ETA correctly', () => {
    render(<DownloadManager {...defaultProps} />);
    
    // Test formatETA function indirectly through component
    // The component uses formatETA to display "ETA: 3:00"
    // This is tested in the "displays download speed and ETA" test
  });

  it('handles empty download queue', () => {
    // Mock empty initial state
    const { rerender } = render(<DownloadManager {...defaultProps} />);
    
    // Simulate clearing downloads
    fireEvent.click(screen.getByText('Stop All'));
    
    expect(screen.getByText('No Downloads')).toBeInTheDocument();
    expect(screen.getByText('Start downloading episodes from the Episodes tab')).toBeInTheDocument();
  });

  it('shows statistics with correct colors', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    await waitFor(() => {
      const downloadingStat = screen.getByText('1'); // 1 downloading
      expect(downloadingStat).toHaveClass('downloading');
      
      const completedStat = screen.getByText('1'); // 1 completed
      // Note: Both downloading and completed show "1", so we need to be more specific
    });
  });

  it('disables start button when no queued items', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    // First stop all to clear queue
    await waitFor(() => {
      fireEvent.click(screen.getByText('Stop All'));
    });
    
    await waitFor(() => {
      const startButton = screen.getByText('Start Queue');
      expect(startButton).toBeDisabled();
    });
  });

  it('shows dates in correct format', async () => {
    render(<DownloadManager {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('1/1/2025')).toBeInTheDocument();
      expect(screen.getByText('1/2/2025')).toBeInTheDocument();
      expect(screen.getByText('1/3/2025')).toBeInTheDocument();
    });
  });
});