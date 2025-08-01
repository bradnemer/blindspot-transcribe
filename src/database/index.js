import { DatabaseConnection, db } from './connection';
import { createTables } from './schema';
import { dal, DatabaseDAL, EpisodesDAL, SettingsDAL } from './dal';
import { migrationManager, MigrationManager } from './migrations';
// Initialize database on module load
export const initializeDatabase = () => {
    try {
        migrationManager.migrate();
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
};
// Export everything needed by the application
export { 
// Connection
DatabaseConnection, db, 
// Schema
createTables, 
// Data Access Layer
dal, DatabaseDAL, EpisodesDAL, SettingsDAL, 
// Migrations
migrationManager, MigrationManager, };
//# sourceMappingURL=index.js.map