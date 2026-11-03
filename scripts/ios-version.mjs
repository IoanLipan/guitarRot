#!/usr/bin/env node
// Keeps the iOS app's version in step with the rest of the project:
//   MARKETING_VERSION       = "version" in package.json         (the name people see)
//   CURRENT_PROJECT_VERSION = versionCode in android/app/build.gradle  (the build number)
// Android's versionCode only ever goes up, so reusing it keeps the iOS build number
// rising too, and one "bump the version" step covers both stores.
//
//   node scripts/ios-version.mjs          write both into the Xcode project
//   node scripts/ios-version.mjs --check  change nothing; exit 1 if they differ
//
// Run it after bumping package.json and versionCode, before archiving in Xcode.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const { version } = JSON.parse(read('package.json'));
const code = /^\s*versionCode\s+(\d+)\s*$/m.exec(read('android/app/build.gradle'))?.[1];
if (code === undefined) {
  console.error('No versionCode found in android/app/build.gradle.');
  process.exit(1);
}

const projectPath = new URL('ios/App/App.xcodeproj/project.pbxproj', root);
const project = readFileSync(projectPath, 'utf8');

// Debug and Release of the App target each carry both settings.
const marketing = /MARKETING_VERSION = [^;]+;/g;
const build = /CURRENT_PROJECT_VERSION = [^;]+;/g;
const next = project
  .replace(marketing, `MARKETING_VERSION = ${version};`)
  .replace(build, `CURRENT_PROJECT_VERSION = ${code};`);

if (process.argv.includes('--check')) {
  if (next !== project) {
    console.error(`The Xcode project is out of step: it should say ${version} (${code}). Run: node scripts/ios-version.mjs`);
    process.exit(1);
  }
  console.log(`iOS version is in step: ${version} (${code})`);
} else {
  writeFileSync(projectPath, next);
  console.log(`iOS ${fileURLToPath(projectPath).replace(fileURLToPath(root), '')}: ${version} (${code})`);
}
