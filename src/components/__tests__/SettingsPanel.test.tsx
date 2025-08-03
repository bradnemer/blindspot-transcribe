import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPanel } from '../SettingsPanel';

const defaultProps = {
  onError: jest.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders settings panel header', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure podcast manager preferences')).toBeInTheDocument();
  });

  it('displays all setting tabs', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    expect(screen.getByText('Downloads')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText('Interface')).toBeInTheDocument();
    expect(screen.getByText('Transcription')).toBeInTheDocument();
  });

  it('shows downloads tab by default', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    expect(screen.getByText('Download Settings')).toBeInTheDocument();
    expect(screen.getByText('Concurrent Downloads')).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    // Click Storage tab
    fireEvent.click(screen.getByText('Storage'));
    expect(screen.getByText('Storage Settings')).toBeInTheDocument();
    expect(screen.getByText('Database Location')).toBeInTheDocument();
    
    // Click Interface tab
    fireEvent.click(screen.getByText('Interface'));
    expect(screen.getByText('Interface Settings')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    
    // Click Transcription tab
    fireEvent.click(screen.getByText('Transcription'));
    expect(screen.getByText('Transcription Settings')).toBeInTheDocument();
    expect(screen.getByText('Auto-transcribe episodes')).toBeInTheDocument();
  });

  it('displays default values', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    // Check concurrent downloads default
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    
    // Check auto-start is enabled by default
    const autoStartCheckbox = screen.getByLabelText('Auto-start downloads');
    expect(autoStartCheckbox).toBeChecked();
  });

  it('handles concurrent downloads change', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    const concurrentSelect = screen.getByDisplayValue('3');
    fireEvent.change(concurrentSelect, { target: { value: '5' } });
    
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
  });

  it('handles checkbox changes', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    const autoStartCheckbox = screen.getByLabelText('Auto-start downloads');
    fireEvent.click(autoStartCheckbox);
    
    expect(autoStartCheckbox).not.toBeChecked();
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
  });

  it('handles text input changes', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    const destinationInput = screen.getByDisplayValue('./downloads');
    fireEvent.change(destinationInput, { target: { value: './new-downloads' } });
    
    expect(screen.getByDisplayValue('./new-downloads')).toBeInTheDocument();
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
  });

  it('handles number input changes', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    const retryInput = screen.getByDisplayValue('3'); // Retry attempts
    fireEvent.change(retryInput, { target: { value: '5' } });
    
    // Note: There might be multiple inputs with value '3', so we need to be more specific
    const timeoutInput = screen.getByDisplayValue('300');
    fireEvent.change(timeoutInput, { target: { value: '600' } });
    
    expect(screen.getByDisplayValue('600')).toBeInTheDocument();
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
  });

  it('saves settings to localStorage', async () => {
    render(<SettingsPanel {...defaultProps} />);
    
    // Make a change
    const autoStartCheckbox = screen.getByLabelText('Auto-start downloads');
    fireEvent.click(autoStartCheckbox);
    
    // Save settings
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'podcast-manager-settings',
        expect.stringContaining('"auto_start":false')
      );
    });
  });

  it('loads settings from localStorage', () => {
    const savedSettings = JSON.stringify({
      downloads: {
        concurrent_limit: 5,
        auto_start: false
      }
    });
    localStorageMock.getItem.mockReturnValue(savedSettings);
    
    render(<SettingsPanel {...defaultProps} />);
    
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    const autoStartCheckbox = screen.getByLabelText('Auto-start downloads');
    expect(autoStartCheckbox).not.toBeChecked();
  });

  it('resets to default values', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    // Make changes
    const concurrentSelect = screen.getByDisplayValue('3');
    fireEvent.change(concurrentSelect, { target: { value: '5' } });
    
    // Reset to defaults
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
  });

  it('shows saving state', async () => {
    render(<SettingsPanel {...defaultProps} />);
    
    // Make a change
    const autoStartCheckbox = screen.getByLabelText('Auto-start downloads');
    fireEvent.click(autoStartCheckbox);
    
    // Save settings
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);
    
    // Should show saving state briefly
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    
    // Wait for save to complete
    await waitFor(() => {
      expect(screen.getByText('Save Settings')).toBeInTheDocument();
    });
  });

  it('disables save button when no changes', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    const saveButton = screen.getByText('Save Settings');
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when changes are made', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    const autoStartCheckbox = screen.getByLabelText('Auto-start downloads');
    fireEvent.click(autoStartCheckbox);
    
    const saveButton = screen.getByText('Save Settings');
    expect(saveButton).not.toBeDisabled();
  });

  it('displays storage settings', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Storage'));
    
    expect(screen.getByText('Database Location')).toBeInTheDocument();
    expect(screen.getByDisplayValue('./podcast-manager.db')).toBeInTheDocument();
    expect(screen.getByText('Auto-cleanup old files')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // Max storage GB
  });

  it('displays interface settings', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Interface'));
    
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByDisplayValue('auto')).toBeInTheDocument();
    expect(screen.getByText('Compact view')).toBeInTheDocument();
    expect(screen.getByText('Show notifications')).toBeInTheDocument();
  });

  it('displays transcription settings', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Transcription'));
    
    expect(screen.getByText('Auto-transcribe episodes')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByDisplayValue('en')).toBeInTheDocument();
    expect(screen.getByText('Transcription Quality')).toBeInTheDocument();
    expect(screen.getByDisplayValue('balanced')).toBeInTheDocument();
  });

  it('shows application information', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    expect(screen.getByText('Application Information')).toBeInTheDocument();
    expect(screen.getByText('Version:')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Database:')).toBeInTheDocument();
    expect(screen.getByText('Downloads:')).toBeInTheDocument();
  });

  it('handles theme selection', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Interface'));
    
    const themeSelect = screen.getByDisplayValue('auto');
    fireEvent.change(themeSelect, { target: { value: 'dark' } });
    
    expect(screen.getByDisplayValue('dark')).toBeInTheDocument();
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
  });

  it('handles language selection', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Transcription'));
    
    const languageSelect = screen.getByDisplayValue('en');
    fireEvent.change(languageSelect, { target: { value: 'es' } });
    
    expect(screen.getByDisplayValue('es')).toBeInTheDocument();
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
  });

  it('shows setting descriptions', () => {
    render(<SettingsPanel {...defaultProps} />);
    
    expect(screen.getByText('Number of episodes to download simultaneously')).toBeInTheDocument();
    expect(screen.getByText('Automatically start downloading when episodes are added to queue')).toBeInTheDocument();
    expect(screen.getByText('Number of times to retry failed downloads')).toBeInTheDocument();
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    render(<SettingsPanel {...defaultProps} />);
    
    // Should still render with default values
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(defaultProps.onError).toHaveBeenCalledWith('Failed to load settings');
  });

  it('clears unsaved changes warning after save', async () => {
    render(<SettingsPanel {...defaultProps} />);
    
    // Make a change
    const autoStartCheckbox = screen.getByLabelText('Auto-start downloads');
    fireEvent.click(autoStartCheckbox);
    
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    
    // Save settings
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
    });
  });
});