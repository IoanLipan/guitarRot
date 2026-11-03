#!/bin/sh
# Runs a command with a JDK on the PATH. The Firebase emulators (the Firestore
# one) are Java programs and `firebase` looks for `java` on the PATH.
#
#   scripts/with-java.sh firebase emulators:start --only auth,firestore
#
# Uses the JAVA_HOME you already have if it points at a real JDK; otherwise
# Homebrew's OpenJDK 21 (`brew install openjdk@21`), on Apple silicon or Intel.
if [ ! -x "$JAVA_HOME/bin/java" ]; then
  JAVA_HOME=""
  for candidate in \
    /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home; do
    if [ -x "$candidate/bin/java" ]; then
      JAVA_HOME="$candidate"
      break
    fi
  done
fi
if [ -n "$JAVA_HOME" ]; then
  export JAVA_HOME
  PATH="$JAVA_HOME/bin:$PATH"
  export PATH
fi
exec "$@"
