# Vnidrop FS Rust-Side Example

This example keeps file transfer logic in Rust.

The frontend only selects files with Vnidrop FS pickers and calls Tauri
commands. The commands use `app.vnidrop_fs()` to read, write, and stream-copy
files from Rust without routing file bytes through frontend IPC.

## Desktop

```sh
npm install
npm run tauri dev
```

## Android

```sh
npm install
npm run tauri android dev
```

## iOS

```sh
npm install
npm run tauri ios dev
```

Use the app to pick a source file, choose a destination with the save picker,
then run the Rust streaming copy command.
