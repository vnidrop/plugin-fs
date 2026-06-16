# Testing Vnidrop FS

This plugin uses layered tests so common regressions stay cheap while Android
and iOS runtime behavior can still be verified on native runtimes.

## Fast Local Checks

Run the default host test suite:

```sh
npm run check
```

This runs:

- `npm run build`
- `npm run test`
- `npm run test:types`
- `cargo check --all-features`
- `cargo test`

Check the example app wiring separately:

```sh
npm run example:check
```

## JavaScript Tests

```sh
npm run test
npm run test:types
```

Vitest covers the package contract:

- root exports stay portable
- Android-only functions are exported from `@vnidrop/tauri-plugin-fs/android`
- iOS-only functions are exported from `@vnidrop/tauri-plugin-fs/ios`
- desktop calls delegate to official Tauri FS/dialog plugins
- Android branches delegate to the Android subpath implementation
- iOS branches delegate to the iOS subpath implementation
- picker options and desktop unique-name generation stay stable

`npm run test:types` builds the package first in normal workflows, then checks
imports from the root, Android, and iOS package entrypoints.

## Rust Tests

```sh
cargo check --all-features
cargo test
```

Rust tests cover:

- URI/path conversion fixtures
- Android URI JSON field shape
- config parsing and unknown-field rejection
- command error serialization
- generated permission profiles
- plugin initialization with `tauri::test::mock_builder`

Reusable integration fixtures live under `tests/support`.

## iOS Swift Tests

Run from npm:

```sh
npm run test:ios
```

Or run from the iOS Swift package:

```sh
cd ios
swift test
```

Current Swift tests cover the dependency-light core logic: bookmark store
round-trips, stable bookmark IDs, safe child path normalization, and unique
file/folder name generation. Device-only document picker, iCloud/provider, and
security-scoped access flows should be covered by simulator or manual smoke
tests before releases.

## Android JVM Tests

Run from npm:

```sh
npm run test:android:jvm
```

Or run from the Android project:

```sh
cd android
./gradlew testDebugUnitTest
```

Current JVM tests cover pure helper behavior that does not require a device,
including MIME fallback and Android URI JSON object shape.

## Android Instrumentation Smoke

Run with an emulator or connected device:

```sh
npm run test:android:connected
```

The committed smoke test verifies raw app file create/read/write/delete. SAF,
MediaStore, thumbnail, picker permission, share, and view flows should be kept
small and targeted because some of them require Android UI or provider behavior
that is difficult to make deterministic.

## CI Policy

The default CI workflow runs on pushes and pull requests for:

- `main`
- `master`
- `develop`
- `fix*` and `fix/**`

Each test group has a concurrency key per branch/ref so newer pushes cancel
older runs for the same group. Host checks include:

- JS build
- Vitest
- TypeScript declaration/import sanity
- `cargo check --all-features`
- `cargo test`
- Swift iOS core tests
- example app wiring checks

Android JVM tests run in CI when the Android Gradle wrapper is available.
Emulator smoke tests are manual through `workflow_dispatch` so normal PR checks
stay cheap. Broader Android API matrices are release-branch/manual checks, not
the default PR path.
