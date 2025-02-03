// services/credentialStorage.ts
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

export interface StoredCredential {
    jwt_vc?: string;
    mdoc?: string;
    timestamp: number;
}

const CREDENTIAL_DIRECTORY = `${FileSystem.documentDirectory}credentials/`;
const METADATA_KEY = 'credential_metadata';

export class CredentialStorage {
    static async initialize() {
        try {
            const dirInfo = await FileSystem.getInfoAsync(CREDENTIAL_DIRECTORY);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(CREDENTIAL_DIRECTORY, {
                    intermediates: true
                });
                console.log('[Storage] Created credentials directory');
            }
        } catch (error) {
            console.error('[Storage] Error initializing storage:', error);
            throw error;
        }
    }

    static async storeCredential(format: 'jwt_vc' | 'mdoc', credential: any) {
        try {
            await this.initialize();

            const filename = `${CREDENTIAL_DIRECTORY}${format}.txt`;
            const credentialStr = typeof credential === 'string' 
                ? credential 
                : JSON.stringify(credential);

            await FileSystem.writeAsStringAsync(filename, credentialStr, {
                encoding: FileSystem.EncodingType.UTF8
            });
            console.log(`[Storage] Stored ${format} credential to file`);

            // Update metadata
            const metadata = await this.getMetadata() || { timestamp: Date.now() };
            metadata[format] = true;
            metadata.timestamp = Date.now();
            
            await SecureStore.setItemAsync(METADATA_KEY, JSON.stringify(metadata));
            console.log('[Storage] Updated credential metadata');

        } catch (error) {
            console.error(`[Storage] Error storing ${format} credential:`, error);
            throw error;
        }
    }

    static async retrieveCredential(format: 'jwt_vc' | 'mdoc'): Promise<string | null> {
        try {
            const filename = `${CREDENTIAL_DIRECTORY}${format}.txt`;
            const fileInfo = await FileSystem.getInfoAsync(filename);
            
            if (!fileInfo.exists) {
                console.log(`[Storage] No ${format} credential found`);
                return null;
            }
            
            const content = await FileSystem.readAsStringAsync(filename, {
                encoding: FileSystem.EncodingType.UTF8
            });
            
            return content;
        } catch (error) {
            console.error(`[Storage] Error retrieving ${format} credential:`, error);
            return null;
        }
    }

    static async getMetadata(): Promise<StoredCredential | null> {
        try {
            const metadata = await SecureStore.getItemAsync(METADATA_KEY);
            return metadata ? JSON.parse(metadata) : null;
        } catch (error) {
            console.error('[Storage] Error getting metadata:', error);
            return null;
        }
    }

    static async clearCredentials() {
        try {
            const dirInfo = await FileSystem.getInfoAsync(CREDENTIAL_DIRECTORY);
            if (dirInfo.exists) {
                await FileSystem.deleteAsync(CREDENTIAL_DIRECTORY);
                await SecureStore.deleteItemAsync(METADATA_KEY);
                console.log('[Storage] Cleared all credentials');
            }
        } catch (error) {
            console.error('[Storage] Error clearing credentials:', error);
            throw error;
        }
    }
}