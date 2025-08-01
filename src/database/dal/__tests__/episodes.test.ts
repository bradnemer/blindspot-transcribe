import { EpisodesDAL } from '../episodes';
import { Episode } from '../../../types';

// Mock the database connection
jest.mock('../../connection', () => ({
  db: {
    prepare: jest.fn().mockReturnValue({
      run: jest.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
      get: jest.fn().mockReturnValue(null),
      all: jest.fn().mockReturnValue([]),
    }),
    transaction: jest.fn().mockImplementation((fn) => fn),
  }
}));

// Mock the services
jest.mock('../../../services/performance', () => ({
  performanceMonitor: {
    markDatabaseOperation: jest.fn().mockReturnValue('timing-id'),
    endTiming: jest.fn(),
  }
}));

jest.mock('../../../services/logger', () => ({
  logger: {
    logDatabaseOperation: jest.fn(),
  }
}));

describe('EpisodesDAL', () => {
  let episodesDAL: EpisodesDAL;
  let mockDb: any;

  beforeEach(() => {
    // Clear all mocks and reset singleton
    jest.clearAllMocks();
    (EpisodesDAL as any).instance = undefined;
    
    episodesDAL = EpisodesDAL.getInstance();
    mockDb = require('../../connection').db;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const dal1 = EpisodesDAL.getInstance();
      const dal2 = EpisodesDAL.getInstance();
      
      expect(dal1).toBe(dal2);
    });
  });

  describe('Database Initialization', () => {
    it('should initialize prepared statements', () => {
      expect(mockDb.prepare).toHaveBeenCalledTimes(7); // Number of prepared statements
    });
  });

  describe('Create Operations', () => {
    const mockEpisode = {
      title: 'Test Episode',
      published_date: '2023-01-01',
      audio_url: 'http://example.com/episode.mp3',
      status: 'pending' as const
    };

    it('should create a new episode', () => {
      const mockInsertResult = { lastInsertRowid: 123, changes: 1 };
      const mockSelectResult = {
        id: 123,
        episode_title: 'Test Episode',
        published_date: '2023-01-01',
        audio_url: 'http://example.com/episode.mp3',
        download_status: 'pending',
        download_progress: 0,
        file_path: null,
        error_message: null,
        retry_count: 0,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockDb.prepare().run.mockReturnValueOnce(mockInsertResult);
      mockDb.prepare().get.mockReturnValueOnce(mockSelectResult);

      const result = episodesDAL.create(mockEpisode);

      expect(result).toBeDefined();
      expect(result.id).toBe(123);
      expect(result.title).toBe('Test Episode');
      expect(result.status).toBe('pending');
    });

    it('should generate unique episode IDs', () => {
      const originalDate = Date.now;
      const originalRandom = Math.random;
      
      Date.now = jest.fn().mockReturnValue(1640995200000); // Fixed timestamp
      Math.random = jest.fn().mockReturnValue(0.5); // Fixed random

      episodesDAL.create(mockEpisode);

      const runCall = mockDb.prepare().run.mock.calls[0];
      expect(runCall[0]).toBe(1640995200500); // timestamp + random * 1000

      Date.now = originalDate;
      Math.random = originalRandom;
    });

    it('should create multiple episodes in transaction', () => {
      const episodes = [
        { ...mockEpisode, title: 'Episode 1' },
        { ...mockEpisode, title: 'Episode 2' }
      ];

      const mockResults = episodes.map((_, index) => ({
        id: index + 1,
        episode_title: `Episode ${index + 1}`,
        published_date: '2023-01-01',
        audio_url: 'http://example.com/episode.mp3',
        download_status: 'pending',
        download_progress: 0,
        file_path: null,
        error_message: null,
        retry_count: 0,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }));

      mockDb.prepare().get
        .mockReturnValueOnce(mockResults[0])
        .mockReturnValueOnce(mockResults[1]);

      const results = episodesDAL.insertMany(episodes);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Episode 1');
      expect(results[1].title).toBe('Episode 2');
    });
  });

  describe('Read Operations', () => {
    const mockDbEpisode = {
      id: 1,
      episode_title: 'Test Episode',
      published_date: '2023-01-01',
      audio_url: 'http://example.com/episode.mp3',
      download_status: 'pending',
      download_progress: 0,
      file_path: null,
      error_message: null,
      retry_count: 0,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    it('should get all episodes', () => {
      mockDb.prepare().all.mockReturnValueOnce([mockDbEpisode]);

      const episodes = episodesDAL.getAll();

      expect(episodes).toHaveLength(1);
      expect(episodes[0].id).toBe(1);
      expect(episodes[0].title).toBe('Test Episode');
    });

    it('should get episode by ID', () => {
      mockDb.prepare().get.mockReturnValueOnce(mockDbEpisode);

      const episode = episodesDAL.getById(1);

      expect(episode).toBeDefined();
      expect(episode!.id).toBe(1);
      expect(episode!.title).toBe('Test Episode');
    });

    it('should return null for non-existent episode', () => {
      mockDb.prepare().get.mockReturnValueOnce(undefined);

      const episode = episodesDAL.getById(999);

      expect(episode).toBeNull();
    });

    it('should get episodes by status', () => {
      mockDb.prepare().all.mockReturnValueOnce([mockDbEpisode]);

      const episodes = episodesDAL.getByStatus('pending');

      expect(episodes).toHaveLength(1);
      expect(episodes[0].status).toBe('pending');
    });

    it('should find episode by title and date', () => {
      mockDb.prepare().get.mockReturnValueOnce(mockDbEpisode);

      const episode = episodesDAL.findByTitleAndDate('Test Episode', '2023-01-01');

      expect(episode).toBeDefined();
      expect(episode!.title).toBe('Test Episode');
      expect(episode!.published_date).toBe('2023-01-01');
    });
  });

  describe('Update Operations', () => {
    const mockDbEpisode = {
      id: 1,
      episode_title: 'Test Episode',
      published_date: '2023-01-01',
      audio_url: 'http://example.com/episode.mp3',
      download_status: 'pending',
      download_progress: 0,
      file_path: null,
      error_message: null,
      retry_count: 0,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    it('should update episode successfully', () => {
      // Mock getting current episode
      mockDb.prepare().get
        .mockReturnValueOnce(mockDbEpisode) // For current episode check
        .mockReturnValueOnce({ // For updated episode return
          ...mockDbEpisode,
          download_status: 'downloading',
          download_progress: 50
        });

      const updates = { status: 'downloading' as const, download_progress: 50 };
      const result = episodesDAL.update(1, updates);

      expect(mockDb.prepare().run).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result!.status).toBe('downloading');
    });

    it('should return null when updating non-existent episode', () => {
      mockDb.prepare().get.mockReturnValueOnce(null);

      const result = episodesDAL.update(999, { status: 'failed' });

      expect(result).toBeNull();
    });

    it('should preserve existing values when updating partial data', () => {
      const currentEpisode = {
        ...mockDbEpisode,
        download_progress: 25,
        error_message: 'Previous error'
      };

      mockDb.prepare().get
        .mockReturnValueOnce(currentEpisode)
        .mockReturnValueOnce({
          ...currentEpisode,
          download_status: 'downloading'
        });

      const result = episodesDAL.update(1, { status: 'downloading' });

      const runCall = mockDb.prepare().run.mock.calls[0];
      expect(runCall[0]).toBe('downloading'); // status
      expect(runCall[1]).toBe(25); // preserved progress
      expect(runCall[4]).toBe('Previous error'); // preserved error
    });
  });

  describe('Delete Operations', () => {
    it('should delete episode successfully', () => {
      mockDb.prepare().run.mockReturnValueOnce({ changes: 1 });

      const result = episodesDAL.delete(1);

      expect(result).toBe(true);
      expect(mockDb.prepare().run).toHaveBeenCalledWith(1);
    });

    it('should return false when deleting non-existent episode', () => {
      mockDb.prepare().run.mockReturnValueOnce({ changes: 0 });

      const result = episodesDAL.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('Status-Based Queries', () => {
    const mockEpisodes = [
      { ...mockDbEpisode, id: 1, download_status: 'pending' },
      { ...mockDbEpisode, id: 2, download_status: 'downloading' },
      { ...mockDbEpisode, id: 3, download_status: 'downloaded' },
      { ...mockDbEpisode, id: 4, download_status: 'failed' }
    ];

    it('should get pending downloads', () => {
      mockDb.prepare().all.mockReturnValueOnce([mockEpisodes[0]]);

      const episodes = episodesDAL.getPendingDownloads();

      expect(episodes).toHaveLength(1);
      expect(episodes[0].status).toBe('pending');
    });

    it('should get downloading episodes', () => {
      mockDb.prepare().all.mockReturnValueOnce([mockEpisodes[1]]);

      const episodes = episodesDAL.getDownloading();

      expect(episodes).toHaveLength(1);
      expect(episodes[0].status).toBe('downloading');
    });

    it('should get downloaded episodes', () => {
      mockDb.prepare().all.mockReturnValueOnce([mockEpisodes[2]]);

      const episodes = episodesDAL.getDownloaded();

      expect(episodes).toHaveLength(1);
      expect(episodes[0].status).toBe('downloaded');
    });

    it('should get failed episodes', () => {
      mockDb.prepare().all.mockReturnValueOnce([mockEpisodes[3]]);

      const episodes = episodesDAL.getFailed();

      expect(episodes).toHaveLength(1);
      expect(episodes[0].status).toBe('failed');
    });
  });

  describe('Data Mapping', () => {
    const mockDbEpisode = {
      id: 1,
      episode_title: 'Test Episode',
      published_date: '2023-01-01',
      audio_url: 'http://example.com/episode.mp3',
      download_status: 'pending',
      download_progress: 25,
      file_path: '/path/to/file.mp3',
      error_message: 'Test error',
      retry_count: 2,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T12:00:00Z'
    };

    it('should map database fields to frontend format', () => {
      mockDb.prepare().get.mockReturnValueOnce(mockDbEpisode);

      const episode = episodesDAL.getById(1);

      expect(episode).toBeDefined();
      expect(episode!.id).toBe(mockDbEpisode.id);
      expect(episode!.title).toBe(mockDbEpisode.episode_title);
      expect(episode!.published_date).toBe(mockDbEpisode.published_date);
      expect(episode!.audio_url).toBe(mockDbEpisode.audio_url);
      expect(episode!.status).toBe(mockDbEpisode.download_status);
      expect(episode!.download_progress).toBe(mockDbEpisode.download_progress);
      expect(episode!.local_file_path).toBe(mockDbEpisode.file_path);
      expect(episode!.error_message).toBe(mockDbEpisode.error_message);
      expect(episode!.retry_count).toBe(mockDbEpisode.retry_count);
      expect(episode!.created_at).toBe(mockDbEpisode.created_at);
      expect(episode!.updated_at).toBe(mockDbEpisode.updated_at);
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      episodesDAL.enableCache(true);
    });

    it('should cache query results', () => {
      const mockEpisode = {
        id: 1,
        episode_title: 'Cached Episode',
        published_date: '2023-01-01',
        audio_url: 'http://example.com/episode.mp3',
        download_status: 'pending',
        download_progress: 0,
        file_path: null,
        error_message: null,
        retry_count: 0,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockDb.prepare().get.mockReturnValueOnce(mockEpisode);

      // First call - should hit database
      const episode1 = episodesDAL.getById(1);
      expect(mockDb.prepare().get).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const episode2 = episodesDAL.getById(1);
      expect(mockDb.prepare().get).toHaveBeenCalledTimes(1); // Still only 1 call

      expect(episode1).toEqual(episode2);
    });

    it('should invalidate cache on updates', () => {
      const mockEpisode = {
        id: 1,
        episode_title: 'Test Episode',
        published_date: '2023-01-01',
        audio_url: 'http://example.com/episode.mp3',
        download_status: 'pending',
        download_progress: 0,
        file_path: null,
        error_message: null,
        retry_count: 0,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock sequence: get for cache, get for update check, get for updated result, get for new cache
      mockDb.prepare().get
        .mockReturnValueOnce(mockEpisode) // Initial cache
        .mockReturnValueOnce(mockEpisode) // Update operation check
        .mockReturnValueOnce({ ...mockEpisode, download_status: 'downloading' }) // Update result
        .mockReturnValueOnce({ ...mockEpisode, download_status: 'downloading' }); // New cache

      // Get episode (cache it)
      episodesDAL.getById(1);

      // Update episode (should invalidate cache)
      episodesDAL.update(1, { status: 'downloading' });

      // Get episode again (should fetch fresh data)
      const updatedEpisode = episodesDAL.getById(1);

      expect(updatedEpisode!.status).toBe('downloading');
    });

    it('should allow disabling cache', () => {
      episodesDAL.enableCache(false);

      const mockEpisode = {
        id: 1,
        episode_title: 'No Cache Episode',
        published_date: '2023-01-01',
        audio_url: 'http://example.com/episode.mp3',
        download_status: 'pending',
        download_progress: 0,
        file_path: null,
        error_message: null,
        retry_count: 0,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockDb.prepare().get
        .mockReturnValueOnce(mockEpisode)
        .mockReturnValueOnce(mockEpisode);

      // Both calls should hit database
      episodesDAL.getById(1);
      episodesDAL.getById(1);

      expect(mockDb.prepare().get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track database operation performance', () => {
      const performanceMonitor = require('../../../services/performance').performanceMonitor;

      episodesDAL.getAll();

      expect(performanceMonitor.markDatabaseOperation).toHaveBeenCalledWith('SELECT', 'episodes');
      expect(performanceMonitor.endTiming).toHaveBeenCalledWith('timing-id');
    });
  });

  describe('Logging Integration', () => {
    it('should log database operations', () => {
      const logger = require('../../../services/logger').logger;

      episodesDAL.getAll();

      expect(logger.logDatabaseOperation).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should check if episode exists', () => {
      const mockEpisode = {
        id: 1,
        episode_title: 'Existing Episode',
        published_date: '2023-01-01',
        audio_url: 'http://example.com/episode.mp3',
        download_status: 'pending',
        download_progress: 0,
        file_path: null,
        error_message: null,
        retry_count: 0,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockDb.prepare().get.mockReturnValueOnce(mockEpisode);

      const exists = episodesDAL.exists(1);
      expect(exists).toBe(true);

      mockDb.prepare().get.mockReturnValueOnce(null);
      const notExists = episodesDAL.exists(999);
      expect(notExists).toBe(false);
    });
  });
});