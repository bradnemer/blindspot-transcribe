import { Settings } from '../../types';
export declare class SettingsDAL {
    private selectStatement;
    private selectAllStatement;
    private insertOrUpdateStatement;
    private deleteStatement;
    constructor();
    private initializeStatements;
    get(key: string): string | null;
    getAll(): Record<string, string>;
    set(key: string, value: string): void;
    setMany(settings: Record<string, string>): void;
    delete(key: string): boolean;
    getSettings(): Settings;
    updateSettings(settings: Partial<Settings>): void;
    getDownloadDirectory(): string;
    getMaxConcurrentDownloads(): number;
    getRetryAttempts(): number;
    getRetryDelaySeconds(): number;
}
//# sourceMappingURL=settings.d.ts.map