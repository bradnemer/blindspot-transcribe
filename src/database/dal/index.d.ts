import { EpisodesDAL } from './episodes';
import { SettingsDAL } from './settings';
export declare class DatabaseDAL {
    episodes: EpisodesDAL;
    settings: SettingsDAL;
    constructor();
}
export declare const dal: {
    readonly episodes: EpisodesDAL;
    readonly settings: SettingsDAL;
};
export { EpisodesDAL, SettingsDAL };
//# sourceMappingURL=index.d.ts.map