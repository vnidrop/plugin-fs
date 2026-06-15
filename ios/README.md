# Vnidrop FS iOS Backend

This Swift package provides the iOS native backend for
`tauri-plugin-vnidrop-fs`.

It implements the shared filesystem API for files and folders returned by
`UIDocumentPickerViewController`, opens external documents in place, and stores
security-scoped bookmarks in a namespaced `UserDefaults` store.

Run the pure Swift core tests with:

```sh
swift test
```
