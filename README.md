# Vnidrop FS Tauri Plugin

`@vnidrop/tauri-plugin-fs` / `tauri-plugin-vnidrop-fs` is a cross-platform
filesystem manager for Tauri v2.

It delegates desktop filesystem work to the official `@tauri-apps/plugin-fs`
package, provides an Android-native implementation for Storage Access
Framework/public storage, and includes an iOS-native document picker backend
with security-scoped bookmark support.

## Install

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri-plugin-vnidrop-fs = { path = "../path/to/plugin-fs" }
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
```

```json
{
  "dependencies": {
    "@vnidrop/tauri-plugin-fs": "file:../path/to/plugin-fs",
    "@tauri-apps/plugin-fs": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0"
  }
}
```

Register these plugins in your Tauri app. The official filesystem plugin is
required for desktop file operations, and the official dialog plugin is required
for desktop file/folder pickers.

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

## Common API

```ts
import {
  readFile,
  readTextFile,
  writeFile,
  writeTextFile,
  readDir,
  createDir,
  showOpenFilePicker,
  showOpenDirPicker,
  showSaveFilePicker,
  removeFile,
  removeDirAll,
  isAndroid,
  isIos,
  getPlatformFsCapabilities,
} from '@vnidrop/tauri-plugin-fs'
```

On desktop these functions call `@tauri-apps/plugin-fs` and
`@tauri-apps/plugin-dialog`. On Android and iOS they call native
`plugin:vnidrop-fs|...` commands.

Picker APIs are also exposed at the top level. They return desktop paths on
desktop, Android URI objects on Android, and iOS URI/bookmark objects on iOS:

```ts
const files = await showOpenFilePicker({ multiple: true, mimeTypes: ['image/*'] })
const folder = await showOpenDirPicker()
const destination = await showSaveFilePicker('export.json', 'application/json')
```

Android directory creation and unique entry creation use Android base-directory
URIs returned by the directory picker. Import Android-specific helpers from the
Android subpath:

```ts
import { createDir, createNewFile, writeTextFile, showOpenDirPicker } from '@vnidrop/tauri-plugin-fs/android'

const baseDir = await showOpenDirPicker()
if (baseDir) {
  const imagesDir = await createDir(baseDir, 'images')
  const file = await createNewFile(imagesDir, 'hello.txt', 'text/plain')
  await writeTextFile(file, 'Hello from Android SAF')
}
```

## Android API

Android-specific capabilities are exposed as named functions from
`@vnidrop/tauri-plugin-fs/android`:

- file, directory, and save pickers
- persisted picker URI permissions
- public storage creation, scanning, pending state, and volumes
- metadata, MIME type, thumbnails, and content protocol URLs
- read/write streams and line streams
- share and view dialogs

```ts
import {
  AndroidPublicGeneralPurposeDir,
  createNewPublicFile,
  scanPublicFile,
  writeTextFile,
} from '@vnidrop/tauri-plugin-fs/android'

const uri = await createNewPublicFile(
  AndroidPublicGeneralPurposeDir.Documents,
  'Reports/report.txt',
  'text/plain'
)

await writeTextFile(uri, 'Report body', { create: false })
await scanPublicFile(uri)
```

## iOS API

iOS shared filesystem calls work with `IosFsUri` objects returned by the iOS
file, directory, and save pickers. External document-provider URLs are opened in
place and persisted with security-scoped bookmarks so they can be resolved again
after app restart.

```ts
import {
  showOpenDirPicker,
  createNewFile,
  writeTextFile,
} from '@vnidrop/tauri-plugin-fs'
import {
  listSecurityScopedBookmarks,
  resolveSecurityScopedBookmark,
  releaseSecurityScopedBookmark,
} from '@vnidrop/tauri-plugin-fs/ios'

const dir = await showOpenDirPicker()
if (dir) {
  const file = await createNewFile(dir, 'notes.txt', 'text/plain')
  await writeTextFile(file, 'Hello from iOS')
}

const bookmarks = await listSecurityScopedBookmarks()
const first = bookmarks[0]?.bookmarkId
if (first) {
  const uri = await resolveSecurityScopedBookmark(first)
  await releaseSecurityScopedBookmark(uri.bookmarkId!)
}
```

The iOS subpath intentionally contains only security-scoped bookmark lifecycle
helpers and `isIos()`. Android public storage, thumbnails, stream resources, and
share/view intents remain Android-only APIs.

## Permissions

Use the generated Vnidrop permissions in your capability file:

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

For unrestricted development or internal tools you can use:

```json
{
  "permissions": ["vnidrop-fs:all", "fs:default"]
}
```

The Android implementation enforces Tauri-style scope checks for file-path
access. Android `content://` URIs obtained from pickers are controlled by
Android URI permissions. iOS external URLs are controlled by security-scoped
bookmarks stored by the native plugin.

## Optional Android Features

Enable optional Cargo features when your app needs the related Android
permissions or protocols:

```toml
tauri-plugin-vnidrop-fs = {
  path = "../path/to/plugin-fs",
  features = [
    "protocol_content",
    "protocol_thumbnail",
    "notification_permission",
    "legacy_storage_permission"
  ]
}
```

Protocol helpers:

```ts
import { convertFileSrc, convertThumbnailSrc } from '@vnidrop/tauri-plugin-fs/android'

const contentSrc = convertFileSrc(uri)
const thumbnailSrc = convertThumbnailSrc(uri, {
  width: 256,
  height: 256,
  format: 'jpeg',
})
```

If you use a Content Security Policy, allow:

- `http://vnidrop-fs-content.localhost`
- `http://vnidrop-fs-thumbnail.localhost`

## iOS Status

iOS supports the shared root API for picked files and directories:
read/write, directory listing, create, unique create, copy, rename, remove,
metadata, existence checks, and file/directory/save pickers. iOS does not
implement Android-specific public storage, thumbnail, stream, or share/view
APIs.

## Testing

Run the fast host suite with:

```sh
npm run check
```

See `TESTING.md` for the full JS, Rust, Swift, Android JVM, emulator, and CI
strategy.

## Attribution

The Android implementation is adapted from
[`tauri-plugin-android-fs`](https://github.com/aiueo13/tauri-plugin-android-fs),
licensed under MIT OR Apache-2.0. The copied license texts are included in
`LICENSE-MIT.txt` and `LICENSE-APACHE.txt`.
