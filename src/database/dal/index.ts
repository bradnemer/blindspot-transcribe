import { EpisodesDAL } from './episodes';
import { SettingsDAL } from './settings';

export class DatabaseDAL {
  public episodes = new EpisodesDAL();
  public settings = new SettingsDAL();
}

// Export singleton instance
export const dal = new DatabaseDAL();

// Export individual DAL classes
export { EpisodesDAL, SettingsDAL };