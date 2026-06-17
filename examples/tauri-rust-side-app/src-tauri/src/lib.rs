use std::io::{Read, Write};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Runtime};
use tauri_plugin_vnidrop_fs::{
    FileUri, IosFsUri, VnidropFsExt, VnidropFsTarget, VnidropOpenWriteOptions,
};

const BUFFER_LEN: usize = 1024 * 1024;
const PREVIEW_LIMIT: usize = 64 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RustFsReport {
    bytes: u64,
    message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RustFsPreview {
    bytes: u64,
    text: String,
    truncated: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AndroidTarget {
    uri: String,
    document_top_tree_uri: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IosTarget {
    uri: String,
    bookmark_id: Option<String>,
    is_directory: Option<bool>,
}

#[tauri::command]
fn rust_read_preview<R: Runtime>(
    app: AppHandle<R>,
    target: Value,
) -> Result<RustFsPreview, String> {
    let target = decode_target(target)?;
    let mut reader = app
        .vnidrop_fs()
        .open_read(target)
        .map_err(error_to_string)?;
    let mut buffer = vec![0; PREVIEW_LIMIT];
    let read = reader.read(&mut buffer).map_err(error_to_string)?;
    buffer.truncate(read);

    Ok(RustFsPreview {
        bytes: read as u64,
        text: String::from_utf8_lossy(&buffer).into_owned(),
        truncated: read == PREVIEW_LIMIT,
    })
}

#[tauri::command]
fn rust_write_text<R: Runtime>(
    app: AppHandle<R>,
    target: Value,
    text: String,
) -> Result<RustFsReport, String> {
    let target = decode_target(target)?;
    let mut writer = app
        .vnidrop_fs()
        .open_write(target, VnidropOpenWriteOptions::default().create(true))
        .map_err(error_to_string)?;
    writer.write_all(text.as_bytes()).map_err(error_to_string)?;
    writer.flush().map_err(error_to_string)?;

    Ok(RustFsReport {
        bytes: text.len() as u64,
        message: "wrote text from Rust".into(),
    })
}

#[tauri::command]
fn rust_copy_streaming<R: Runtime>(
    app: AppHandle<R>,
    source: Value,
    destination: Value,
) -> Result<RustFsReport, String> {
    let source = decode_target(source)?;
    let destination = decode_target(destination)?;
    let fs = app.vnidrop_fs();
    let mut reader = fs.open_read(source).map_err(error_to_string)?;
    let mut writer = fs
        .open_write(destination, VnidropOpenWriteOptions::default().create(true))
        .map_err(error_to_string)?;
    let mut buffer = vec![0; BUFFER_LEN];
    let mut copied = 0;

    loop {
        let read = reader.read(&mut buffer).map_err(error_to_string)?;
        if read == 0 {
            break;
        }
        writer.write_all(&buffer[..read]).map_err(error_to_string)?;
        copied += read as u64;
    }
    writer.flush().map_err(error_to_string)?;

    Ok(RustFsReport {
        bytes: copied,
        message: "streamed copy from Rust".into(),
    })
}

fn decode_target(value: Value) -> Result<VnidropFsTarget, String> {
    match value {
        Value::String(path) => Ok(VnidropFsTarget::from(std::path::PathBuf::from(path))),
        Value::Object(map) if map.contains_key("bookmarkId") => {
            let uri = serde_json::from_value::<IosTarget>(Value::Object(map))
                .map_err(error_to_string)?;
            Ok(VnidropFsTarget::from(IosFsUri {
                uri: uri.uri,
                bookmark_id: uri.bookmark_id,
                is_directory: uri.is_directory,
            }))
        }
        Value::Object(map) if map.contains_key("uri") => {
            let uri = serde_json::from_value::<AndroidTarget>(Value::Object(map))
                .map_err(error_to_string)?;
            Ok(VnidropFsTarget::from(FileUri {
                uri: uri.uri,
                document_top_tree_uri: uri.document_top_tree_uri,
            }))
        }
        _ => Err("expected a desktop path string, AndroidFsUri, or IosFsUri".into()),
    }
}

fn error_to_string(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_vnidrop_fs::init())
        .invoke_handler(tauri::generate_handler![
            rust_copy_streaming,
            rust_read_preview,
            rust_write_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
