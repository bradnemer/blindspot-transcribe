import { FileNamingUtils } from '../fileNaming';
describe('FileNamingUtils', () => {
    const mockEpisode = {
        episode_id: 1001,
        podcast_id: 42,
        podcast_name: 'Test Podcast',
        episode_title: 'Test Episode with Special Characters!@#',
        published_date: '2025-01-15T10:30:00.000Z',
        audio_url: 'https://example.com/episode.mp3',
        download_status: 'pending',
        download_progress: 0,
        retry_count: 0,
    };
    describe('generateFilename', () => {
        it('should generate correct filename with date formatting', () => {
            const filename = FileNamingUtils.generateFilename(mockEpisode);
            expect(filename).toBe('42_1001_2025-01-15.mp3');
        });
        it('should handle different date formats', () => {
            const episode = {
                ...mockEpisode,
                published_date: '2025-12-31T23:59:59.000Z',
            };
            const filename = FileNamingUtils.generateFilename(episode);
            expect(filename).toBe('42_1001_2025-12-31.mp3');
        });
        it('should handle invalid dates gracefully', () => {
            const episode = {
                ...mockEpisode,
                published_date: 'invalid-date',
            };
            const filename = FileNamingUtils.generateFilename(episode);
            expect(filename).toBe('42_1001_unknown-date.mp3');
        });
    });
    describe('generateFilePath', () => {
        it('should generate correct full file path', () => {
            const downloadDir = '/tmp/downloads';
            const filePath = FileNamingUtils.generateFilePath(mockEpisode, downloadDir);
            expect(filePath).toBe('/tmp/downloads/42_1001_2025-01-15.mp3');
        });
    });
    describe('generateTempFilename', () => {
        it('should generate temp filename with .tmp extension', () => {
            const tempFilename = FileNamingUtils.generateTempFilename(mockEpisode);
            expect(tempFilename).toBe('42_1001_2025-01-15.tmp');
        });
    });
    describe('parseFilename', () => {
        it('should parse valid filename correctly', () => {
            const filename = '42_1001_2025-01-15.mp3';
            const parsed = FileNamingUtils.parseFilename(filename);
            expect(parsed).toEqual({
                podcast_id: 42,
                episode_id: 1001,
                published_date: '2025-01-15',
            });
        });
        it('should return null for invalid filename', () => {
            const filename = 'invalid-filename.mp3';
            const parsed = FileNamingUtils.parseFilename(filename);
            expect(parsed).toBeNull();
        });
        it('should handle filename without extension', () => {
            const filename = '42_1001_2025-01-15';
            const parsed = FileNamingUtils.parseFilename(filename);
            expect(parsed).toEqual({
                podcast_id: 42,
                episode_id: 1001,
                published_date: '2025-01-15',
            });
        });
    });
    describe('isValidFilename', () => {
        it('should return true for valid filename', () => {
            const filename = '42_1001_2025-01-15.mp3';
            expect(FileNamingUtils.isValidFilename(filename)).toBe(true);
        });
        it('should return false for invalid filename', () => {
            const filename = 'invalid-filename.mp3';
            expect(FileNamingUtils.isValidFilename(filename)).toBe(false);
        });
    });
    describe('generateUniqueFilename', () => {
        it('should return original filename if not in existing files', () => {
            const original = '42_1001_2025-01-15.mp3';
            const existing = ['other-file.mp3'];
            const unique = FileNamingUtils.generateUniqueFilename(original, existing);
            expect(unique).toBe(original);
        });
        it('should generate unique filename when original exists', () => {
            const original = '42_1001_2025-01-15.mp3';
            const existing = ['42_1001_2025-01-15.mp3'];
            const unique = FileNamingUtils.generateUniqueFilename(original, existing);
            expect(unique).toBe('42_1001_2025-01-15_1.mp3');
        });
        it('should handle multiple conflicts', () => {
            const original = '42_1001_2025-01-15.mp3';
            const existing = [
                '42_1001_2025-01-15.mp3',
                '42_1001_2025-01-15_1.mp3',
                '42_1001_2025-01-15_2.mp3',
            ];
            const unique = FileNamingUtils.generateUniqueFilename(original, existing);
            expect(unique).toBe('42_1001_2025-01-15_3.mp3');
        });
    });
    describe('validateFilePath', () => {
        it('should return true for correct file path', () => {
            const filePath = '/downloads/42_1001_2025-01-15.mp3';
            const isValid = FileNamingUtils.validateFilePath(filePath, mockEpisode);
            expect(isValid).toBe(true);
        });
        it('should return false for incorrect file path', () => {
            const filePath = '/downloads/wrong-filename.mp3';
            const isValid = FileNamingUtils.validateFilePath(filePath, mockEpisode);
            expect(isValid).toBe(false);
        });
    });
});
//# sourceMappingURL=fileManagement.test.js.map