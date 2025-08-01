import { EpisodesDAL } from '../dal/episodes';
import { Episode } from '../../types';
import { db } from '../connection';
import { createTables } from '../schema';

describe('EpisodesDAL', () => {
  let episodesDAL: EpisodesDAL;

  beforeAll(() => {
    // Use in-memory database for testing
    createTables();
    episodesDAL = new EpisodesDAL();
  });

  beforeEach(() => {
    // Clear episodes table before each test
    db.exec('DELETE FROM episodes');
  });

  afterAll(() => {
    db.close();
  });

  const mockEpisode: Omit<Episode, 'id' | 'created_at' | 'updated_at'> = {
    episode_id: 1001,
    podcast_id: 1,
    podcast_name: 'Test Podcast',
    episode_title: 'Test Episode',
    published_date: '2025-01-01T00:00:00.000Z',
    audio_url: 'https://example.com/episode.mp3',
    download_status: 'pending',
    download_progress: 0,
    retry_count: 0,
  };

  describe('insert', () => {
    it('should insert a new episode', () => {
      const episode = episodesDAL.insert(mockEpisode);

      expect(episode).toMatchObject(mockEpisode);
      expect(episode.id).toBeDefined();
      expect(episode.created_at).toBeDefined();
      expect(episode.updated_at).toBeDefined();
    });

    it('should handle duplicate episode_id', () => {
      episodesDAL.insert(mockEpisode);
      
      expect(() => {
        episodesDAL.insert(mockEpisode);
      }).toThrow();
    });
  });

  describe('insertMany', () => {
    it('should insert multiple episodes', () => {
      const episodes = [
        { ...mockEpisode, episode_id: 1001 },
        { ...mockEpisode, episode_id: 1002 },
        { ...mockEpisode, episode_id: 1003 },
      ];

      const insertedEpisodes = episodesDAL.insertMany(episodes);

      expect(insertedEpisodes).toHaveLength(3);
      expect(insertedEpisodes[0].episode_id).toBe(1001);
      expect(insertedEpisodes[1].episode_id).toBe(1002);
      expect(insertedEpisodes[2].episode_id).toBe(1003);
    });
  });

  describe('getById', () => {
    it('should retrieve episode by id', () => {
      const inserted = episodesDAL.insert(mockEpisode);
      const retrieved = episodesDAL.getById(inserted.id!);

      expect(retrieved).toEqual(inserted);
    });

    it('should return null for non-existent id', () => {
      const result = episodesDAL.getById(999);
      expect(result).toBeNull();
    });
  });

  describe('getByEpisodeId', () => {
    it('should retrieve episode by episode_id', () => {
      const inserted = episodesDAL.insert(mockEpisode);
      const retrieved = episodesDAL.getByEpisodeId(mockEpisode.episode_id);

      expect(retrieved).toEqual(inserted);
    });

    it('should return null for non-existent episode_id', () => {
      const result = episodesDAL.getByEpisodeId(999);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update episode fields', () => {
      const inserted = episodesDAL.insert(mockEpisode);
      const updates = {
        download_status: 'downloaded' as const,
        download_progress: 100,
        file_path: '/path/to/file.mp3',
      };

      const updated = episodesDAL.update(inserted.id!, updates);

      expect(updated).toMatchObject(updates);
      expect(updated!.updated_at).not.toBe(inserted.updated_at);
    });

    it('should return null for non-existent episode', () => {
      const result = episodesDAL.update(999, { download_status: 'downloaded' });
      expect(result).toBeNull();
    });
  });

  describe('getByStatus', () => {
    beforeEach(() => {
      episodesDAL.insertMany([
        { ...mockEpisode, episode_id: 1001, download_status: 'pending' },
        { ...mockEpisode, episode_id: 1002, download_status: 'downloading' },
        { ...mockEpisode, episode_id: 1003, download_status: 'downloaded' },
        { ...mockEpisode, episode_id: 1004, download_status: 'failed' },
      ]);
    });

    it('should get pending episodes', () => {
      const pending = episodesDAL.getPendingDownloads();
      expect(pending).toHaveLength(1);
      expect(pending[0].download_status).toBe('pending');
    });

    it('should get downloading episodes', () => {
      const downloading = episodesDAL.getDownloading();
      expect(downloading).toHaveLength(1);
      expect(downloading[0].download_status).toBe('downloading');
    });

    it('should get downloaded episodes', () => {
      const downloaded = episodesDAL.getDownloaded();
      expect(downloaded).toHaveLength(1);
      expect(downloaded[0].download_status).toBe('downloaded');
    });

    it('should get failed episodes', () => {
      const failed = episodesDAL.getFailed();
      expect(failed).toHaveLength(1);
      expect(failed[0].download_status).toBe('failed');
    });
  });

  describe('exists', () => {
    it('should return true for existing episode', () => {
      episodesDAL.insert(mockEpisode);
      expect(episodesDAL.exists(mockEpisode.episode_id)).toBe(true);
    });

    it('should return false for non-existent episode', () => {
      expect(episodesDAL.exists(999)).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing episode', () => {
      const inserted = episodesDAL.insert(mockEpisode);
      const deleted = episodesDAL.delete(inserted.id!);

      expect(deleted).toBe(true);
      expect(episodesDAL.getById(inserted.id!)).toBeNull();
    });

    it('should return false for non-existent episode', () => {
      const deleted = episodesDAL.delete(999);
      expect(deleted).toBe(false);
    });
  });
});