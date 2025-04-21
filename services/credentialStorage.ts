import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { credentials } from '@/db/schema';
import * as schema from '@/db/schema';
import * as SQLite from 'expo-sqlite';
import { createSdJwt } from './Credentials/SdJwtVc';
import { constants } from './Utils/enums';
import { eq, isNotNull, or, sql } from 'drizzle-orm';
import LogService from './LogService';

// A helper to create reusable safe database operations
const withDB = async <T>(dbEncryptionKey: string, operation: (db: any) => Promise<T>): Promise<T> => {
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

export class CredentialStorage {
    private dbEncryptionKey: string;
    private logService: LogService;

    constructor(dbEncryptionKey: string) {
        this.dbEncryptionKey = dbEncryptionKey;
        this.logService = LogService.getInstance();
    }

    async storeCredential(credential_string: string) {
        const sdjwt_success = await this.storeSdJwtCredential(credential_string);
        if (sdjwt_success == true) {
            return true;
        } else {
            const mdoc_success = await this.storeMdocCredential(credential_string);
            if (mdoc_success == true) {
                return true;
            } else {
                console.log("Credential format not supported!");
                try {
                    await this.logService.createLog({
                        transaction_type: 'credential_issuance',
                        status: 'failed',
                        details: 'Credential format not supported'
                    });
                } catch (error) {
                    console.error("Error logging credential format not supported:", error);
                }
                return false;
            }
        }
    }

    private async storeMdocCredential(credential_string: string) {
        const credential_format = "mdoc";
        // TODO: implement this later
        try {
            await this.logService.createLog({
                transaction_type: 'credential_issuance',
                status: 'failed',
                details: 'MDOC credential format not implemented yet'
            });
        } catch (error) {
            console.error("Error logging MDOC not implemented:", error);
        }
        return false;
    }

    private async storeSdJwtCredential(credential_string: string): Promise<boolean> {
        try {
            const credential_format = "sd_jwt_vc";
            const private_key_string = await SecureStore.getItemAsync("priv-key");
            const public_key_string = await SecureStore.getItemAsync("pub-key");
            if (!public_key_string || !private_key_string) {
                console.log("Missing public or private key for storing credentials");
                try {
                    await this.logService.createLog({
                        transaction_type: 'credential_issuance',
                        status: 'failed',
                        details: 'Missing public or private key for storing credentials'
                    });
                } catch (error) {
                    console.error("Error logging missing keys:", error);
                }
                return false;
            }
            const private_key = JSON.parse(private_key_string);
            const public_key = JSON.parse(public_key_string);

            const sdjwt_parser = await createSdJwt(private_key, public_key);
            const credential_claims: Record<string, any> = await sdjwt_parser.getClaims(credential_string) as Record<string, any>;
            const parsed_credential = await sdjwt_parser.decodeCredential(credential_string);
            let iss_date, exp_date;
            iss_date = credential_claims.iat;
            exp_date = credential_claims.exp;

            if (!credential_claims || !parsed_credential || !iss_date || !exp_date) {
                console.log("Missing fields for storing credentials");
                try {
                    await this.logService.createLog({
                        transaction_type: 'credential_issuance',
                        status: 'failed',
                        details: 'Missing required fields in credential'
                    });
                } catch (error) {
                    console.error("Error logging missing fields:", error);
                }
                return false;
            }

            // Extract issuer info for logging
            const issuer = credential_claims.iss || 'Unknown Issuer';

            // Use withDB to handle database operations safely
            await withDB(this.dbEncryptionKey, async (db) => {
                return await db.insert(credentials).values(
                    {
                        credential_string: credential_string,
                        parsed_credential: parsed_credential,
                        credential_format: credential_format,
                        credential_claims: credential_claims,
                        public_key: public_key,
                        private_key: private_key,
                        iss_date: iss_date,
                        exp_date: exp_date
                    }
                );
            });

            // Log successful credential storage
            try {
                await this.logService.createLog({
                    transaction_type: 'credential_issuance',
                    status: 'success',
                    details: `Stored ${credential_format} credential`,
                    relying_party: issuer
                });
            } catch (error) {
                console.error("Error logging successful credential storage:", error);
            }

            return true;
        } catch (error) {
            console.log("Error Storing Credential(s)");
            try {
                await this.logService.createLog({
                    transaction_type: 'credential_issuance',
                    status: 'failed',
                    details: `Error storing credential: ${error instanceof Error ? error.message : String(error)}`
                });
            } catch (logError) {
                console.error("Error logging credential storage failure:", logError);
            }
            return false;
        }
    }

    async retrieveCredentials() {
        try {
            return await withDB(this.dbEncryptionKey, async (db) => {
                return await db.query.credentials.findMany();
            });
        } catch (error) {
            console.log("Error retrieving credentials: ", error);
            try {
                await this.logService.createLog({
                    transaction_type: 'error',
                    status: 'failed',
                    details: `Error retrieving credentials: ${error instanceof Error ? error.message : String(error)}`
                });
            } catch (logError) {
                console.error("Error logging credential retrieval failure:", logError);
            }
            return null;
        }
    }

    async retrieveCredentialsByJsonPath(credential_paths: string[]) {
        try {
            return await withDB(this.dbEncryptionKey, async (db) => {
                // First, create a CASE expression to find the first matching path
                const pathCaseExpression = credential_paths.map((path) =>
                    sql`WHEN json_extract(credential_claims, ${path}) IS NOT NULL THEN ${path}`
                ).reduce((acc, curr) => sql`${acc} ${curr}`, sql``);

                // Select the credential string, claims, and the first matching path
                return await db
                    .select({
                        credential_string: credentials.credential_string,
                        credential_claims: credentials.credential_claims,
                        matching_path: sql<string>`
                            CASE
                                ${pathCaseExpression}
                                ELSE NULL
                            END
                        `
                    })
                    .from(credentials)
                    // Only return rows where at least one path matches
                    .where(
                        isNotNull(sql`
                            CASE
                                ${pathCaseExpression}
                                ELSE NULL
                            END
                        `)
                    );
            });
        } catch (error) {
            console.log("Error retrieving credential: ", error);
            try {
                await this.logService.createLog({
                    transaction_type: 'error',
                    status: 'failed',
                    details: `Error retrieving credentials by JSON path: ${error instanceof Error ? error.message : String(error)}`
                });
            } catch (logError) {
                console.error("Error logging credential retrieval by JSON path failure:", logError);
            }
            return null;
        }
    }

    async deleteCredentialByType(credentialType: string) {
        try {
            // First retrieve the credential to get info for logging
            const allCredentials = await this.retrieveCredentials();
            
            // Find the credential with the matching type from our mapping
            let credentialToDelete = null;
            let vctPattern = null;
            
            // Map the short type back to VCT pattern for matching
            const typeToVctMap = {
                'pid': 'eu.europa.ec.eudi.pid',
                'msisdn': 'eu.europa.ec.eudi.msisdn',
                'ehic': 'eu.europa.ec.eudi.ehic',
                'age_verification': 'eu.europa.ec.eudi.pseudonym_over18',
                'iban': 'eu.europa.ec.eudi.iban',
                'health_id': 'eu.europa.ec.eudi.hiid',
                'tax': 'eu.europa.ec.eudi.tax',
                'pda1': 'eu.europa.ec.eudi.pda1',
                'por': 'eu.europa.ec.eudi.por'
            };
            
            // Get the VCT pattern for the credential type
            vctPattern = typeToVctMap[credentialType];
            
            if (!vctPattern) {
                throw new Error(`Unknown credential type: ${credentialType}`);
            }
            
            // Find the matching credential
            for (const credential of allCredentials || []) {
                // Parse credential claims if they're a string
                const claims = typeof credential.credential_claims === 'string' 
                    ? JSON.parse(credential.credential_claims) 
                    : credential.credential_claims;
                
                // Check if VCT matches our pattern
                const vct = claims.vct || '';
                if (vct && vct.includes(vctPattern)) {
                    credentialToDelete = credential;
                    break;
                }
                
                // Check VC type array as a fallback
                if (!credentialToDelete && claims.vc) {
                    const typeArray = Array.isArray(claims.vc._type) ? claims.vc._type : 
                                     (typeof claims.vc._type === 'string' ? [claims.vc._type] : []);
                    
                    if (typeArray.some((t) => typeof t === 'string' && t.includes(vctPattern))) {
                        credentialToDelete = credential;
                        break;
                    }
                }
            }
            
            if (!credentialToDelete) {
                throw new Error(`No credential found of type: ${credentialType}`);
            }
            
            // Get credential ID and issuer for logging
            const credentialId = credentialToDelete.id;
            const claims = typeof credentialToDelete.credential_claims === 'string' 
                ? JSON.parse(credentialToDelete.credential_claims) 
                : credentialToDelete.credential_claims;
            const issuer = claims.iss || 'Unknown Issuer';
            
            // Delete the credential from the database
            await withDB(this.dbEncryptionKey, async (db) => {
                return await db.delete(credentials)
                    .where(eq(credentials.id, credentialId));
            });
            
            // Log successful deletion
            try {
                await this.logService.createLog({
                    transaction_type: 'credential_presentation',
                    status: 'success',
                    details: `Deleted ${credentialType} credential`,
                    relying_party: issuer
                });
            } catch (error) {
                console.error("Error logging credential deletion:", error);
            }
            
            return true;
        } catch (error) {
            console.error("Error deleting credential:", error);
            
            // Log the error
            try {
                await this.logService.createLog({
                    transaction_type: 'credential_presentation',
                    status: 'failed',
                    details: `Error deleting credential: ${error instanceof Error ? error.message : String(error)}`
                });
            } catch (logError) {
                console.error("Error logging credential deletion failure:", logError);
            }
            
            return false;
        }
    }

    public close(): void {
        // No need to close anything since we're using withDB pattern
        // This is just a placeholder for backward compatibility
    }
}