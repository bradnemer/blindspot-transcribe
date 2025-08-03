import { CSVParser } from '../csvParser';

describe('CSVParser', () => {
  const validCSVContent = `Episode ID,Podcast ID,Podcast Name,Episode Title,Published Date,Audio URL
1001,1,"Test Podcast","Episode 1","2025-01-01T00:00:00.000Z","https://example.com/episode1.mp3"
1002,1,"Test Podcast","Episode 2","2025-01-02T00:00:00.000Z","https://example.com/episode2.mp3"
1003,2,"Another Podcast","Episode 3","2025-01-03T00:00:00.000Z","https://example.com/episode3.mp3"`;

  const invalidCSVContent = `Episode ID,Podcast ID,Podcast Name,Episode Title,Published Date,Audio URL
,1,"Test Podcast","Episode 1","2025-01-01T00:00:00.000Z","https://example.com/episode1.mp3"
1002,,"Test Podcast","Episode 2","2025-01-02T00:00:00.000Z","https://example.com/episode2.mp3"
1003,2,"","Episode 3","2025-01-03T00:00:00.000Z","https://example.com/episode3.mp3"`;

  const duplicateCSVContent = `Episode ID,Podcast ID,Podcast Name,Episode Title,Published Date,Audio URL
1001,1,"Test Podcast","Episode 1","2025-01-01T00:00:00.000Z","https://example.com/episode1.mp3"
1001,1,"Test Podcast","Episode 1 Duplicate","2025-01-01T00:00:00.000Z","https://example.com/episode1.mp3"
1002,1,"Test Podcast","Episode 2","2025-01-02T00:00:00.000Z","https://example.com/episode2.mp3"`;

  describe('parseText', () => {
    it('should parse valid CSV content', () => {
      const result = CSVParser.parseText(validCSVContent);
      
      expect(result.success).toBe(true);
      expect(result.episodes).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.validRows).toBe(3);
      expect(result.totalRows).toBe(3);

      // Check first episode
      expect(result.episodes[0]).toMatchObject({
        episode_id: 1001,
        podcast_id: 1,
        podcast_name: 'Test Podcast',
        episode_title: 'Episode 1',
        published_date: '2025-01-01T00:00:00.000Z',
        audio_url: 'https://example.com/episode1.mp3',
        download_status: 'pending',
        download_progress: 0,
        retry_count: 0,
      });
    });

    it('should handle invalid CSV content', () => {
      const result = CSVParser.parseText(invalidCSVContent);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.episodes).toHaveLength(0);
    });

    it('should handle duplicate episode IDs', () => {
      const result = CSVParser.parseText(duplicateCSVContent);
      
      expect(result.success).toBe(true);
      expect(result.episodes).toHaveLength(2); // Duplicates removed
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Duplicate episode ID');
    });

    it('should validate required headers', () => {
      const invalidHeaders = 'Wrong,Headers,Here\n1,2,3';
      const result = CSVParser.parseText(invalidHeaders);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('Missing required column'))).toBe(true);
    });

    it('should handle empty CSV files', () => {
      const result = CSVParser.parseText('');
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid dates', () => {
      const invalidDateCSV = `Episode ID,Podcast ID,Podcast Name,Episode Title,Published Date,Audio URL
1001,1,"Test Podcast","Episode 1","invalid-date","https://example.com/episode1.mp3"`;
      
      const result = CSVParser.parseText(invalidDateCSV);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('not a valid date'))).toBe(true);
    });

    it('should handle invalid URLs', () => {
      const invalidUrlCSV = `Episode ID,Podcast ID,Podcast Name,Episode Title,Published Date,Audio URL
1001,1,"Test Podcast","Episode 1","2025-01-01T00:00:00.000Z","not-a-valid-url"`;
      
      const result = CSVParser.parseText(invalidUrlCSV);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('not a valid URL'))).toBe(true);
    });

    it('should handle missing required fields', () => {
      const missingFieldsCSV = `Episode ID,Podcast ID,Podcast Name,Episode Title,Published Date,Audio URL
1001,,"Test Podcast","","2025-01-01T00:00:00.000Z","https://example.com/episode1.mp3"`;
      
      const result = CSVParser.parseText(missingFieldsCSV);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('Podcast ID is required'))).toBe(true);
      expect(result.errors.some(error => error.includes('Episode Title is required'))).toBe(true);
    });
  });

  describe('validateHeaders', () => {
    it('should validate correct headers', () => {
      const headers = ['Episode ID', 'Podcast ID', 'Podcast Name', 'Episode Title', 'Published Date', 'Audio URL'];
      const result = CSVParser.validateHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing headers', () => {
      const headers = ['Episode ID', 'Podcast Name', 'Episode Title'];
      const result = CSVParser.validateHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('Missing required column: Podcast ID'))).toBe(true);
    });

    it('should handle extra headers', () => {
      const headers = ['Episode ID', 'Podcast ID', 'Podcast Name', 'Episode Title', 'Published Date', 'Audio URL', 'Extra Column'];
      const result = CSVParser.validateHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});