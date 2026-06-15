# Testing Vnidrop FS

This plugin uses layered tests so common regressions stay cheap while Android
runtime behavior can still be verified on an emulator or device.

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

## JavaScript Tests

```sh
npm run test
npm run test:types
```

Vitest covers the package contract:

- root exports stay portable
- Android-only functions are exported from `@vnidrop/tauri-plugin-fs/android`
- desktop calls delegate to official Tauri FS/dialog plugins
- Android branches delegate to the Android subpath implementation
- picker options and desktop unique-name generation stay stable

`npm run test:types` builds the package first in normal workflows, then checks
imports from both package entrypoints.

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

Every pull request should run host checks:

- JS build
- Vitest
- TypeScript declaration/import sanity
- `cargo check --all-features`
- `cargo test`

Android JVM tests should run on every pull request. Emulator smoke tests should
run on pull requests when Android code changes, on a nightly schedule, or
manually before releases. Broader Android API matrices are release-branch/manual
checks, not the default PR path.
