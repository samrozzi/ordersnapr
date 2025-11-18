/**
 * Secure Storage Wrapper
 * Encrypts sensitive data before storing in localStorage
 *
 * Usage:
 * ```ts
 * import { secureStorage } from '@/lib/secure-storage';
 *
 * // Store encrypted data
 * await secureStorage.setItem('apiKey', myApiKey);
 *
 * // Retrieve and decrypt data
 * const apiKey = await secureStorage.getItem('apiKey');
 * ```
 */

/**
 * Simple encryption using Web Crypto API
 * Note: This provides obfuscation, not military-grade security
 * For highly sensitive data, consider server-side storage
 */
class SecureStorage {
  private algorithm = 'AES-GCM';
  private keyMaterial: CryptoKey | null = null;

  /**
   * Derive encryption key from user-specific data
   * In production, this could use a combination of:
   * - User ID
   * - Session token
   * - Device fingerprint
   */
  private async getKey(): Promise<CryptoKey> {
    if (this.keyMaterial) {
      return this.keyMaterial;
    }

    // For now, use a consistent key
    // In production, this should be unique per user/session
    const encoder = new TextEncoder();
    const keyData = encoder.encode('ordersnapr-encryption-key-v1');

    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.keyMaterial = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('ordersnapr-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      importedKey,
      { name: this.algorithm, length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return this.keyMaterial;
  }

  /**
   * Encrypt and store data
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      const encryptionKey = await this.getKey();
      const encoder = new TextEncoder();
      const data = encoder.encode(value);

      // Generate a random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv,
        },
        encryptionKey,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Store as base64
      const base64 = btoa(String.fromCharCode(...combined));
      localStorage.setItem(`secure:${key}`, base64);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to securely store data');
    }
  }

  /**
   * Retrieve and decrypt data
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const stored = localStorage.getItem(`secure:${key}`);
      if (!stored) return null;

      const encryptionKey = await this.getKey();

      // Decode from base64
      const combined = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv,
        },
        encryptionKey,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      // If decryption fails, remove the corrupted data
      this.removeItem(key);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key: string): void {
    localStorage.removeItem(`secure:${key}`);
  }

  /**
   * Check if item exists
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(`secure:${key}`) !== null;
  }

  /**
   * Clear all secure storage items
   */
  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('secure:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

export const secureStorage = new SecureStorage();

/**
 * Migration helper to move existing sensitive data to secure storage
 */
export async function migrateToSecureStorage(
  oldKey: string,
  newKey?: string
): Promise<void> {
  const value = localStorage.getItem(oldKey);
  if (value) {
    await secureStorage.setItem(newKey || oldKey, value);
    localStorage.removeItem(oldKey);
  }
}
