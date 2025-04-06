import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { credentials, logs } from '@/db/schema';
import * as schema from '@/db/schema';
import * as SQLite from 'expo-sqlite';
import { createSdJwt } from './Credentials/SdJwtVc';
import { constants } from './Utils/enums';
import { eq, isNotNull, or, sql } from 'drizzle-orm';

export class CredentialStorage {
    private db;
    private drizzleDb;

    constructor(dbEncryptionKey: string) {
        this.db = SQLite.openDatabaseSync(constants.DBNAME);
        this.db.execSync(`PRAGMA key = "x'${dbEncryptionKey}'"`);
        this.drizzleDb = drizzle(this.db, { schema });
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
                return false;
            }
        }
    }

    private async storeMdocCredential(credential_string: string) {
        const credential_format = "mdoc";
        // TODO: implement this later
        return false;
    }

    private async storeSdJwtCredential(credential_string: string): Promise<boolean> {
        try {
            const credential_format = "sd_jwt_vc";
            const private_key_string = await SecureStore.getItemAsync("priv-key");
            const public_key_string = await SecureStore.getItemAsync("pub-key");
            if (!public_key_string || !private_key_string) {
                console.log("Missing public or private key for storing credentials");
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
                return false;
            }

            await this.drizzleDb.insert(credentials).values(
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
            return true;
        } catch (error) {
            console.log("Error Storing Credential(s)");
            return false;
        }
    }

    async retrieveCredentials() {
        try {
            const credentials = await this.drizzleDb.query.credentials.findMany();
            return credentials;
        } catch (error) {
            console.log("Error retrieving credentials: ", error);
            return null;
        }
    }

    // async retrieveCredentialsByJsonPath(credential_paths: string[]) {
    //     try {
    //         // Build OR conditions for each path in the array
    //         const orConditions = credential_paths.map(path =>
    //             isNotNull(
    //                 sql`json_extract(credential_claims, ${path})`
    //             )
    //         );
    //         // Combine the conditions using OR
    //         const whereCondition = or(...orConditions);

    //         const matching_credentials = await this.drizzleDb.
    //             select({
    //                 credential_string: credentials.credential_string,
    //                 credential_claims: credentials.credential_claims
    //             }).
    //             from(credentials).
    //             where(whereCondition);
    //         return matching_credentials;
    //     } catch (error) {
    //         console.log("Error retrieving credential: ", error);
    //         return null;
    //     }
    // }
    async retrieveCredentialsByJsonPath(credential_paths: string[]) {
        try {
            // First, create a CASE expression to find the first matching path
            const pathCaseExpression = credential_paths.map((path, index) =>
                sql`WHEN json_extract(credential_claims, ${path}) IS NOT NULL THEN ${path}`
            ).reduce((acc, curr) => sql`${acc} ${curr}`, sql``);

            // Select the credential string, claims, and the first matching path
            const matching_credentials = await this.drizzleDb
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

            return matching_credentials;
        } catch (error) {
            console.log("Error retrieving credential: ", error);
            return null;
        }
    }

    public close(): void {
        if (this.db) {
            this.db.closeSync();
        }
    }
}