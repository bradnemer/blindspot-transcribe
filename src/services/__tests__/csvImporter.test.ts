import { parseCSV, validateEpisodeData } from '../csvImporter';

// Mock Papa Parse
jest.mock('papaparse', () => ({
  parse: jest.fn().mockImplementation((file, options) => {
    // Simulate successful parsing
    const mockData = [
      {
        title: 'Episode 1',
        published_date: '2023-01-01',
        audio_url: 'http://example.com/episode1.mp3',
        description: 'First episode',
        duration: '3600'
      },
      {
        title: 'Episode 2', 
        published_date: '2023-01-02',
        audio_url: 'http://example.com/episode2.mp3',
        description: 'Second episode',
        duration: '7200'
      }
    ];

    // Simulate Papa Parse behavior
    setTimeout(() => {
      if (options.step) {
        // Call step for each row
        mockData.forEach((row, index) => {
          options.step({ data: row, errors: [], meta: { cursor: index } });
        });
      }
      
      options.complete({
        data: mockData,
        errors: [],
        meta: { cursor: mockData.length }
      });
    }, 0);
  })
}));

describe('CSV Importer Service', () => {
  let mockFile: File;

  beforeEach(() => {
    // Create a mock CSV file
    const csvContent = `title,published_date,audio_url,description,duration
Episode 1,2023-01-01,http://example.com/episode1.mp3,First episode,3600
Episode 2,2023-01-02,http://example.com/episode2.mp3,Second episode,7200`;
    
    mockFile = new File([csvContent], 'test.csv', { type: 'text/csv' });
    jest.clearAllMocks();
  });

  describe('CSV Parsing', () => {
    it('should parse CSV file successfully', async () => {
      const result = await parseCSV(mockFile);
      
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Episode 1');
      expect(result[0].published_date).toBe('2023-01-01T00:00:00.000Z');
      expect(result[0].audio_url).toBe('http://example.com/episode1.mp3');
      expect(result[0].status).toBe('pending');
    });

    it('should handle progress callback during parsing', async () => {
      const progressCallback = jest.fn();
      
      await parseCSV(mockFile, progressCallback);
      
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should transform CSV headers correctly', async () => {
      // Test header normalization
      const result = await parseCSV(mockFile);
      
      // The transformer should normalize headers
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('published_date');
      expect(result[0]).toHaveProperty('audio_url');
    });

    it('should convert duration to number', async () => {
      const result = await parseCSV(mockFile);
      
      expect(typeof result[0].duration).toBe('number');
      expect(result[0].duration).toBe(3600);
    });

    it('should set default status to pending', async () => {
      const result = await parseCSV(mockFile);
      
      result.forEach(episode => {
        expect(episode.status).toBe('pending');
      });
    });
  });

  describe('CSV Parsing Errors', () => {
    it('should handle Papa Parse errors', async () => {
      const Papa = require('papaparse');
      Papa.parse.mockImplementationOnce((file, options) => {
        setTimeout(() => {
          options.complete({
            data: [],
            errors: [{ message: 'Parse error', row: 1 }],
            meta: { cursor: 0 }
          });
        }, 0);
      });

      await expect(parseCSV(mockFile)).rejects.toThrow('CSV parsing errors');
    });

    it('should handle empty CSV files', async () => {
      const Papa = require('papaparse');
      Papa.parse.mockImplementationOnce((file, options) => {
        setTimeout(() => {
          options.complete({
            data: [],
            errors: [],
            meta: { cursor: 0 }
          });
        }, 0);
      });

      await expect(parseCSV(mockFile)).rejects.toThrow('No valid episodes found');
    });
  });

  describe('Episode Data Validation', () => {
    const validEpisode = {
      title: 'Valid Episode',
      published_date: '2023-01-01T00:00:00.000Z',
      audio_url: 'http://example.com/episode.mp3',
      description: 'Valid description',
      duration: 3600,
      status: 'pending' as const
    };

    it('should validate valid episode data', () => {
      const result = validateEpisodeData(validEpisode);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject episode without title', () => {
      const episode = { ...validEpisode, title: '' };
      const result = validateEpisodeData(episode);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should reject episode without published date', () => {
      const episode = { ...validEpisode, published_date: '' };
      const result = validateEpisodeData(episode);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Published date is required');
    });

    it('should reject episode with invalid date format', () => {
      const episode = { ...validEpisode, published_date: 'invalid-date' };
      const result = validateEpisodeData(episode);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Published date must be in YYYY-MM-DD format');
    });

    it('should reject episode without audio URL', () => {
      const episode = { ...validEpisode, audio_url: '' };
      const result = validateEpisodeData(episode);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Audio URL is required');
    });

    it('should reject episode with invalid audio URL', () => {
      const episode = { ...validEpisode, audio_url: 'not-a-url' };
      const result = validateEpisodeData(episode);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Audio URL must be a valid URL');
    });

    it('should accept episode with missing optional fields', () => {
      const episode = {
        title: 'Episode',
        published_date: '2023-01-01',
        audio_url: 'http://example.com/episode.mp3',
        status: 'pending' as const
      };
      
      const result = validateEpisodeData(episode);
      expect(result.isValid).toBe(true);
    });

    it('should validate duration if provided', () => {
      const episodeWithInvalidDuration = { 
        ...validEpisode, 
        duration: -100 
      };
      
      const result = validateEpisodeData(episodeWithInvalidDuration);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duration must be a positive number');
    });

    it('should validate description length if provided', () => {
      const longDescription = 'a'.repeat(2001); // Assuming max length is 2000
      const episode = { ...validEpisode, description: longDescription };
      
      const result = validateEpisodeData(episode);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description must be less than 2000 characters');
    });
  });

  describe('Header Transformation', () => {
    it('should handle various header formats', async () => {
      const Papa = require('papaparse');
      Papa.parse.mockImplementationOnce((file, options) => {
        // Test the header transformation
        const testHeaders = [
          'Episode Title',
          'Published Date',
          'Audio URL',
          'episode title',
          'PUBLISHED_DATE',
          'audio-url'
        ];
        
        const transformedHeaders = testHeaders.map(header => 
          options.transformHeader(header)
        );
        
        expect(transformedHeaders).toContain('title');
        expect(transformedHeaders).toContain('published_date');
        expect(transformedHeaders).toContain('audio_url');
        
        // Complete the mock
        setTimeout(() => {
          options.complete({
            data: [],
            errors: [],
            meta: { cursor: 0 }
          });
        }, 0);
      });

      await parseCSV(mockFile);
    });
  });

  describe('Data Type Conversion', () => {
    it('should convert string duration to number', async () => {
      const Papa = require('papaparse');
      Papa.parse.mockImplementationOnce((file, options) => {
        const mockData = [{
          title: 'Test Episode',
          published_date: '2023-01-01',
          audio_url: 'http://example.com/test.mp3',
          duration: '1800' // String duration
        }];

        setTimeout(() => {
          options.complete({
            data: mockData,
            errors: [],
            meta: { cursor: 1 }
          });
        }, 0);
      });

      const result = await parseCSV(mockFile);
      expect(typeof result[0].duration).toBe('number');
      expect(result[0].duration).toBe(1800);
    });

    it('should handle invalid duration gracefully', async () => {
      const Papa = require('papaparse');
      Papa.parse.mockImplementationOnce((file, options) => {
        const mockData = [{
          title: 'Test Episode',
          published_date: '2023-01-01',
          audio_url: 'http://example.com/test.mp3',
          duration: 'invalid' // Invalid duration
        }];

        setTimeout(() => {
          options.complete({
            data: mockData,
            errors: [],
            meta: { cursor: 1 }
          });
        }, 0);
      });

      const result = await parseCSV(mockFile);
      expect(result[0].duration).toBeUndefined();
    });
  });

  describe('Large File Handling', () => {
    it('should handle large CSV files with streaming', async () => {
      const Papa = require('papaparse');
      const progressCallback = jest.fn();
      
      Papa.parse.mockImplementationOnce((file, options) => {
        // Simulate large file processing
        const totalRows = 1000;
        const batchSize = 100;
        
        for (let i = 0; i < totalRows; i += batchSize) {
          setTimeout(() => {
            if (options.step) {
              for (let j = 0; j < batchSize && i + j < totalRows; j++) {
                options.step({
                  data: {
                    title: `Episode ${i + j + 1}`,
                    published_date: '2023-01-01',
                    audio_url: `http://example.com/episode${i + j + 1}.mp3`
                  },
                  errors: [],
                  meta: { cursor: i + j + 1 }
                });
              }
            }
          }, i / batchSize);
        }
        
        setTimeout(() => {
          options.complete({
            data: [], // Data provided via step callback
            errors: [],
            meta: { cursor: totalRows }
          });
        }, Math.ceil(totalRows / batchSize));
      });

      const result = await parseCSV(mockFile, progressCallback);
      expect(progressCallback).toHaveBeenCalledTimes(1000); // Once per row
      expect(result.length).toBe(1000);
    });
  });
});