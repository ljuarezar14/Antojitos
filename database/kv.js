// The subset of the Workers KV API that cloudflare/backup.js uses, kept in a local folder.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function folderStore(directory) {
  mkdirSync(directory, { recursive: true });
  const file = key => join(directory, encodeURIComponent(key));
  return {
    async put(key, value, { expirationTtl, metadata } = {}) {
      writeFileSync(`${file(key)}.data`, Buffer.from(value));
      const expires = expirationTtl ? Date.now() + expirationTtl * 1000 : null;
      writeFileSync(`${file(key)}.meta`, JSON.stringify({ metadata, expires }));
    },
    async get(key) {
      if (!existsSync(`${file(key)}.data`)) return null;
      const bytes = readFileSync(`${file(key)}.data`);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
    async list({ prefix = '' } = {}) {
      const keys = [];
      for (const name of readdirSync(directory).filter(name => name.endsWith('.meta'))) {
        const key = decodeURIComponent(name.slice(0, -'.meta'.length));
        if (!key.startsWith(prefix)) continue;
        const { metadata, expires } = JSON.parse(readFileSync(join(directory, name), 'utf8'));
        if (expires && expires < Date.now()) {
          rmSync(`${file(key)}.data`, { force: true });
          rmSync(`${file(key)}.meta`, { force: true });
          continue;
        }
        keys.push({ name: key, metadata });
      }
      return { keys, list_complete: true };
    }
  };
}
