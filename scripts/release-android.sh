#!/usr/bin/env bash
# Builds a signed release of the Android app from the current web code:
#   release/guitarRot-<version>.aab  — upload this to Google Play
#   release/guitarRot.apk            — sideload this on a phone / attach to a GitHub release
#
# Needs android/keystore.properties (see store/listing.md → Release). Bump
# versionCode in android/app/build.gradle before every Play upload.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${JAVA_HOME:=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export JAVA_HOME

if [ ! -f android/keystore.properties ]; then
  echo "android/keystore.properties is missing: release builds would be unsigned." >&2
  exit 1
fi

version=$(node -p "require('./package.json').version")

# A stale sync ships old web code inside a new APK, so always build and sync.
npm run build
./node_modules/.bin/cap sync android

(cd android && ./gradlew --console=plain bundleRelease assembleRelease)

mkdir -p release
cp android/app/build/outputs/bundle/release/app-release.aab "release/guitarRot-$version.aab"
cp android/app/build/outputs/apk/release/app-release.apk release/guitarRot.apk

"$(ls -d "${ANDROID_HOME:-$HOME/Library/Android/sdk}"/build-tools/* | sort -V | tail -1)/apksigner" \
  verify release/guitarRot.apk
echo "Built release/guitarRot-$version.aab and release/guitarRot.apk ($version)"
