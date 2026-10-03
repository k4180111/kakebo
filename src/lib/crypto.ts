import { isKakeiboBackup, type KakeiboBackup } from './db';

const FORMAT = 'kakeibo-encrypted-backup';
const ITERATIONS = 310_000;

interface EncryptedEnvelope {
  format: typeof FORMAT;
  version: 1;
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptBackup(backup: KakeiboBackup, passphrase: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(backup));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const envelope: EncryptedEnvelope = {
    format: FORMAT,
    version: 1,
    kdf: 'PBKDF2-SHA-256',
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
  return new Blob([JSON.stringify(envelope)], { type: 'application/octet-stream' });
}

export async function decryptBackup(file: File, passphrase: string): Promise<KakeiboBackup> {
  const parsed: unknown = JSON.parse(await file.text());
  if (!parsed || typeof parsed !== 'object') throw new Error('Файл не распознан как резервная копия Kakeibo.');
  const envelope = parsed as Partial<EncryptedEnvelope>;
  if (envelope.format !== FORMAT || envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA-256'
    || !Number.isInteger(envelope.iterations) || envelope.iterations! < 100_000 || envelope.iterations! > 1_000_000
    || typeof envelope.salt !== 'string' || typeof envelope.iv !== 'string'
    || typeof envelope.ciphertext !== 'string') {
    throw new Error('Формат резервной копии не поддерживается.');
  }

  let plaintext: ArrayBuffer;
  try {
    const key = await deriveKey(passphrase, fromBase64(envelope.salt), envelope.iterations!);
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(envelope.iv) },
      key,
      fromBase64(envelope.ciphertext),
    );
  } catch {
    throw new Error('Не удалось расшифровать файл. Проверьте пароль и целостность копии.');
  }

  const data: unknown = JSON.parse(new TextDecoder().decode(plaintext));
  if (!isKakeiboBackup(data)) throw new Error('В расшифрованном файле нет корректных данных Kakeibo.');
  return data;
}
