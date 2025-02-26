// List of all keys used to store values in Secure Store
export enum storedValueKeys {
    PIN = 'walletPIN',
    EMAIL = 'hashedEmail',
    ID_TOKEN = 'idToken',
    OIDC_REGISTERED = 'oidcRegistered',
    PIN_REGISTERED = 'pinRegistered',
    BIOMETRIC_REGISTERED = 'biometricsRegistered',
    METADATA_STORAGE_KEY = 'issuer_metadata',
    CODE_VERIFIER_KEY = 'code_verifier',
    STATE_KEY = 'auth_state',
}

export enum constants {
    DEEP_LINK_PREFIX = 'trinwallet://',
    ISS_PATH = 'callback',
    ISSUER_URL = 'https://issuer.eudiw.dev',
    EU_ISSUER_CLIENT_ID = 'ID',
}