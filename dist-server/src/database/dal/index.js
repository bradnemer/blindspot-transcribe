import { EpisodesDAL } from './episodes';
import { SettingsDAL } from './settings';
export class DatabaseDAL {
    episodes;
    settings;
    constructor() {
        this.episodes = new EpisodesDAL();
        this.settings = new SettingsDAL();
    }
}
// Create singleton instance lazily
let dalInstance = null;
export const dal = {
    get episodes() {
        if (!dalInstance)
            dalInstance = new DatabaseDAL();
        return dalInstance.episodes;
    },
    get settings() {
        if (!dalInstance)
            dalInstance = new DatabaseDAL();
        return dalInstance.settings;
    }
};
// Export individual DAL classes
export { EpisodesDAL, SettingsDAL };
