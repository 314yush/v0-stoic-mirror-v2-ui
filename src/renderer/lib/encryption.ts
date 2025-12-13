/**
 * Encryption Library
 * Client-side encryption using Web Crypto API
 * Password-derived keys (Option A) - Zero-knowledge architecture
 */

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits for GCM
const TAG_LENGTH = 128 // 128 bits for authentication tag
const PBKDF2_ITERATIONS = 100000 // OWASP recommended minimum
const PBKDF2_HASH = 'SHA-256'
const KEY_DERIVATION_ALGORITHM = 'PBKDF2'

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

/**
 * Derive encryption key from password using PBKDF2
 * @param password - User's password
 * @param salt - Salt for key derivation (should be stored per user)
 * @returns CryptoKey for encryption/decryption
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Convert password to ArrayBuffer
  const passwordBuffer = new TextEncoder().encode(password)

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ['deriveKey']
  )

  // Derive encryption key using PBKDF2
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    {
      name: ENCRYPTION_ALGORITHM,
      length: KEY_LENGTH,
    },
    false, // Not extractable (security best practice)
    ['encrypt', 'decrypt']
  )

  return encryptionKey
}

/**
 * Encrypt data using AES-GCM
 * @param data - Plaintext data to encrypt
 * @param key - Encryption key (derived from password)
 * @returns Encrypted data with IV (base64 encoded)
 */
export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<string> {
  // Generate random IV for this encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  // Convert data to ArrayBuffer
  const dataBuffer = new TextEncoder().encode(data)

  // Encrypt data
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    dataBuffer
  )

  // Combine IV and encrypted data
  // Format: [IV (12 bytes)][Encrypted Data + Tag]
  const combined = new Uint8Array(IV_LENGTH + encryptedBuffer.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encryptedBuffer), IV_LENGTH)

  // Convert to base64 for storage
  return arrayBufferToBase64(combined.buffer)
}

/**
 * Decrypt data using AES-GCM
 * @param encryptedData - Encrypted data with IV (base64 encoded)
 * @param key - Decryption key (derived from password)
 * @returns Decrypted plaintext data
 */
export async function decryptData(
  encryptedData: string,
  key: CryptoKey
): Promise<string> {
  // Convert from base64
  const combined = base64ToArrayBuffer(encryptedData)
  const combinedArray = new Uint8Array(combined)

  // Extract IV (first 12 bytes)
  const iv = combinedArray.slice(0, IV_LENGTH)

  // Extract encrypted data (rest of the bytes)
  const encryptedBuffer = combinedArray.slice(IV_LENGTH)

  // Decrypt data
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    encryptedBuffer
  )

  // Convert back to string
  return new TextDecoder().decode(decryptedBuffer)
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Convert Uint8Array to base64 string (for storing salt)
 */
export function saltToBase64(salt: Uint8Array): string {
  return arrayBufferToBase64(salt.buffer)
}

/**
 * Convert base64 string to Uint8Array (for loading salt)
 */
export function base64ToSalt(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64))
}

/**
 * Check if Web Crypto API is available
 */
export function isEncryptionSupported(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.getRandomValues !== 'undefined'
  )
}

/**
 * Encryption metadata structure
 */
export interface EncryptedData {
  encrypted: true
  encryption_version: number
  algorithm: string
}

/**
 * Test encryption/decryption (for debugging)
 */
export async function testEncryption(password: string): Promise<boolean> {
  try {
    const salt = generateSalt()
    const key = await deriveKeyFromPassword(password, salt)
    const testData = 'Test encryption data'
    
    const encrypted = await encryptData(testData, key)
    const decrypted = await decryptData(encrypted, key)
    
    return decrypted === testData
  } catch (error) {
    console.error('Encryption test failed:', error)
    return false
  }
}

