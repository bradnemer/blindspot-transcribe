export declare class MigrationManager {
    private migrations;
    private createMigrationsTable;
    private getCurrentVersion;
    private recordMigration;
    private removeMigration;
    migrate(): void;
    rollback(targetVersion?: number): void;
    getStatus(): {
        version: number;
        name: string;
        applied_at: string;
    }[];
    reset(): void;
}
export declare const migrationManager: MigrationManager;
//# sourceMappingURL=migrations.d.ts.map