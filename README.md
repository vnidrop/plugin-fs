# Vnidrop FS

Cross-platform filesystem APIs for Tauri v2.

`@vnidrop/tauri-plugin-fs` and `tauri-plugin-vnidrop-fs` provide one TypeScript
API for desktop, Android, and iOS file workflows:

- Desktop delegates to the official `@tauri-apps/plugin-fs` and
  `@tauri-apps/plugin-dialog` packages.
- Android uses a native backend for Storage Access Framework, public storage,
  persisted URI permissions, thumbnails, streams, and share/view intents.
- iOS uses native document pickers, open-in-place file access, and
  security-scoped bookmarks for external files and folders.

This package is useful when a Tauri app needs desktop filesystem behavior plus
mobile file handling that works with Android content URIs and iOS document
provider URLs.

## Installation

Install the JavaScript package in your Tauri app:

```sh
npm install @vnidrop/tauri-plugin-fs @tauri-apps/plugin-fs @tauri-apps/plugin-dialog
```

Add the Rust plugin and the official desktop plugins to `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri-plugin-vnidrop-fs = "0.1"
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
```

When developing from this repository, use local paths instead:

```toml
tauri-plugin-vnidrop-fs = { path = "../../" }
```

Register all three plugins in your Tauri app:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_vnidrop_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

The official `fs` and `dialog` plugins are required for desktop delegation.
Mobile calls are handled by `tauri-plugin-vnidrop-fs`.

## Permissions

Add Vnidrop FS permissions to your capability file. A typical development
configuration is:

```json
{
  "permissions": [
    "vnidrop-fs:all",
    "fs:read-all",
    "fs:write-all",
    {
      "identifier": "fs:scope",
      "allow": ["**"]
    }
  ]
}
```

For production, prefer a tighter scope:

```json
{
  "permissions": [
    "vnidrop-fs:all-without-delete",
    {
      "identifier": "vnidrop-fs:scope",
      "allow": ["$APPDATA/files/**/*"],
      "deny": ["$APPDATA/files/private/**/*"]
    },
    "fs:default"
  ]
}
```

Desktop permissions are enforced by the official Tauri filesystem plugin.
Android file paths are checked against the Vnidrop scope. Android picker
`content://` URIs use Android URI permissions. iOS external files use
security-scoped bookmarks.

## Security Model

Treat filesystem access as an explicit capability:

- Prefer picker-returned mobile URI objects over raw paths.
- Keep production capability files narrow. Do not ship `vnidrop-fs:all`,
  `fs:read-all`, `fs:write-all`, or `"allow": ["**"]` unless the whole app is
  intended to manage every reachable file.
- Android `content://` operations are authorized by Android URI permissions and
  document providers. Destructive operations such as rename and delete should
  only be exposed in your UI for URIs the user selected or the app created.
- Android relative paths are validated before native create/find operations:
  absolute paths, `.`/`..`, backslashes, and control characters are rejected.
- iOS raw string paths are limited to the app container. External iOS files and
  folders must use picker/bookmark-backed `IosFsUri` objects.
- iOS bookmark data is stored in app `UserDefaults`. Bookmark IDs are random,
  but IDs and bookmark data are app-local access state, not secret material.

If you enable the Android content or thumbnail protocols, protocol URLs should
be treated like bearer references inside your webview. Only generate them for
files your UI is allowed to show, and keep the protocol scopes as narrow as
possible. Invalid protocol scope configuration fails plugin startup so release
builds do not silently run with an unexpected protocol policy.

## Root API

Import portable functions from the package root:

```ts
import {
  createNewDir,
  createNewFile,
  exists,
  getMetadata,
  getPlatformFsCapabilities,
  readDir,
  readTextFile,
  removeDirAll,
  showOpenDirPicker,
  showOpenFilePicker,
  showSaveFilePicker,
  writeTextFile,
} from '@vnidrop/tauri-plugin-fs'
```

The root API routes by platform:

| Platform | Input and output paths |
| --- | --- |
| Desktop | `string` or `URL` paths handled by official Tauri plugins |
| Android | `AndroidFsUri` objects returned by Android pickers/storage APIs |
| iOS | `IosFsUri` objects returned by iOS pickers/bookmark APIs |

Portable functions include:

- `readFile`, `readTextFile`
- `writeFile`, `writeTextFile`
- `readDir`
- `createDir`, `createNewFile`, `createNewDir`
- `copyFile`
- `renameFile`, `renameDir`
- `removeFile`, `removeEmptyDir`, `removeDirAll`
- `exists`, `getMetadata`
- `showOpenFilePicker`, `showOpenDirPicker`, `showSaveFilePicker`
- `isAndroid`, `isIos`, `isDesktop`, `getPlatformFsCapabilities`

## Common Examples

Pick a text file and read it:

```ts
import { readTextFile, showOpenFilePicker } from '@vnidrop/tauri-plugin-fs'

const [file] = await showOpenFilePicker({
  multiple: false,
  mimeTypes: ['text/plain'],
})

if (file) {
  const text = await readTextFile(file)
  console.log(text)
}
```

Pick a folder, create a unique file, and write text:

```ts
import {
  createNewFile,
  showOpenDirPicker,
  writeTextFile,
} from '@vnidrop/tauri-plugin-fs'

const dir = await showOpenDirPicker()

if (dir) {
  const file = await createNewFile(dir, 'notes.txt', 'text/plain')
  await writeTextFile(file, 'Hello from Vnidrop FS')
}
```

List a picked directory:

```ts
import { readDir, showOpenDirPicker } from '@vnidrop/tauri-plugin-fs'

const dir = await showOpenDirPicker()

if (dir) {
  const entries = await readDir(dir)
  for (const entry of entries) {
    console.log(entry.name, entry.type)
  }
}
```

Show different UI for platform-specific capabilities:

```ts
import { getPlatformFsCapabilities } from '@vnidrop/tauri-plugin-fs'

const capabilities = getPlatformFsCapabilities()

if (capabilities.supportsPublicStorage) {
  // Show Android public media/document storage actions.
}

if (capabilities.supportsSecurityScopedBookmarks) {
  // Show iOS bookmark management actions.
}
```

## Desktop Notes

Desktop file operations delegate to official Tauri plugins. That means desktop
paths, base directories, and scopes behave like `@tauri-apps/plugin-fs` and
`@tauri-apps/plugin-dialog`.

For desktop-only code you may still use official Tauri APIs directly. Use
Vnidrop FS when you want the same UI flow to also run on Android and iOS.

## Android API

Android-only APIs are exported from `@vnidrop/tauri-plugin-fs/android`.
They are intentionally not exported from the root package.

```ts
import {
  AndroidPublicGeneralPurposeDir,
  createNewPublicFile,
  scanPublicFile,
  showOpenDirPicker,
  writeTextFile,
} from '@vnidrop/tauri-plugin-fs/android'
```

Create a public document and ask Android to scan it:

```ts
import {
  AndroidPublicGeneralPurposeDir,
  createNewPublicFile,
  scanPublicFile,
  writeTextFile,
} from '@vnidrop/tauri-plugin-fs/android'

const report = await createNewPublicFile(
  AndroidPublicGeneralPurposeDir.Documents,
  'Reports/report.txt',
  'text/plain'
)

await writeTextFile(report, 'Quarterly report', { create: false })
await scanPublicFile(report)
```

Create a file under a SAF directory:

```ts
import {
  createNewFile,
  showOpenDirPicker,
  writeTextFile,
} from '@vnidrop/tauri-plugin-fs/android'

const dir = await showOpenDirPicker()

if (dir) {
  const file = await createNewFile(dir, 'todo.txt', 'text/plain')
  await writeTextFile(file, 'Buy milk')
}
```

Android-specific features include:

- file, directory, and save pickers
- persisted picker URI permission management
- public downloads/documents/images/video/audio helpers
- MediaStore pending and scan helpers
- storage-volume queries
- metadata and MIME helpers
- thumbnail bytes, data URLs, base64, and protocol URLs
- read/write stream resources and line streams
- share and view intents
- Android API level and public-files permission helpers

If you enable content or thumbnail protocols, allow these origins in your CSP:

```text
http://vnidrop-fs-content.localhost
http://vnidrop-fs-thumbnail.localhost
```

Enable optional Android-related Cargo features only when you need them:

```toml
tauri-plugin-vnidrop-fs = {
  version = "0.1",
  features = [
    "protocol_content",
    "protocol_thumbnail",
    "notification_permission",
    "legacy_storage_permission"
  ]
}
```

## iOS API

iOS-only helpers are exported from `@vnidrop/tauri-plugin-fs/ios`.
The shared root API handles normal iOS file and directory operations.
The iOS subpath is for security-scoped bookmark lifecycle management.

```ts
import {
  listSecurityScopedBookmarks,
  releaseSecurityScopedBookmark,
  resolveSecurityScopedBookmark,
} from '@vnidrop/tauri-plugin-fs/ios'
```

Restore a bookmarked folder after app restart:

```ts
import { readDir } from '@vnidrop/tauri-plugin-fs'
import {
  listSecurityScopedBookmarks,
  resolveSecurityScopedBookmark,
} from '@vnidrop/tauri-plugin-fs/ios'

const bookmarks = await listSecurityScopedBookmarks()
const bookmarkId = bookmarks[0]?.bookmarkId

if (bookmarkId) {
  const dir = await resolveSecurityScopedBookmark(bookmarkId)
  const entries = await readDir(dir)
  console.log(entries)
}
```

iOS picker results are opened in place. External document-provider files are
persisted as security-scoped bookmarks when possible. App-local `file://` URLs
may have `bookmarkId: null`; external URLs without a bookmark are rejected by
native operations.

iOS supports the shared root API for:

- file, directory, and save pickers
- read/write bytes and text
- directory listing
- create and unique create
- copy, rename, remove
- metadata and existence checks
- security-scoped bookmark list/resolve/release/persist helpers

Android public storage, thumbnails, streams, and share/view intents are not iOS
features and remain Android-only.

## Testing

Run the host suite:

```sh
npm run check
```

Run iOS Swift tests:

```sh
npm run test:ios
```

Run Android JVM tests when the Android Gradle wrapper is available:

```sh
npm run test:android:jvm
```

Run the example app:

```sh
cd examples/tauri-app
npm install
npm run tauri dev
```

iOS simulator:

```sh
cd examples/tauri-app
npm run tauri -- ios dev "iPhone 17"
```

Android device or emulator:

```sh
cd examples/tauri-app
npm run tauri android dev
```

See `TESTING.md` for the full test strategy.

## CI And Release

CI runs on pushes and pull requests targeting `main`, `master`, `develop`, and
`fix*` branches. Emulator smoke tests are manual so normal PR checks remain
fast.

Releases are handled by `.github/workflows/release.yml`. Pushing a SemVer tag
such as `v0.1.0` runs verification, npm dry-run, crates.io dry-run, then
publishes to npm and crates.io when the required secrets are configured:

- `NPM_TOKEN`
- `CARGO_REGISTRY_TOKEN`

Manual release runs are also supported from GitHub Actions.

## License

Licensed under either of:

- Apache License, Version 2.0
- MIT license

Android code was adapted from MIT-licensed `tauri-plugin-android-fs` behavior
and renamed for the Vnidrop FS namespace.
