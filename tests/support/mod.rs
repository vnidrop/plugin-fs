use std::{
	fs,
	path::{Path, PathBuf},
};

use tauri_plugin_vnidrop_fs::FileUri;

pub fn fixture_uri() -> FileUri {
	FileUri {
		uri: "content://com.example.provider/tree/root/document/root%2Ffile.txt".into(),
		document_top_tree_uri: Some("content://com.example.provider/tree/root".into()),
	}
}

pub fn temp_file(dir: &Path, name: &str, contents: &[u8]) -> PathBuf {
	let path = dir.join(name);
	fs::write(&path, contents).expect("fixture file should be written");
	path
}
