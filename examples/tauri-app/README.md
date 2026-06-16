# Vnidrop FS Example

Cross-platform manual smoke-test app for `@vnidrop/tauri-plugin-fs` and
`tauri-plugin-vnidrop-fs`.

The app includes:

- shared file/folder picker, read, write, create, copy, rename, remove,
  metadata, and directory-listing operations
- Android-only public storage, URI permission, thumbnail, stream, share, and
  view checks
- iOS-only security-scoped bookmark lifecycle checks

## Desktop

```sh
npm install
npm run tauri dev
```

Desktop shared operations delegate through the official Tauri FS and dialog
plugins, so keep the example capability file in sync with the scopes you want
to test.

## Android

```sh
npm install
npm run tauri android dev
```

Use the Android panel to test SAF picker URIs, persisted picker permissions,
public document creation, MediaStore scanning, thumbnails, and share/view
intents.

## iOS

```sh
npm install
npm run tauri ios dev
```

Use the iOS panel to test security-scoped bookmark persistence, resolution, and
release for files or directories selected through the shared pickers.
