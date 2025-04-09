// services/Transaction/credentialIssuance.ts
import { JWK } from "react-native-quick-crypto/lib/typescript/src/keys";
import { storedValueKeys, constants } from "@/services/Utils/enums";
import { createSdJwt, SdJwt } from "../Credentials/SdJwtVc";
import { CredentialStorage } from "../credentialStorage";
import { getDbEncryptionKey } from "../Utils/crypto";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";
import { Alert } from "react-native";
import base64url from "base64url";

// Constants
const REDIRECT_URI = `${constants.DEEP_LINK_PREFIX}${constants.ISS_PATH}`;

type CredentialRequestByIdentifier = {
  credential_identifier: string;
  format?: never;
  vct?: never;
  doctype?: never;
  proof: {
    proof_type: string;
    jwt: string;
  };
};

type CredentialRequestSdJwt = {
  credential_identifier?: never;
  format: string;
  vct: string;
  doctype?: never;
  proof: {
    proof_type: string;
    jwt: string;
  };
};

type CredentialRequestMdoc = {
  credential_identifier?: never;
  format: string;
  vct?: never;
  doctype: string;
  proof: {
    proof_type: string;
    jwt: string;
  };
};

type CredentialRequest =
  | CredentialRequestByIdentifier
  | CredentialRequestSdJwt
  | CredentialRequestMdoc;

type BatchRequest = {
  credential_requests: CredentialRequest[];
};

interface CredentialResponse {
  c_nonce: string;
  c_nonce_expires_in: number;
  credential?: any;
  notification_id?: string;
  transaction_id?: string;
}

const CREDENTIAL_DETAILS: Record<
  string,
  { format?: string; vct?: string; doctype?: string }
> = {
  "eu.europa.ec.eudi.pid_jwt_vc_json": {
    format: "vc+sd-jwt",
    vct: "eu.europa.ec.eudi.pid_jwt_vc_json",
  },
  "eu.europa.ec.eudi.msisdn_sd_jwt_vc": {
    format: "vc+sd-jwt",
    vct: "eu.europa.ec.eudi.msisdn_sd_jwt_vc",
  },
  "eu.europa.ec.eudi.ehic_sd_jwt_vc": {
    format: "vc+sd-jwt",
    vct: "eu.europa.ec.eudi.ehic_sd_jwt_vc",
  },
  "eu.europa.ec.eudi.pseudonym_over18_sd_jwt_vc": {
    format: "vc+sd-jwt",
    vct: "eu.europa.ec.eudi.pseudonym_over18_sd_jwt_vc",
  },
  "eu.europa.ec.eudi.iban_sd_jwt_vc": {
    format: "vc+sd-jwt",
    vct: "eu.europa.ec.eudi.iban_sd_jwt_vc",
  },
  "eu.europa.ec.eudi.hiid_sd_jwt_vc": {
    format: "vc+sd-jwt",
    vct: "eu.europa.ec.eudi.hiid_sd_jwt_vc",
  },
  "eu.europa.ec.eudi.tax_sd_jwt_vc": {
    format: "vc+sd-jwt",
    vct: "eu.europa.ec.eudi.tax_sd_jwt_vc",
  },
};

const VCT_TYPES = {
    "eu.europa.ec.eudi.ehic_sd_jwt_vc": "urn:eu.europa.ec.eudi:ehic:1",
    "eu.europa.ec.eudi.pid_jwt_vc_json": "urn:eu.europa.ec.eudi:pid:1",
    "eu.europa.ec.eudi.msisdn_sd_jwt_vc": "urn:eu.europa.ec.eudi:msisdn:1",
    "eu.europa.ec.eudi.pseudonym_over18_sd_jwt_vc": "urn:eu.europa.ec.eudi:pseudonym_age_over_18:1",
    "eu.europa.ec.eudi.iban_sd_jwt_vc": "urn:eu.europa.ec.eudi:iban:1",
    "eu.europa.ec.eudi.hiid_sd_jwt_vc": "urn:eu.europa.ec.eudi:hiid:1",
    "eu.europa.ec.eudi.tax_sd_jwt_vc": "urn:eu.europa.ec.eudi:tax:1",
    "eu.europa.ec.eudi.pda1_sd_jwt_vc": "urn:eu.europa.ec.eudi:pda1:1",
    "eu.europa.ec.eudi.por_sd_jwt_vc": "urn:eu.europa.ec.eudi:por:1",
};

/**
 * Generate PKCE challenge pair
 */
async function generatePKCE() {
  console.log("[PKCE] Generating PKCE parameters...");

  // Generate code verifier
  const randomBytes = Crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64url.encode(Buffer.from(randomBytes));

  // Generate code challenge
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
  const challenge = base64url.encode(Buffer.from(hash));

  console.log("[PKCE] Code verifier generated");
  console.log("[PKCE] Code challenge generated");

  await SecureStore.setItemAsync(storedValueKeys.CODE_VERIFIER_KEY, verifier);

  return { verifier, challenge };
}

/**
 * Generate random state
 */
async function generateState() {
  const state = base64url.encode(
    Buffer.from(Crypto.getRandomValues(new Uint8Array(16)))
  );
  await SecureStore.setItemAsync(storedValueKeys.STATE_KEY, state);
  return state;
}

/**
 * Step 1: Fetch metadata from issuer
 */
async function fetchMetadata() {
  try {
    console.log("[Step 1.a] Fetching OpenID Configuration...");
    const oidcResponse = await fetch(
      `${constants.ISSUER_URL}/.well-known/openid-configuration`
    );
    const oidcMetadata = await oidcResponse.json();

    console.log("[Step 1.b] Fetching Credential Issuer metadata...");
    const credResponse = await fetch(
      `${constants.ISSUER_URL}/.well-known/openid-credential-issuer`
    );
    const credMetadata = await credResponse.json();

    await SecureStore.setItemAsync(
      storedValueKeys.METADATA_STORAGE_KEY,
      JSON.stringify(oidcMetadata)
    );
    return { oidcMetadata, credMetadata };
  } catch (error) {
    console.error("[Metadata] Error:", error);
    throw new Error("Failed to fetch metadata");
  }
}

/**
 * Step 2: Push Authorization Request with PKCE
 */
async function pushAuthorizationRequest(
  oidcMetadata: any,
  pkce: { challenge: string },
  selectedCredentials: string[] = []
) {
  try {
    console.log("[Step 2] Initiating Push Authorization Request...");

    const state = await generateState();

    let authDetails = [];
    if (selectedCredentials.length === 0) {
      return null;
    } else if (selectedCredentials.length === 1) {
      authDetails = [
        {
          type: "openid_credential",
          ...CREDENTIAL_DETAILS[selectedCredentials[0]],
        },
      ];
    } else {
      // Create auth details based on selected credentials
      authDetails = selectedCredentials.map((credId) => {
        // Use credential_configuration_id for all credential types
        // This seems to be more reliable with the server
        return {
          type: "openid_credential",
          credential_configuration_id: credId,
        };
      });
      console.log("Auth Details: ", authDetails);
    }

    const parEndpoint = oidcMetadata.pushed_authorization_request_endpoint;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: constants.EU_ISSUER_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_challenge: pkce.challenge,
      code_challenge_method: "S256",
      state: state,
      //   scope: "eu.europa.ec.eudi.pid.1 openid",
      authorization_details: JSON.stringify(authDetails),
    });

    const response = await fetch(parEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const parResponse = await response.json();

    return parResponse;
  } catch (error) {
    console.error("[PAR] Error:", error);
    throw new Error("Failed to push authorization request");
  }
}

/**
 * Step 3: Create and open authorization URL
 */
async function initiateAuthorization(oidcMetadata: any, requestUri: string) {
  try {
    console.log("[Step 3] Creating authorization URL...");
    const authUrl = `${oidcMetadata.authorization_endpoint}?client_id=${constants.EU_ISSUER_CLIENT_ID}&request_uri=${requestUri}`;
    await Linking.openURL(authUrl);
  } catch (error) {
    console.error("[Authorization] Error:", error);
    throw new Error("Failed to open authorization URL");
  }
}

/**
 * Extract the issuers public key of a specific algorthim type (AES, RSA, EC, oct)
 * @param issuer_pub_keys Array containing all public keys
 * @param targetKty Key type requested
 * @returns Key matching type requested or undefined
 */
export function findIssuerKeyByType(
  issuer_pub_keys: { keys: JWK[] },
  targetKty: string
) {
  const keys = issuer_pub_keys.keys;
  return keys.find((key) => key.kty === targetKty);
}

/**
 * Step 4: Handle token exchange
 */
export async function exchangeCodeForToken(code: string, oidcMetadata: any) {
  try {
    console.log("[Step 4] Exchanging code for token...");

    const codeVerifier = await SecureStore.getItemAsync(
      storedValueKeys.CODE_VERIFIER_KEY
    );
    const state = await SecureStore.getItemAsync(storedValueKeys.STATE_KEY);

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: constants.EU_ISSUER_CLIENT_ID,
      code_verifier: codeVerifier!,
      state: state!,
    });

    const response = await fetch(oidcMetadata.token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Step 4] Token request failed:", errorText);
      throw new Error(`Token request failed with status: ${response.status}`);
    }
    const tokenResponse = await response.json();

    // Store tokens
    await SecureStore.setItemAsync("access_token", tokenResponse.access_token);
    await SecureStore.setItemAsync(
      "refresh_token",
      tokenResponse.refresh_token
    );

    // Request credential with the access token if we have authorization details
    if (tokenResponse.access_token && tokenResponse.authorization_details) {
      try {
        const credentialResponse = await requestCredentialWithToken(
          tokenResponse.access_token,
          tokenResponse.authorization_details
        );
        console.log("[Flow] Credential request completed successfully");
        return { tokenResponse, credentialResponse };
      } catch (error) {
        console.error("[Flow] Error during credential request:", error);
        throw error;
      }
    }

    return tokenResponse;
  } catch (error) {
    console.error("[Token] Error:", error);
    throw new Error("Failed to exchange code for token");
  }
}

/**
 * Step 5: Generate JWT proof for credential request
 */
async function generateJWTProof(
  nonce?: string
): Promise<{ jwt: string; sdJwt: SdJwt }> {
  try {
    console.log("[Step 5] Generating JWT proof with nonce");
    const sdJwt = await createSdJwt();
    // Generate a key pair for signing
    const { privateKey, publicKey } = sdJwt.getKeyPair();
    SecureStore.setItemAsync("pub-key", JSON.stringify(publicKey));
    SecureStore.setItemAsync("priv-key", JSON.stringify(privateKey));
    console.log("Public Key Generated");
    console.log("Private Key Generated");
    // const kid = await jose.calculateJwkThumbprint(publicKey as JWK);  // Use kid instead of embedding key
    const header = {
      typ: "openid4vci-proof+jwt",
      alg: "ES256",
      // kid: kid,  // Use kid instead of embedding key
      jwk: publicKey, // Include the public key in the header
    };
    const payload = {
      iss: constants.EU_ISSUER_CLIENT_ID,
      aud: constants.ISSUER_URL,
      iat: Math.floor(Date.now() / 1000),
      ...(nonce && { nonce }), // Add nonce only if it's defined
      jti: Crypto.randomUUID(), // Using our Expo Crypto UUID generator
    };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // Sign payload (sdJwt instance already has the private key)
    const signature = await sdJwt.signJwt(signingInput);
    if (!signature) {
      throw new Error("JWT signature could not be generated");
    }
    const encodedSignature = base64url(signature);
    const jwt = `${signingInput}.${encodedSignature}`;
    console.log("[Step 5] Generated JWT");

    return { jwt, sdJwt };
  } catch (error) {
    console.error("[Step 5] Error generating JWT proof:", error);
    throw error;
  }
}

async function generateCredentialRequest(
  authDetails: Record<string, string>[]
) {
  if (authDetails.length < 1) {
    console.log("No credentials in auth details");
    return null;
  }
  let requests = [];
  for (const credential of authDetails) {
    const { jwt } = await generateJWTProof();
    const identifier = credential?.credential_configuration_id;
    const vct = credential?.vct as string;
    const docType = credential?.doctype as string;
    const format = credential?.format as string;
    let request: CredentialRequest;
    if (identifier) {
      request = {
        credential_identifier: identifier,
        proof: {
          proof_type: "jwt",
          jwt: jwt,
        },
      };
    } else if (vct) {
      const vct_adjusted = VCT_TYPES[vct as keyof typeof VCT_TYPES];;
      request = {
        format: format,
        vct: vct_adjusted,
        proof: {
          proof_type: "jwt",
          jwt: jwt,
        },
      };
    } else {
      request = {
        format: format,
        doctype: docType,
        proof: {
          proof_type: "jwt",
          jwt: jwt,
        },
      };
    }
    requests.push(request);
  }
  // If theres only one credential, return it as a CredentialRequest
  if (requests.length == 1) {
    return requests[0];
  } else {
    // If more than one credential, create a BatchRequest and return it
    const batchRequest: BatchRequest = {
      credential_requests: requests,
    };
    return batchRequest;
  }
}

/**
 * Step 6: Request credential using access token
 */
async function requestCredentialWithToken(
  accessToken: string,
  authDetails: Record<string, string>[]
): Promise<CredentialResponse> {
  // Setup credential storage instance
  const dbEncryptionKey = await getDbEncryptionKey();
  const storage = new CredentialStorage(dbEncryptionKey);

  const num_credentials = authDetails.length;
  console.log("Auth Details: ", authDetails);
  console.log("Num Credentials: ", num_credentials);

  try {
    console.log(
      "[Step 6] ====== Starting Batch Credential Request Flow ======"
    );

    // Step 6.1: Create Initial JWT proof without nonce
    console.log("[Step 6.1] Generating initial JWT proof...");

    // Step 6.2: Generate credential request with proof (batch request if multiple are requested)
    const request = await generateCredentialRequest(authDetails);
    console.log("REQUEST: ", request);
    let response;
    if (num_credentials == 1) {
      response = await fetch(`${constants.ISSUER_URL}/credential`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
      });
    } else {
      response = await fetch(`${constants.ISSUER_URL}/batch_credential`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Step 6.2] Initial batch request failed:", errorText);
      throw new Error(
        `Initial batch request failed with status: ${response.status}`
      );
    }
    const responseData = await response.json();
    console.log("Response Data: ", responseData);

    const notification_data = {
      notification_id: responseData.notification_id,
      event: "error",
    };
    // Notification endpoint
    const notification_response = await fetch(
      `${constants.ISSUER_URL}/notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(notification_data),
      }
    );
    const notif_text = await notification_response.text();
    console.log("Notification Response: ", notification_response);

    // Step 6.5: Store received credentials
    if (responseData.credential_responses?.length > 0) {
      console.log("[Step 6.5] Starting credential storage process...");
      const storageErrors = [];
      const storedCredentials = [];

      for (let i = 0; i < responseData.credential_responses.length; i++) {
        const credential = responseData.credential_responses[i].credential;
        if (credential) {
          try {
            console.log(`[Step 6.5] Storing credential ${i}...`);
            const success = await storage.storeCredential(credential);
            console.log("Result of credential storage: ", success);
            console.log(`[Step 6.5] Successfully stored credential ${i}`);
            storedCredentials.push(i);
          } catch (storageError) {
            const errorMessage = `Error storing credential ${i}: ${
              storageError instanceof Error
                ? storageError.message
                : String(storageError)
            }`;
            console.error("[Step 6.5]", errorMessage);
            storageErrors.push(errorMessage);
          }
        } else {
          console.warn(`[Step 6.5] No credential data received for index ${i}`);
        }
      }
      if (storageErrors.length > 0) {
        console.warn(
          "[Step 6.5] Completed with storage warnings:",
          storageErrors
        );
        console.log(
          "[Step 6.5] Successfully stored credentials:",
          storedCredentials
        );
      } else if (storedCredentials.length > 0) {
        console.log(
          "[Step 6.5] All credentials stored successfully:",
          storedCredentials
        );
      } else {
        console.warn("[Step 6.5] No credentials were stored");
      }
    } else {
      if (responseData.credential) {
        try {
          console.log(`[Step 6.5] Storing single credential...`);
          const success = await storage.storeCredential(
            responseData.credential
          );
          console.log("Result of credential storage: ", success);
          console.log(`[Step 6.5] Successfully stored credential`);
        } catch (storageError) {
          const errorMessage = `Error storing credential: ${
            storageError instanceof Error
              ? storageError.message
              : String(storageError)
          }`;
          console.error("[Step 6.5]", errorMessage);
        }
      } else {
        console.warn("[Step 6.5] No credentials received in response");
      }
    }

    // const cred_returned = await storage.retrieveCredentials();
    // console.log("Credentials stored: ", cred_returned);
    console.log(
      "[Step 6] ====== Batch Credential Request Flow Completed Successfully ======"
    );

    return responseData;
  } catch (error) {
    console.error(
      "[Step 6] ====== Error in Batch Credential Request Flow ======"
    );
    console.error("[Step 6] Error details:", error);
    throw error;
  } finally {
    // Close the database connection here
    storage.close();
    console.log("[Step 6] Database connection closed");
  }
}

/**
 * Main function to initiate credential request
 */
export async function requestCredential(selectedCredentialIds: string[]) {
  try {
    // Step 1: Fetch metadata
    const { oidcMetadata } = await fetchMetadata();

    // Generate PKCE parameters
    const pkce = await generatePKCE();

    // Step 2: Push Authorization Request
    const parResponse = await pushAuthorizationRequest(
      oidcMetadata,
      pkce,
      selectedCredentialIds
    );
    if (parResponse === null) {
      console.error("[Credential Request] No authorization details found");
      return "Error";
    }
    // Step 3: Initiate authorization
    await initiateAuthorization(oidcMetadata, parResponse.request_uri);
  } catch (error) {
    console.error("[Credential Request] Error:", error);
    Alert.alert("Error", "Failed to initiate credential request");
  }
}
