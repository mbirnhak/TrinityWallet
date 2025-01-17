import { bcryptHash, bcryptVerifyHash, generateSalt, shaHash, verifyAgainstShaHash } from "@/services/crypto";

jest.mock('expo-secure-store');

describe('bcryptVerifyHash', () => {
    const actualVal = '123456';
    const differentVal = '654321';

    it('should return true when the same value is verified against the hash', async () => {
        // Generate the hash for the actual value
        const hash = await bcryptHash(actualVal);
        expect(hash).not.toBeNull();
        console.log(hash);

        // Verify that the hash matches the original value
        const isMatch = await bcryptVerifyHash(actualVal, hash!);
        expect(isMatch).toBe(true);
    });

    it('should return false when a different value is verified against the hash', async () => {
        // Generate the hash for the actual value
        const hash = await bcryptHash(actualVal);
        expect(hash).not.toBeNull();

        // Verify that the hash does not match the different value
        const isMatch = await bcryptVerifyHash(differentVal, hash!);
        expect(isMatch).toBe(false);
    });
});