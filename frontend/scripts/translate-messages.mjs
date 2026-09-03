#!/usr/bin/env node
// Fills messages/<locale>.json from messages/en.json via DeepL; a key
// with an existing non-empty value is left alone, so re-runs only fill gaps.
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

// Same request shape as seed-food-catalog.ts's translate(). source_lang
// is pinned to EN - a short phrase like "Set {number}" can otherwise get
// auto-detected as a different language, which makes DeepL return "".
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

// Swaps each {placeholder} for a plain-word sentinel before translating
// and back afterwards - DeepL's plain-text mode otherwise translates the
// token too (e.g. {date} -> {дата}).
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
// `{var, plural, one {...} other {...}}` block - only the prose inside
// gets translated, so the result still parses as valid ICU.
const PLURAL_RE =
  /^(.*)\{(\w+),\s*plural,\s*one\s*\{([^{}]*)\}\s*other\s*\{([^{}]*)\}\}(.*)$/s;

// Translates the "one" and "other" branches in a single call (joined by
// a separator DeepL leaves alone) rather than two independent ones -
// otherwise it can pick a different word for the same noun in each
// branch (e.g. "review" vs "reviews" translated inconsistently).
async function translatePluralBranches(
  oneText,
  otherText,
  targetLocale,
  apiKey,
) {
  const oneMatch = oneText.match(/^#\s*(.*)$/);
  const otherMatch = otherText.match(/^#\s*(.*)$/);
  const oneRest = oneMatch ? oneMatch[1] : oneText;
  const otherRest = otherMatch ? otherMatch[1] : otherText;
  if (!oneRest && !otherRest) return { one: '#', other: '#' };

  const translated = await translateWithDelay(
    `${oneRest} ||| ${otherRest}`,
    targetLocale,
    apiKey,
  );
  const [translatedOneRest = '', translatedOtherRest = ''] = translated
    .split('|||')
    .map((s) => s.trim());
  return {
    one: oneMatch ? `# ${translatedOneRest}` : translatedOneRest,
    other: otherMatch ? `# ${translatedOtherRest}` : translatedOtherRest,
  };
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
    const { one: translatedOne, other: translatedOther } =
      await translatePluralBranches(oneText, otherText, targetLocale, apiKey);
    return `${translatedPrefix}{${varName}, plural, one {${translatedOne}} other {${translatedOther}}}${translatedSuffix}`;
  }
  return translateWithDelay(text, targetLocale, apiKey);
}

// Confirms translateWithDelay's sentinel round-trip restored every
// placeholder, instead of silently shipping a broken interpolation.
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
