import crypto from 'crypto';
import { config } from '@/config';

const ALGORITHM = 'aes-256-cbc';
// Ensure the key is exactly 32 bytes for aes-256
const ENCRYPTION_KEY = Buffer.from(config.encryptionKey.padEnd(32, '0').slice(0, 32), 'utf-8');

/**
 * Encrypts a plain text string into a cipher text with IV.
 * Format: IV:EncryptedText
 */
export function encryptMessage(text: string): string {
  if (!text) return text;
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return text; // Fallback or strict error depending on requirements
  }
}

/**
 * Decrypts a cipher text formatted as IV:EncryptedText.
 * If decryption fails (e.g. legacy plain text), it returns the original text.
 */
export function decryptMessage(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  
  if (!encryptedText.includes(':')) {
    // Likely a legacy plain-text message without an IV prefix
    return encryptedText;
  }

  try {
    const [ivHex, cipherText] = encryptedText.split(':');
    
    // Quick validation to prevent crashing on arbitrary colons
    if (ivHex.length !== 32) return encryptedText;

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(cipherText, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    
    return decrypted;
  } catch (error) {
    // If decipher fails (wrong key, corrupted text, or it was actually just a plaintext containing ':')
    // swallow error and return the original text as a fallback
    return encryptedText;
  }
}
