mod support;

use std::path::Path;

use tauri_plugin_vnidrop_fs::{FileUri, IosFsUri};

#[test]
fn file_uri_serializes_with_android_field_names() {
	let uri = support::fixture_uri();

	let json = uri.to_json_string().expect("uri should serialize");

	assert_eq!(
		json,
		r#"{"uri":"content://com.example.provider/tree/root/document/root%2Ffile.txt","documentTopTreeUri":"content://com.example.provider/tree/root"}"#
	);
	assert_eq!(FileUri::from_json_str(json).expect("uri should deserialize"), uri);
}

#[test]
fn ios_uri_serializes_with_frontend_field_names() {
	let uri = IosFsUri {
		uri: "file:///Documents/report.txt".into(),
		bookmark_id: Some("bookmark-1".into()),
		is_directory: Some(false),
	};

	let json = serde_json::to_string(&uri).expect("iOS URI should serialize");

	assert_eq!(
		json,
		r#"{"uri":"file:///Documents/report.txt","bookmarkId":"bookmark-1","isDirectory":false}"#
	);
	assert_eq!(serde_json::from_str::<IosFsUri>(&json).expect("iOS URI should deserialize"), uri);
}

#[test]
fn file_path_round_trip_preserves_spaces_unicode_and_reserved_characters() {
	let uri = FileUri::from_path(Path::new("/tmp/Vnidrop Test/é file @#.txt"));

	assert_eq!(uri.uri, "file:///tmp/Vnidrop%20Test/%C3%A9%20file%20%40%23.txt");
	assert_eq!(
		uri.to_path().expect("file URI should convert back to a path"),
		Path::new("/tmp/Vnidrop Test/é file @#.txt")
	);
}

#[test]
fn temp_fixture_helper_creates_real_files() {
	let dir = tempfile::tempdir().expect("tempdir should be created");
	let path = support::temp_file(dir.path(), "fixture with spaces.txt", b"body");

	assert_eq!(std::fs::read(path).expect("fixture should be readable"), b"body");
}
