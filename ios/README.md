# Vnidrop FS iOS Backend

This Swift package provides the iOS native backend for
`tauri-plugin-vnidrop-fs`.

It implements the shared filesystem API for files and folders returned by
`UIDocumentPickerViewController`, opens external documents in place, and stores
security-scoped bookmarks in a namespaced `UserDefaults` store.

Security notes:

- Raw string paths are accepted only for app-container `file://` locations.
- External document-provider files and folders must use picker/bookmark-backed
  `IosFsUri` values.
- Bookmark IDs are random, and bookmark data in `UserDefaults` is app-local
  access state, not a secret store.
- Save-picker default names and rename targets are validated as single filename
  components.

Run the pure Swift core tests with:

```sh
swift test
```
