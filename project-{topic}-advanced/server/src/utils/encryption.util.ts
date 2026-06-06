import crypto from 'crypto';
import { AppError } from './appError';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new AppError('ENCRYPTION_KEY is not defined in environment variables.', 500);
  }
  // Key must be 32 bytes (256 bits) for aes-256-cbc
  if (key.length !== 32) {
    throw new AppError('ENCRYPTION_KEY must be exactly 32 characters long.', 500);
  }
  return Buffer.from(key, 'utf8');
};

export const encrypt = (text: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decrypt = (text: string): string => {
  const key = getEncryptionKey();
  const textParts = text.split(':');
  if (textParts.length !== 2) {
    throw new AppError('Invalid encrypted text format.', 400);
  }
  const iv = Buffer.from(textParts.shift() as string, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};