#!/usr/bin/env node
// One-off script: translates messages/en.json into a target locale via
// DeepL, filling in messages/<locale>.json. Keys that already have a
// non-empty translation are left untouched, so a re-run only fills gaps.
//
// Usage: node scripts/translate-messages.mjs <uk|ru|es>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, '..');
const messagesDir = path.join(frontendRoot, 'messages');
const envPath = path.join(frontendRoot, '..', 'backend', '.env');

function loadDeeplApiKey() {
  const env = fs.readFileSync(envPath, 'utf8');
  const match = env.match(/^DEEPL_API_KEY=(.+)$/m);
  if (!match) {
    throw new Error(`DEEPL_API_KEY not found in ${envPath}`);
  }
  return match[1].trim();
}

// Same request shape as backend/src/scripts/seed-food-catalog.ts's
// translate() - free-tier keys (":fx" suffix) must hit the api-free host,
// and a 429 gets a growing backoff on top of the fixed inter-call delay
// applied by translateWithDelay below. source_lang is pinned to EN since
// a short, placeholder-heavy phrase (e.g. "Set {number}") is otherwise
// sometimes auto-detected as a different language, which can make DeepL
// return an empty translation for some target locales.
async function translate(text, targetLocale, apiKey, attempts = 5) {
  const host = apiKey.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(`https://${host}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text,
        source_lang: 'EN',
        target_lang: targetLocale.toUpperCase(),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.translations[0].text;
    }
    if (res.status === 429 && attempt < attempts) {
      await new Promise((r) => setTimeout(r, attempt * 5000));
      continue;
    }
    throw new Error(`DeepL request failed: ${res.status}`);
  }
  throw new Error('DeepL request failed: exhausted retries');
}

const DEEPL_CALL_DELAY_MS = 250;

// Replaces each {placeholder} with a positional sentinel token before
// sending to DeepL, then swaps the sentinels back for the original
// {name} afterwards - DeepL's plain-text mode otherwise "translates" the
// token too (e.g. {date} -> {дата}). Sentinels are plain alphanumeric
// words (QPH0Q, QPH1Q, ...), not curly-brace or XML-tag syntax - both of
// those were tried first and each had a target-locale-specific case
// where DeepL returned an empty translation for a short phrase.
async function translateWithDelay(text, targetLocale, apiKey) {
  const names = [];
  const wrapped = text.replace(/\{(\w+)\}/g, (_, name) => {
    const token = `QPH${names.length}Q`;
    names.push(name);
    return token;
  });
  const translated = await translate(wrapped, targetLocale, apiKey);
  await new Promise((r) => setTimeout(r, DEEPL_CALL_DELAY_MS));
  return translated.replace(
    /QPH(\d+)Q/g,
    (_, index) => `{${names[Number(index)]}}`,
  );
}

// Matches this repo's one ICU shape: an optional prefix/suffix around a
// `{var, plural, one {...} other {...}}` block (see messages/en.json).
// Only the prose is sent to DeepL - the plural syntax itself, and the
// leading "#" count placeholder in each branch, are never touched, so a
// translated message still parses as valid ICU and still shows the number.
const PLURAL_RE =
  /^(.*)\{(\w+),\s*plural,\s*one\s*\{([^{}]*)\}\s*other\s*\{([^{}]*)\}\}(.*)$/s;

async function translatePluralBranch(text, targetLocale, apiKey) {
  const hashMatch = text.match(/^#\s*(.*)$/);
  if (!hashMatch) return translateWithDelay(text, targetLocale, apiKey);
  const rest = hashMatch[1];
  if (!rest) return '#';
  const translatedRest = await translateWithDelay(rest, targetLocale, apiKey);
  return `# ${translatedRest}`;
}

async function translateValue(text, targetLocale, apiKey) {
  const pluralMatch = text.match(PLURAL_RE);
  if (pluralMatch) {
    const [, prefix, varName, oneText, otherText, suffix] = pluralMatch;
    const translatedPrefix = prefix
      ? await translateWithDelay(prefix, targetLocale, apiKey)
      : '';
    const translatedSuffix = suffix
      ? await translateWithDelay(suffix, targetLocale, apiKey)
      : '';
    const translatedOne = await translatePluralBranch(
      oneText,
      targetLocale,
      apiKey,
    );
    const translatedOther = await translatePluralBranch(
      otherText,
      targetLocale,
      apiKey,
    );
    return `${translatedPrefix}{${varName}, plural, one {${translatedOne}} other {${translatedOther}}}${translatedSuffix}`;
  }
  return translateWithDelay(text, targetLocale, apiKey);
}

// Sanity check that translateWithDelay's sentinel round-trip actually
// restored every placeholder, so a mismatch is visible in the script's
// output instead of silently shipping a broken interpolation.
function placeholderNames(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

async function translateMessages(
  source,
  existing,
  targetLocale,
  apiKey,
  stats,
  keyPath,
) {
  const result = {};
  for (const [key, value] of Object.entries(source)) {
    const nextPath = keyPath ? `${keyPath}.${key}` : key;
    if (typeof value === 'string') {
      const existingValue = existing?.[key];
      if (typeof existingValue === 'string' && existingValue.length > 0) {
        result[key] = existingValue;
        continue;
      }
      try {
        const translated = await translateValue(value, targetLocale, apiKey);
        const before = placeholderNames(value);
        const after = placeholderNames(translated);
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          console.warn(
            `DeepL: placeholder mismatch on ${nextPath} -> ${targetLocale}: expected [${before}], got [${after}]`,
          );
        }
        result[key] = translated;
        stats.translated++;
      } catch (err) {
        console.warn(
          `DeepL: giving up on ${nextPath} -> ${targetLocale} (${String(err)})`,
        );
        result[key] = value;
        stats.failed++;
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = await translateMessages(
        value,
        existing?.[key],
        targetLocale,
        apiKey,
        stats,
        nextPath,
      );
    }
  }
  return result;
}

async function main() {
  const targetLocale = process.argv[2];
  if (!targetLocale || !['uk', 'ru', 'es'].includes(targetLocale)) {
    console.error('Usage: node scripts/translate-messages.mjs <uk|ru|es>');
    process.exit(1);
  }

  const apiKey = loadDeeplApiKey();
  const en = JSON.parse(
    fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'),
  );
  const targetPath = path.join(messagesDir, `${targetLocale}.json`);
  const existing = fs.existsSync(targetPath)
    ? JSON.parse(fs.readFileSync(targetPath, 'utf8'))
    : {};

  const stats = { translated: 0, failed: 0 };
  const result = await translateMessages(
    en,
    existing,
    targetLocale,
    apiKey,
    stats,
    '',
  );

  fs.writeFileSync(targetPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    `${targetLocale}: translated ${stats.translated} key(s), ${stats.failed} failed (kept English).`,
  );
  if (stats.failed > 0) {
    console.warn(`${targetLocale}: re-run to retry the failed key(s).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
