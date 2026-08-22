#!/usr/bin/env node
// FITNESS-12 CI gate: "Lighthouse PWA-installability checks pass in CI".
//
// Lighthouse 10 dropped the PWA category (and its installable-manifest/
// service-worker/maskable-icon/etc audits) from core into what used to be
// a separate plugin - see the Lighthouse changelog's "Notable changes >
// PWA Category" entry. lighthouse@9 is the last version that still ships
// these audits, so it's pinned here specifically for this one check
// (see frontend/package.json's devDependencies) rather than chasing a
// moving target. Run directly via the Node API (not the CLI, not lhci)
// - it's one binary pass/fail assertion, not a dashboard, so lhci's
// server/config surface would be more machinery than this needs.
//
// Targets /en/health because it's the one route that never requires a
// live Hub session or backend (see proxy.ts) - the manifest, icons, and
// service-worker registration this checks all live in the root layout,
// so any route proves the same thing.
import { writeFileSync } from 'node:fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const URL_TO_AUDIT =
  process.env.PWA_CHECK_URL ?? 'http://localhost:3000/en/health';

// The installability signals proper - splash-screen/themed-omnibox/
// content-width are cosmetic PWA-optimized audits, not required for
// "installable to a device home screen" per se, but cheap to assert too
// since a real regression there is still worth catching.
const REQUIRED_AUDITS = [
  'installable-manifest',
  'service-worker',
  'viewport',
  'apple-touch-icon',
  'maskable-icon',
];

async function main() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  });

  let runnerResult;
  try {
    runnerResult = await lighthouse(URL_TO_AUDIT, {
      port: chrome.port,
      onlyCategories: ['pwa'],
      output: 'json',
    });
  } finally {
    await chrome.kill();
  }

  const { lhr } = runnerResult;
  writeFileSync('lighthouse-pwa-report.json', runnerResult.report);

  const failures = REQUIRED_AUDITS.filter((id) => {
    const audit = lhr.audits[id];
    return !audit || audit.score !== 1;
  });

  console.log(`Lighthouse PWA audit for ${URL_TO_AUDIT}:`);
  for (const id of REQUIRED_AUDITS) {
    const audit = lhr.audits[id];
    const status = audit && audit.score === 1 ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${id} - ${audit?.title ?? 'missing audit'}`);
  }

  if (failures.length > 0) {
    console.error(
      `\nPWA installability check failed: ${failures.join(', ')}. See lighthouse-pwa-report.json for detail.`,
    );
    process.exit(1);
  }

  console.log('\nAll required PWA installability audits passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
