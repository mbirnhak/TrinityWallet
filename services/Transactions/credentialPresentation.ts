// services/Transaction/credentialPresentation.ts
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import base64url from 'base64url';
import { CredentialStorage } from '../credentialStorage';
import { createSdJwt, SdJwt } from '../Credentials/SdJwtVc';

async function createKbJwt(aud: string, sdHash: string, nonce: string): Promise<string> {
    try {
        console.log('[KB-JWT] Creating Key Binding JWT');

        // Get stored key pair or generate a new one if needed
        const privateKeyJson = await SecureStore.getItemAsync("priv-key");
        const publicKeyJson = await SecureStore.getItemAsync("pub-key");

        if (!privateKeyJson || !publicKeyJson) {
            throw new Error("Keys not found in secure storage");
        }

        const privateKey = JSON.parse(privateKeyJson);
        const publicKey = JSON.parse(publicKeyJson);

        // Create JWT header
        const header = {
            "typ": "kb+jwt",
            "alg": "ES256"
        };

        // Create payload with required claims
        const payload = {
            "iat": Math.floor(Date.now() / 1000), // The time at which the KB JWT was issued
            "aud": aud, // The intended receiver of the KB JWT
            "nonce": nonce, // Ensures the freshness of the signature
            "sd_hash": sdHash // The base64url-encoded hash value over the SD-JWT
        };

        // Create the signing input (header.payload)
        const encodedHeader = base64url(JSON.stringify(header));
        const encodedPayload = base64url(JSON.stringify(payload));
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        // Create an SdJwt instance to use for signing
        const sdJwt = await createSdJwt(privateKey, publicKey);

        // Sign the input
        const signature = await sdJwt.signJwt(signingInput);
        if (!signature) {
            throw new Error("JWT signature could not be generated");
        }

        // Encode the signature and create the full JWT
        const encodedSignature = base64url(signature);
        const jwt = `${signingInput}.${encodedSignature}`;

        console.log('[KB-JWT] Generated JWT:', jwt.substring(0, 50) + '...');
        return jwt;
    } catch (error) {
        console.error('[KB-JWT] Error creating Key Binding JWT:', error);
        throw error;
    }
}

export function useCredentialPresentationDeepLinkHandler() {
    const url = Linking.useURL();
}