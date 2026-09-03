#!/usr/bin/env node
// Fails if any locale's messages/*.json has a key set that diverges from
// en.json (missing or extra) - the runtime onError guard in
// src/i18n/request.ts only catches this per-render, per-locale; this
// catches it for all four locales up front, in CI, before merge.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(dir, '..', 'messages');
const locales = ['en', 'uk', 'ru', 'es'];

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const messages = Object.fromEntries(
  locales.map((locale) => [
    locale,
    JSON.parse(readFileSync(path.join(messagesDir, `${locale}.json`), 'utf-8')),
  ]),
);

const referenceKeys = new Set(flattenKeys(messages.en));
let failed = false;

for (const locale of locales) {
  if (locale === 'en') continue;
  const localeKeys = new Set(flattenKeys(messages[locale]));

  const missing = [...referenceKeys].filter((key) => !localeKeys.has(key));
  const extra = [...localeKeys].filter((key) => !referenceKeys.has(key));

  if (missing.length > 0) {
    failed = true;
    console.error(`${locale}.json is missing keys:\n  ${missing.join('\n  ')}`);
  }
  if (extra.length > 0) {
    failed = true;
    console.error(
      `${locale}.json has extra keys not in en.json:\n  ${extra.join('\n  ')}`,
    );
  }
}

if (failed) {
  process.exit(1);
}
console.log(
  `messages/*.json key parity OK (${referenceKeys.size} keys, ${locales.length} locales).`,
);
