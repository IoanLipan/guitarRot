#!/usr/bin/env bash
# Registers Google sign-in's return address in the iOS app: copies REVERSED_CLIENT_ID from
# GoogleService-Info.plist into Info.plist's CFBundleURLTypes. Google's sign-in SDK refuses to
# start (it throws, and the app closes) unless that scheme is registered.
#
#   scripts/ios-google-url-scheme.sh [GoogleService-Info.plist] [Info.plist]
#
# Safe to run as often as you like: it adds the entry once, and rewrites it if the plist's value
# changed. Run it every time you download a new GoogleService-Info.plist, and before archiving.
#
# A freshly registered iOS app's plist has no REVERSED_CLIENT_ID until Google sign-in is switched
# on in the Firebase console (Authentication > Sign-in method > Google > Enable). Switch it on,
# download GoogleService-Info.plist again (Project settings > Your apps > iOS), put it in
# ios/App/App/, then run this script. Until then it says so and changes nothing.
set -euo pipefail
cd "$(dirname "$0")/.."

firebase_plist="${1:-ios/App/App/GoogleService-Info.plist}"
info_plist="${2:-ios/App/App/Info.plist}"
plist_buddy=/usr/libexec/PlistBuddy
# Our entry is found by this name, so a changed value replaces it instead of adding a second one.
entry_name="com.guitarrot.google-sign-in"

if [ ! -f "$firebase_plist" ]; then
  echo "No $firebase_plist: download GoogleService-Info.plist from the Firebase console first." >&2
  exit 1
fi

reversed_id=$("$plist_buddy" -c "Print :REVERSED_CLIENT_ID" "$firebase_plist" 2>/dev/null || true)
if [ -z "$reversed_id" ]; then
  echo "$firebase_plist has no REVERSED_CLIENT_ID: Google sign-in is not switched on for the iOS app." >&2
  echo "Firebase console > Authentication > Sign-in method > Google > Enable, then download" >&2
  echo "GoogleService-Info.plist again and re-run this script." >&2
  exit 1
fi

"$plist_buddy" -c "Print :CFBundleURLTypes" "$info_plist" >/dev/null 2>&1 \
  || "$plist_buddy" -c "Add :CFBundleURLTypes array" "$info_plist"

# Find our entry, if it is already there.
index=0
found=-1
while "$plist_buddy" -c "Print :CFBundleURLTypes:$index" "$info_plist" >/dev/null 2>&1; do
  name=$("$plist_buddy" -c "Print :CFBundleURLTypes:$index:CFBundleURLName" "$info_plist" 2>/dev/null || true)
  if [ "$name" = "$entry_name" ]; then found=$index; break; fi
  index=$((index + 1))
done

if [ "$found" -ge 0 ]; then
  current=$("$plist_buddy" -c "Print :CFBundleURLTypes:$found:CFBundleURLSchemes:0" "$info_plist" 2>/dev/null || true)
  if [ "$current" = "$reversed_id" ]; then
    echo "Info.plist already registers $reversed_id."
    exit 0
  fi
  "$plist_buddy" -c "Set :CFBundleURLTypes:$found:CFBundleURLSchemes:0 $reversed_id" "$info_plist"
  echo "Updated the Google URL scheme in $info_plist to $reversed_id."
else
  "$plist_buddy" \
    -c "Add :CFBundleURLTypes:$index dict" \
    -c "Add :CFBundleURLTypes:$index:CFBundleURLName string $entry_name" \
    -c "Add :CFBundleURLTypes:$index:CFBundleTypeRole string Editor" \
    -c "Add :CFBundleURLTypes:$index:CFBundleURLSchemes array" \
    -c "Add :CFBundleURLTypes:$index:CFBundleURLSchemes:0 string $reversed_id" \
    "$info_plist"
  echo "Registered the Google URL scheme $reversed_id in $info_plist."
fi
