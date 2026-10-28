#!/usr/bin/env bash
# Builds a signed release of the Android app from the current web code:
#   release/guitarRot-<version>.aab  — upload this to Google Play
#   release/guitarRot.apk            — sideload this on a phone / attach to a GitHub release
#
# Needs android/keystore.properties (see store/listing.md → Release). Bump
# versionCode in android/app/build.gradle before every Play upload.
set -euo pipefail
cd "$(dirname "$0")/.."

# Use JAVA_HOME if it points at a real JDK; otherwise the first JDK 21 found.
# (A JAVA_HOME left pointing at a moved or uninstalled Android Studio is
# common, and Gradle fails on it with a confusing message.)
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  JAVA_HOME=""
  for candidate in \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
    /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
    "$(/usr/libexec/java_home -v 21 2>/dev/null || true)"; do
    if [ -n "$candidate" ] && [ -x "$candidate/bin/java" ]; then JAVA_HOME="$candidate"; break; fi
  done
  if [ -z "$JAVA_HOME" ]; then
    echo "No JDK 21 found: install one (brew install openjdk@21) or set JAVA_HOME." >&2
    exit 1
  fi
fi
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
