import { Episode, EpisodeDB } from '../../types';
export declare class EpisodesDAL {
    private static instance;
    private insertStatement;
    private updateStatement;
    private selectAllStatement;
    private selectByIdStatement;
    private selectByEpisodeIdStatement;
    private selectByStatusStatement;
    private selectByTitleAndDateStatement;
    private deleteStatement;
    static getInstance(): EpisodesDAL;
    private mapDbToEpisode;
    private mapEpisodeToDb;
    constructor();
    private initializeStatements;
    create(episode: Omit<Episode, 'id' | 'created_at' | 'updated_at'>): Episode;
    insert(episode: Omit<EpisodeDB, 'id' | 'created_at' | 'updated_at'>): Episode;
    insertMany(episodes: Omit<Episode, 'id' | 'created_at' | 'updated_at'>[]): Episode[];
    update(id: number, updates: Partial<Episode>): Episode | null;
    getAll(): Episode[];
    getById(id: number): Episode | null;
    getByEpisodeId(episodeId: number): Episode | null;
    getByStatus(status: Episode['status']): Episode[];
    delete(id: number): boolean;
    getPendingDownloads(): Episode[];
    getDownloading(): Episode[];
    getDownloaded(): Episode[];
    getFailed(): Episode[];
    exists(episodeId: number): boolean;
    findByTitleAndDate(title: string, publishedDate: string): Episode | null;
}
//# sourceMappingURL=episodes.d.ts.map