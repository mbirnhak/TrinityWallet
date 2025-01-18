export type DocumentType = 'jwt_vc_json' | 'vc+sd-jwt' | 'mso_mdoc';

export type GrantType = 'authorization_code' | 'urn:ietf:params:oauth:grant-type:pre-authorized_code';

export interface CredentialOffer {
    credential_issuer: string;
    credentials: CredentialFormat[];
    grants: {
        authorization_code?: {
            issuer_state: string;
        };
        "urn:ietf:params:oauth:grant-type:pre-authorized_code"?: {
            "pre-authorized_code": string;
            user_pin_required: boolean;
        };
    };
}

export interface CredentialFormat {
    format: DocumentType;
    types: string[];
    doctype?: string;
}

export interface IssuerMetadata {
    credential_issuer: string;
    authorization_endpoint?: string;
    token_endpoint: string;
    credential_endpoint: string;
    batch_credential_endpoint?: string;
    jwks_uri: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    c_nonce?: string;
    c_nonce_expires_in?: number;
}

export interface CredentialResponse {
    format: string;
    credential: string;
    c_nonce?: string;
    c_nonce_expires_in?: number;
}

export interface DPoPProof {
    header: {
        typ: 'dpop+jwt';
        alg: string;
        jwk: Record<string, any>;
    };
    payload: {
        iat: number;
        jti: string;
        htm: string;
        htu: string;
        ath?: string;
    };
}

export interface PreAuthorizedCodeGrant {
    "pre-authorized_code": string;
    user_pin_required: boolean;
}

export interface AuthorizationCodeGrant {
    issuer_state: string;
}