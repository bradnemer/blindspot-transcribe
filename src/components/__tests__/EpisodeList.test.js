import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EpisodeList } from '../EpisodeList';
const mockEpisodes = [
    {
        id: 1,
        title: 'Test Episode 1',
        published_date: '2025-01-01T00:00:00.000Z',
        audio_url: 'https://example.com/episode1.mp3',
        status: 'pending',
        description: 'Test description 1',
        duration: 3600
    },
    {
        id: 2,
        title: 'Test Episode 2',
        published_date: '2025-01-02T00:00:00.000Z',
        audio_url: 'https://example.com/episode2.mp3',
        status: 'downloading',
        download_progress: 45,
        description: 'Test description 2',
        duration: 2400
    },
    {
        id: 3,
        title: 'Test Episode 3',
        published_date: '2025-01-03T00:00:00.000Z',
        audio_url: 'https://example.com/episode3.mp3',
        status: 'downloaded',
        description: 'Test description 3'
    }
];
const defaultProps = {
    episodes: mockEpisodes,
    onRefresh: jest.fn(),
    onError: jest.fn()
};
describe('EpisodeList', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('renders episode list with episodes', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        expect(screen.getByText('Test Episode 1')).toBeInTheDocument();
        expect(screen.getByText('Test Episode 2')).toBeInTheDocument();
        expect(screen.getByText('Test Episode 3')).toBeInTheDocument();
    });
    it('displays correct episode statistics', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        expect(screen.getByText(/Total: 3/)).toBeInTheDocument();
        expect(screen.getByText(/Pending: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Downloaded: 1/)).toBeInTheDocument();
    });
    it('shows status badges correctly', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Downloading')).toBeInTheDocument();
        expect(screen.getByText('Downloaded')).toBeInTheDocument();
    });
    it('displays download progress for downloading episodes', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        expect(screen.getByText('45%')).toBeInTheDocument();
    });
    it('formats episode dates correctly', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument();
        expect(screen.getByText('Jan 2, 2025')).toBeInTheDocument();
        expect(screen.getByText('Jan 3, 2025')).toBeInTheDocument();
    });
    it('formats episode duration correctly', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        expect(screen.getByText('60:00')).toBeInTheDocument(); // 3600 seconds = 1 hour
        expect(screen.getByText('40:00')).toBeInTheDocument(); // 2400 seconds = 40 minutes
    });
    it('handles episode selection', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        const checkboxes = screen.getAllByRole('checkbox');
        const firstEpisodeCheckbox = checkboxes[1]; // Skip "Select All" checkbox
        fireEvent.click(firstEpisodeCheckbox);
        expect(screen.getByText(/1 selected/)).toBeInTheDocument();
    });
    it('handles select all functionality', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        const selectAllCheckbox = screen.getByLabelText(/Select All/);
        fireEvent.click(selectAllCheckbox);
        expect(screen.getByText(/3 selected/)).toBeInTheDocument();
    });
    it('filters episodes by status', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        const filterSelect = screen.getByLabelText('Filter:');
        fireEvent.change(filterSelect, { target: { value: 'pending' } });
        expect(screen.getByText('Test Episode 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Episode 2')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Episode 3')).not.toBeInTheDocument();
    });
    it('sorts episodes by title', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        const sortSelect = screen.getByLabelText('Sort by:');
        fireEvent.change(sortSelect, { target: { value: 'title' } });
        const episodeTitles = screen.getAllByRole('heading', { level: 3 });
        expect(episodeTitles[0]).toHaveTextContent('Test Episode 1');
        expect(episodeTitles[1]).toHaveTextContent('Test Episode 2');
        expect(episodeTitles[2]).toHaveTextContent('Test Episode 3');
    });
    it('calls onRefresh when refresh button is clicked', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);
        expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1);
    });
    it('shows bulk download button when episodes are selected', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        const checkboxes = screen.getAllByRole('checkbox');
        const firstEpisodeCheckbox = checkboxes[1];
        fireEvent.click(firstEpisodeCheckbox);
        expect(screen.getByText(/Download Selected \(1\)/)).toBeInTheDocument();
    });
    it('calls onError when bulk download is attempted', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        const checkboxes = screen.getAllByRole('checkbox');
        const firstEpisodeCheckbox = checkboxes[1];
        fireEvent.click(firstEpisodeCheckbox);
        const bulkDownloadButton = screen.getByText(/Download Selected/);
        fireEvent.click(bulkDownloadButton);
        expect(defaultProps.onError).toHaveBeenCalledWith('Download functionality will be connected in next phase');
    });
    it('shows empty state when no episodes', () => {
        render(_jsx(EpisodeList, { ...defaultProps, episodes: [] }));
        expect(screen.getByText('No Episodes Yet')).toBeInTheDocument();
        expect(screen.getByText('Upload a CSV file to import podcast episodes')).toBeInTheDocument();
    });
    it('truncates long episode titles', () => {
        const longTitleEpisode = {
            id: 4,
            title: 'This is a very long episode title that should be truncated when displayed in the episode list component',
            published_date: '2025-01-04T00:00:00.000Z',
            audio_url: 'https://example.com/episode4.mp3',
            status: 'pending'
        };
        render(_jsx(EpisodeList, { ...defaultProps, episodes: [longTitleEpisode] }));
        const titleElement = screen.getByRole('heading', { level: 3 });
        expect(titleElement.textContent?.length).toBeLessThan(longTitleEpisode.title.length);
    });
    it('shows original URL links for episodes with audio URLs', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        const urlLinks = screen.getAllByText('Original URL');
        expect(urlLinks).toHaveLength(3);
        expect(urlLinks[0]).toHaveAttribute('href', 'https://example.com/episode1.mp3');
        expect(urlLinks[0]).toHaveAttribute('target', '_blank');
        expect(urlLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');
    });
    it('handles invalid dates gracefully', () => {
        const invalidDateEpisode = {
            id: 5,
            title: 'Invalid Date Episode',
            published_date: 'invalid-date',
            audio_url: 'https://example.com/episode5.mp3',
            status: 'pending'
        };
        render(_jsx(EpisodeList, { episodes: [invalidDateEpisode], onRefresh: jest.fn(), onError: jest.fn() }));
        expect(screen.getByText('Unknown Date')).toBeInTheDocument();
    });
    it('shows episode descriptions', () => {
        render(_jsx(EpisodeList, { ...defaultProps }));
        expect(screen.getByText('Test description 1')).toBeInTheDocument();
        expect(screen.getByText('Test description 2')).toBeInTheDocument();
        expect(screen.getByText('Test description 3')).toBeInTheDocument();
    });
    it('truncates long episode descriptions', () => {
        const longDescriptionEpisode = {
            id: 6,
            title: 'Long Description Episode',
            published_date: '2025-01-06T00:00:00.000Z',
            audio_url: 'https://example.com/episode6.mp3',
            status: 'pending',
            description: 'This is a very long episode description that should be truncated when displayed in the episode list component to maintain a clean and readable layout for users browsing through the episodes.'
        };
        render(_jsx(EpisodeList, { episodes: [longDescriptionEpisode], onRefresh: jest.fn(), onError: jest.fn() }));
        const descriptionElement = screen.getByText(/This is a very long episode description/);
        expect(descriptionElement.textContent).toContain('...');
        expect(descriptionElement.textContent?.length).toBeLessThan(longDescriptionEpisode.description.length);
    });
});
//# sourceMappingURL=EpisodeList.test.js.map