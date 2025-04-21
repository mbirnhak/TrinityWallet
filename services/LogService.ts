// services/LogService.ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import * as SQLite from 'expo-sqlite';
import { logs } from '@/db/schema';
import { constants } from './Utils/enums';
import { getDbEncryptionKey } from './Utils/crypto';

export type LogType = 'credential_issuance' | 'credential_presentation' | 'authentication' | 'error' | 'signature';
export type LogStatus = 'success' | 'failed' | 'pending';

export interface LogEntry {
    transaction_type: string;
    status: LogStatus;
    details?: string;
    relying_party?: string;
    transaction_datetime?: number;
}

// A helper to create reusable safe database operations
const withDB = async <T>(operation: (db: any) => Promise<T>): Promise<T> => {
    // Get database encryption key
    const dbEncryptionKey = await getDbEncryptionKey();
    
    // Open a new connection for each operation
    const db = SQLite.openDatabaseSync(constants.DBNAME);
    db.execSync(`PRAGMA key = "x'${dbEncryptionKey}'"`);
    const drizzleDb = drizzle(db, { schema });
    
    try {
        // Execute the operation
        const result = await operation(drizzleDb);
        return result;
    } finally {
        // Clean up - always close the database
        try {
            db.closeSync();
        } catch (error) {
            console.error("Error closing database connection:", error);
        }
    }
};

export class LogService {
    private static instance: LogService;

    private constructor() {}

    public static getInstance(): LogService {
        if (!LogService.instance) {
            LogService.instance = new LogService();
        }
        return LogService.instance;
    }

    /**
     * Initialize the log service - placeholder for backward compatibility
     */
    public async initialize(): Promise<void> {
        console.log("LogService initialized successfully");
        return Promise.resolve();
    }

    /**
     * Create a new log entry
     */
    public async createLog(logEntry: LogEntry): Promise<number | null> {
        try {
            // Set the current timestamp if not provided
            if (!logEntry.transaction_datetime) {
                logEntry.transaction_datetime = Math.floor(Date.now() / 1000);
            }
            
            const result = await withDB(async (db) => {
                return await db.insert(logs).values(logEntry);
            });
            
            console.log("Log created successfully:", logEntry);
            return result.lastInsertRowid ? Number(result.lastInsertRowid) : null;
        } catch (error) {
            console.error("Error creating log:", error);
            
            // Try to log the error itself
            try {
                await withDB(async (db) => {
                    return await db.insert(logs).values({
                        transaction_type: 'error',
                        status: 'failed',
                        details: `Error creating log: ${error instanceof Error ? error.message : String(error)}`,
                        transaction_datetime: Math.floor(Date.now() / 1000)
                    });
                });
            } catch (innerError) {
                console.error("Failed to log error:", innerError);
            }
            
            return null;
        }
    }

    /**
     * Get all logs
     */
    public async getLogs(): Promise<schema.Log[]> {
        try {
            return await withDB(async (db) => {
                return await db.query.logs.findMany({
                    orderBy: (logs: typeof schema.logs.$inferSelect, { desc }: { desc: (column: any) => any }) => 
                        [desc(logs.transaction_datetime)]
                });
            });
        } catch (error) {
            console.error("Error retrieving logs:", error);
            return [];
        }
    }

    /**
     * Get logs for a specific transaction type
     */
    public async getLogsByType(transactionType: string): Promise<schema.Log[]> {
        try {
            return await withDB(async (db) => {
                return await db.query.logs.findMany({
                    where: (logs: typeof schema.logs.$inferSelect, { eq }: { eq: Function }) => 
                        eq(logs.transaction_type, transactionType),
                    orderBy: (logs: typeof schema.logs.$inferSelect, { desc }: { desc: Function }) => 
                        [desc(logs.transaction_datetime)]
                });
            });
        } catch (error) {
            console.error(`Error retrieving logs for type ${transactionType}:`, error);
            return [];
        }
    }

    /**
     * Cleanup function - placeholder for backward compatibility
     */
    public close(): void {
        // No-op - we're using withDB pattern instead
    }
}

export default LogService;