import {
  sanitizeFileName,
  generateUniqueFileName,
  getFileExtension,
  changeFileExtension,
  isValidFileName,
  createDownloadPath
} from '../fileNaming';

describe('File Naming Utilities', () => {
  describe('sanitizeFileName', () => {
    it('should remove invalid characters', () => {
      const input = 'My<Episode>Title:With|Invalid*Chars?.mp3';
      const result = sanitizeFileName(input);
      expect(result).toBe('MyEpisodeTitleWithInvalidChars.mp3');
    });

    it('should replace spaces with underscores', () => {
      const input = 'Episode Title With Spaces.mp3';
      const result = sanitizeFileName(input);
      expect(result).toBe('Episode_Title_With_Spaces.mp3');
    });

    it('should truncate long filenames', () => {
      const input = 'a'.repeat(300) + '.mp3';
      const result = sanitizeFileName(input);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result).toEndWith('.mp3');
    });

    it('should handle empty strings', () => {
      const result = sanitizeFileName('');
      expect(result).toBe('untitled');
    });

    it('should handle filenames with only invalid characters', () => {
      const result = sanitizeFileName('<>:"|?*');
      expect(result).toBe('untitled');
    });

    it('should preserve valid characters', () => {
      const input = 'ValidFileName123-_.mp3';
      const result = sanitizeFileName(input);
      expect(result).toBe('ValidFileName123-_.mp3');
    });
  });

  describe('generateUniqueFileName', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should generate unique filename with timestamp', () => {
      const baseName = 'episode.mp3';
      const result = generateUniqueFileName(baseName);
      expect(result).toMatch(/^episode_\d+_[a-z0-9]+\.mp3$/);
    });

    it('should handle filenames without extension', () => {
      const baseName = 'episode';
      const result = generateUniqueFileName(baseName);
      expect(result).toMatch(/^episode_\d+_[a-z0-9]+$/);
    });

    it('should use custom separator', () => {
      const baseName = 'episode.mp3';
      const result = generateUniqueFileName(baseName, '-');
      expect(result).toMatch(/^episode-\d+-[a-z0-9]+\.mp3$/);
    });

    it('should use custom timestamp', () => {
      const baseName = 'episode.mp3';
      const customTimestamp = 9876543210;
      const result = generateUniqueFileName(baseName, '_', customTimestamp);
      expect(result).toContain('9876543210');
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('file.mp3')).toBe('.mp3');
      expect(getFileExtension('file.txt')).toBe('.txt');
      expect(getFileExtension('file.tar.gz')).toBe('.gz');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('filename')).toBe('');
      expect(getFileExtension('file.')).toBe('');
    });

    it('should handle hidden files', () => {
      expect(getFileExtension('.gitignore')).toBe('');
      expect(getFileExtension('.env.local')).toBe('.local');
    });

    it('should handle paths with directories', () => {
      expect(getFileExtension('/path/to/file.mp3')).toBe('.mp3');
      expect(getFileExtension('dir/file.txt')).toBe('.txt');
    });
  });

  describe('changeFileExtension', () => {
    it('should change file extension', () => {
      expect(changeFileExtension('file.mp3', '.wav')).toBe('file.wav');
      expect(changeFileExtension('file.txt', '.md')).toBe('file.md');
    });

    it('should add extension to files without one', () => {
      expect(changeFileExtension('filename', '.mp3')).toBe('filename.mp3');
    });

    it('should handle extensions without dot', () => {
      expect(changeFileExtension('file.mp3', 'wav')).toBe('file.wav');
    });

    it('should handle paths with directories', () => {
      expect(changeFileExtension('/path/to/file.mp3', '.wav')).toBe('/path/to/file.wav');
    });

    it('should handle empty extension', () => {
      expect(changeFileExtension('file.mp3', '')).toBe('file');
    });
  });

  describe('isValidFileName', () => {
    it('should validate correct filenames', () => {
      expect(isValidFileName('valid_file.mp3')).toBe(true);
      expect(isValidFileName('episode-123.wav')).toBe(true);
      expect(isValidFileName('My Episode.mp3')).toBe(true);
    });

    it('should reject filenames with invalid characters', () => {
      expect(isValidFileName('file<.mp3')).toBe(false);
      expect(isValidFileName('file>.mp3')).toBe(false);
      expect(isValidFileName('file:.mp3')).toBe(false);
      expect(isValidFileName('file|.mp3')).toBe(false);
      expect(isValidFileName('file?.mp3')).toBe(false);
      expect(isValidFileName('file*.mp3')).toBe(false);
      expect(isValidFileName('file".mp3')).toBe(false);
    });

    it('should reject reserved names on Windows', () => {
      expect(isValidFileName('CON.mp3')).toBe(false);
      expect(isValidFileName('PRN.wav')).toBe(false);
      expect(isValidFileName('AUX.txt')).toBe(false);
      expect(isValidFileName('NUL.log')).toBe(false);
      expect(isValidFileName('COM1.dat')).toBe(false);
      expect(isValidFileName('LPT2.doc')).toBe(false);
    });

    it('should reject empty or whitespace-only names', () => {
      expect(isValidFileName('')).toBe(false);
      expect(isValidFileName('   ')).toBe(false);
      expect(isValidFileName('\t\n')).toBe(false);
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(256) + '.mp3';
      expect(isValidFileName(longName)).toBe(false);
    });

    it('should accept names at the length limit', () => {
      const maxLengthName = 'a'.repeat(251) + '.mp3'; // 255 total chars
      expect(isValidFileName(maxLengthName)).toBe(true);
    });
  });

  describe('createDownloadPath', () => {
    it('should create download path with episode info', () => {
      const episode = {
        id: 1,
        title: 'My Test Episode',
        published_date: '2023-01-15',
        audio_url: 'http://example.com/episode.mp3',
        status: 'pending' as const
      };
      
      const result = createDownloadPath(episode, '/downloads');
      expect(result).toBe('/downloads/My_Test_Episode.mp3');
    });

    it('should handle episodes without audio_url extension', () => {
      const episode = {
        id: 1,
        title: 'Test Episode',
        published_date: '2023-01-15',
        audio_url: 'http://example.com/episode',
        status: 'pending' as const
      };
      
      const result = createDownloadPath(episode, '/downloads');
      expect(result).toBe('/downloads/Test_Episode.mp3');
    });

    it('should sanitize episode title', () => {
      const episode = {
        id: 1,
        title: 'Episode: With | Invalid * Characters?',
        published_date: '2023-01-15',
        audio_url: 'http://example.com/episode.mp3',
        status: 'pending' as const
      };
      
      const result = createDownloadPath(episode, '/downloads');
      expect(result).toBe('/downloads/Episode_With_Invalid_Characters.mp3');
    });

    it('should use custom extension', () => {
      const episode = {
        id: 1,
        title: 'Test Episode',
        published_date: '2023-01-15',
        audio_url: 'http://example.com/episode.wav',
        status: 'pending' as const
      };
      
      const result = createDownloadPath(episode, '/downloads', '.wav');
      expect(result).toBe('/downloads/Test_Episode.wav');
    });

    it('should handle missing title', () => {
      const episode = {
        id: 1,
        title: '',
        published_date: '2023-01-15',
        audio_url: 'http://example.com/episode.mp3',
        status: 'pending' as const
      };
      
      const result = createDownloadPath(episode, '/downloads');
      expect(result).toBe('/downloads/untitled.mp3');
    });

    it('should include podcast name if provided', () => {
      const episode = {
        id: 1,
        title: 'Test Episode',
        published_date: '2023-01-15',
        audio_url: 'http://example.com/episode.mp3',
        status: 'pending' as const
      };
      
      const result = createDownloadPath(episode, '/downloads', '.mp3', 'My Podcast');
      expect(result).toBe('/downloads/My_Podcast_-_Test_Episode.mp3');
    });

    it('should handle date in filename when requested', () => {
      const episode = {
        id: 1,
        title: 'Test Episode',
        published_date: '2023-01-15T10:30:00Z',
        audio_url: 'http://example.com/episode.mp3',
        status: 'pending' as const
      };
      
      const result = createDownloadPath(episode, '/downloads', '.mp3', undefined, true);
      expect(result).toContain('2023-01-15');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined inputs gracefully', () => {
      expect(() => sanitizeFileName(undefined as any)).not.toThrow();
      expect(() => getFileExtension(undefined as any)).not.toThrow();
      expect(() => isValidFileName(undefined as any)).not.toThrow();
    });

    it('should handle null inputs gracefully', () => {
      expect(() => sanitizeFileName(null as any)).not.toThrow();
      expect(() => getFileExtension(null as any)).not.toThrow();
      expect(() => isValidFileName(null as any)).not.toThrow();
    });
  });
});