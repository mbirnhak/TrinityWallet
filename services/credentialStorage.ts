import { drizzle, ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import * as SecureStore from "expo-secure-store";
import { credentials } from "@/db/schema";
import * as schema from "@/db/schema";
import * as SQLite from "expo-sqlite";
import { createSdJwt } from "./Credentials/SdJwtVc";
import { constants } from "./Utils/enums";
import { eq, isNotNull, or, sql } from "drizzle-orm";
import LogService from "./LogService";

type DrizzleDbType = ExpoSQLiteDatabase<typeof schema> & {
  $client: SQLite.SQLiteDatabase;
};

// A helper to create reusable safe database operations
const withDB = async <T>(
  dbEncryptionKey: string,
  operation: (db: DrizzleDbType) => Promise<T>
): Promise<T> => {
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

  async storeCredential(
    credential_string: string,
    keyPair: { privateKey: object | undefined; publicKey: object | undefined }
  ) {
    const sdjwt_success = await this.storeSdJwtCredential(
      credential_string,
      keyPair
    );
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
            transaction_type: "credential_issuance",
            status: "failed",
            details: "Credential format not supported",
          });
        } catch (error) {
          console.error(
            "Error logging credential format not supported:",
            error
          );
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
        transaction_type: "credential_issuance",
        status: "failed",
        details: "MDOC credential format not implemented yet",
      });
    } catch (error) {
      console.error("Error logging MDOC not implemented:", error);
    }
    return false;
  }

  private async storeSdJwtCredential(
    credential_string: string,
    keyPair: { privateKey: object | undefined; publicKey: object | undefined }
  ): Promise<boolean> {
    try {
      const credential_format = "sd_jwt_vc";
      let private_key = keyPair.privateKey;
      let public_key = keyPair.publicKey;
      const sdjwt_parser = await createSdJwt();
      const credential_claims: Record<string, any> =
        (await sdjwt_parser.getClaims(credential_string)) as Record<
          string,
          any
        >;
      if (!private_key || !public_key) {
        if (credential_claims.vct !== "trin.coll.student_id_sd_jwt_vc") {
          console.log("Missing private key for storing credentials");
          try {
            await this.logService.createLog({
              transaction_type: "credential_issuance",
              status: "failed",
              details: "Missing private key in credential",
            });
          } catch (error) {
            console.log("Error logging missing private key:", error);
          }
          return false;
        }
        private_key = { value: "Not Available" };
        public_key = { value: "Not Available" };
      }
      const parsed_credential = await sdjwt_parser.decodeCredential(
        credential_string
      );
      let iss_date, exp_date;
      iss_date = credential_claims.iat;
      exp_date = credential_claims.exp;

      if (!credential_claims || !parsed_credential || !iss_date) {
        console.log("Missing fields for storing credentials");
        try {
          await this.logService.createLog({
            transaction_type: "credential_issuance",
            status: "failed",
            details: "Missing required fields in credential",
          });
        } catch (error) {
          console.error("Error logging missing fields:", error);
        }
        return false;
      }

      // Extract issuer info for logging
      const issuer = credential_claims.iss || "Unknown Issuer";

      // Use withDB to handle database operations safely
      await withDB(this.dbEncryptionKey, async (db) => {
        return await db.insert(credentials).values({
          credential_string: credential_string,
          parsed_credential: parsed_credential,
          credential_format: credential_format,
          credential_claims: credential_claims,
          public_key: public_key,
          private_key: private_key,
          iss_date: iss_date,
          exp_date: exp_date,
        });
      });

      // Log successful credential storage
      try {
        await this.logService.createLog({
          transaction_type: "credential_issuance",
          status: "success",
          details: `Stored ${credential_format} credential`,
          relying_party: issuer,
        });
      } catch (error) {
        console.error("Error logging successful credential storage:", error);
      }

      return true;
    } catch (error) {
      console.log("Error Storing Credential(s)");
      try {
        await this.logService.createLog({
          transaction_type: "credential_issuance",
          status: "failed",
          details: `Error storing credential: ${
            error instanceof Error ? error.message : String(error)
          }`,
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
          transaction_type: "error",
          status: "failed",
          details: `Error retrieving credentials: ${
            error instanceof Error ? error.message : String(error)
          }`,
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
        const pathCaseExpression = credential_paths
          .map(
            (path) =>
              sql`WHEN json_extract(credential_claims, ${path}) IS NOT NULL THEN ${path}`
          )
          .reduce((acc, curr) => sql`${acc} ${curr}`, sql``);

        // Create a similar CASE expression to get the matching value
        const valueCaseExpression = credential_paths
          .map(
            (path, index) =>
              sql`WHEN json_extract(credential_claims, ${path}) IS NOT NULL THEN json_extract(credential_claims, ${path})`
          )
          .reduce((acc, curr) => sql`${acc} ${curr}`, sql``);

        // Select the credential string, claims, and the first matching path
        return await db
          .select({
            credential_id: credentials.id,
            matching_path: sql<string>`
                        CASE
                            ${pathCaseExpression}
                            ELSE NULL
                        END
                    `,
            matching_value: sql<string>`
                        CASE
                            ${valueCaseExpression}
                            ELSE NULL
                        END
                    `,
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
          transaction_type: "error",
          status: "failed",
          details: `Error retrieving credentials by JSON path: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      } catch (logError) {
        console.error(
          "Error logging credential retrieval by JSON path failure:",
          logError
        );
      }
      return null;
    }
  }

  async retrieveCredentialByJsonPathValue(
    jsonPath: string,
    expectedValue: any
  ): Promise<string | null> {
    try {
      // Use withDB instead of direct drizzleDb access
      return await withDB(this.dbEncryptionKey, async (db) => {
        const result = await db
          .select({
            credential_string: credentials.credential_string,
          })
          .from(credentials)
          .where(
            sql`json_extract(credential_claims, ${jsonPath}) = ${expectedValue}`
          );

        // Return the first matching credential string, or null if none found
        return result.length > 0 ? result[0].credential_string : null;
      });
    } catch (error) {
      console.log("Error retrieving credential: ", error);
      try {
        await this.logService.createLog({
          transaction_type: "error",
          status: "failed",
          details: `Error retrieving credentials by JSON path: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      } catch (logError) {
        console.error(
          "Error logging credential retrieval by JSON path failure:",
          logError
        );
      }
      return null;
    }
  }

  async retrieveCredentialByFormat(credential_format: string) {
    try {
      return await withDB(this.dbEncryptionKey, async (db) => {
        return await db
          .select({
            credential_id: credentials.id,
          })
          .from(credentials)
          .where(eq(credentials.credential_format, credential_format));
      });
    } catch (error) {
      console.log("Error retrieving credentials: ", error);
      return null;
    }
  }

  async retrieveCredentialById(
    credential_id: number,
    columns: (keyof typeof credentials)[] = []
  ) {
    try {
      return await withDB(this.dbEncryptionKey, async (db) => {
        // Set up the selection object conditionally
        const selection =
          columns.length > 0
            ? columns.reduce((acc, column) => {
                acc[column] = credentials[column];
                return acc;
              }, {} as Record<string, any>)
            : {}; // When empty, select() will get all columns

        // Query with conditional selection
        return await db
          .select(selection)
          .from(credentials)
          .where(eq(credentials.id, credential_id));
      });
    } catch (error) {
      console.log("Error retrieving credentials: ", error);
      return null;
    }
  }

  async deleteAllCredentials() {
    try {
      await withDB(this.dbEncryptionKey, async (db) => {
        return await db.delete(credentials);
      });
      return true;
    } catch (error) {
      console.log("Error deleting credentials: ", error);
      return false;
    }
  }

  async deleteCredentialByIdSimple(credential_id: number) {
    try {
      await withDB(this.dbEncryptionKey, async (db) => {
        return await db
          .delete(credentials)
          .where(eq(credentials.id, credential_id));
      });
      return true;
    } catch (error) {
      console.log("Error deleting credential: ", error);
      return false;
    }
  }

  async deleteCredentialsById(credential_ids: number[]) {
    try {
      await withDB(this.dbEncryptionKey, async (db) => {
        return await db
          .delete(credentials)
          .where(sql`${credentials.id} IN (${sql.join(credential_ids, ", ")})`);
      });
      return true;
    } catch (error) {
      console.log("Error deleting credentials: ", error);
      return false;
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
      // Updated patterns to match what's actually in the credentials
      const typeToVctMap = {
        pid: "pid",
        msisdn: "msisdn",
        ehic: "ehic",
        age_verification: "pseudonym_age_over_18", // This was incorrect before
        iban: "iban",
        health_id: "hiid",
        tax: "tax",
        pda1: "pda1",
        por: "por",
      };

      // Get the VCT pattern for the credential type
      vctPattern = typeToVctMap[credentialType as keyof typeof typeToVctMap];

      if (!vctPattern) {
        throw new Error(`Unknown credential type: ${credentialType}`);
      }

      console.log(`Looking for credential with pattern: ${vctPattern}`);

      // Find the matching credential
      for (const credential of allCredentials || []) {
        // Parse credential claims if they're a string
        const claims =
          typeof credential.credential_claims === "string"
            ? JSON.parse(credential.credential_claims)
            : credential.credential_claims;

        // Debug log to see what's in the credential
        console.log(`Checking credential with VCT: ${claims.vct || "none"}`);

        // Check if VCT matches our pattern - try a more flexible match
        const vct = claims.vct || "";
        if (vct && vct.toLowerCase().includes(vctPattern.toLowerCase())) {
          console.log(`Found matching credential with ID: ${credential.id}`);
          credentialToDelete = credential;
          break;
        }

        // Check for exact VCT match with URN format (added for age verification)
        if (
          credentialType === "age_verification" &&
          vct &&
          vct.includes("urn:eu.europa.ec.eudi:pseudonym_age_over_18")
        ) {
          console.log(
            `Found age verification credential with ID: ${credential.id}`
          );
          credentialToDelete = credential;
          break;
        }

        // Check VC type array as a fallback
        if (!credentialToDelete && claims.vc) {
          const typeArray = Array.isArray(claims.vc._type)
            ? claims.vc._type
            : typeof claims.vc._type === "string"
            ? [claims.vc._type]
            : [];

          if (
            typeArray.some(
              (t: string) =>
                typeof t === "string" &&
                t.toLowerCase().includes(vctPattern.toLowerCase())
            )
          ) {
            console.log(
              `Found credential via VC type with ID: ${credential.id}`
            );
            credentialToDelete = credential;
            break;
          }
        }

        // Additional check for 'over18' claim for age verification
        if (
          credentialType === "age_verification" &&
          (claims.over18 === true ||
            claims.age_over_18 === true ||
            claims["18"] === true)
        ) {
          console.log(
            `Found age verification credential by claim with ID: ${credential.id}`
          );
          credentialToDelete = credential;
          break;
        }
      }

      if (!credentialToDelete) {
        throw new Error(`No credential found of type: ${credentialType}`);
      }

      // Get credential ID and issuer for logging
      const credentialId = credentialToDelete.id;
      const claims =
        typeof credentialToDelete.credential_claims === "string"
          ? JSON.parse(credentialToDelete.credential_claims)
          : credentialToDelete.credential_claims;
      const issuer = claims.iss || "Unknown Issuer";

      // Delete the credential from the database
      await withDB(this.dbEncryptionKey, async (db) => {
        return await db
          .delete(credentials)
          .where(eq(credentials.id, credentialId));
      });

      // Log successful deletion
      try {
        await this.logService.createLog({
          transaction_type: "credential_presentation",
          status: "success",
          details: `Deleted ${credentialType} credential`,
          relying_party: issuer,
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
          transaction_type: "credential_presentation",
          status: "failed",
          details: `Error deleting credential: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      } catch (logError) {
        console.error("Error logging credential deletion failure:", logError);
      }

      return false;
    }
  }

  async deleteCredentialById(credentialId: number) {
    try {
      // First retrieve the credential to get info for logging
      const allCredentials = await this.retrieveCredentials();

      // Find the credential with the matching ID
      const credentialToDelete = allCredentials?.find(
        (cred) => cred.id === credentialId
      );

      if (!credentialToDelete) {
        throw new Error(`No credential found with ID: ${credentialId}`);
      }

      // Get credential type and issuer for logging
      const claims =
        typeof credentialToDelete.credential_claims === "string"
          ? JSON.parse(credentialToDelete.credential_claims)
          : credentialToDelete.credential_claims;

      const issuer = claims.iss || "Unknown Issuer";

      // Delete the credential from the database
      await withDB(this.dbEncryptionKey, async (db) => {
        return await db
          .delete(credentials)
          .where(eq(credentials.id, credentialId));
      });

      // Log successful deletion
      try {
        await this.logService.createLog({
          transaction_type: "credential_presentation",
          status: "success",
          details: `Deleted credential with ID: ${credentialId}`,
          relying_party: issuer,
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
          transaction_type: "credential_presentation",
          status: "failed",
          details: `Error deleting credential by ID: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      } catch (logError) {
        console.error("Error logging credential deletion failure:", logError);
      }

      return false;
    }
  }
}
