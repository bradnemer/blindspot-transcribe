import Database from 'better-sqlite3';
export declare class DatabaseConnection {
    private static instance;
    static getInstance(): Database.Database;
    static close(): void;
    static reset(): void;
}
export declare const db: Database.Database;
//# sourceMappingURL=connection.d.ts.map