use std::io::{Read, Write};

use tauri_plugin_vnidrop_fs::{VnidropFsExt as _, VnidropOpenWriteOptions};

#[test]
fn backend_api_streams_local_files_without_frontend_ipc() {
	let temp = tempfile::tempdir().expect("tempdir should be created");
	let source = temp.path().join("source.bin");
	let destination = temp.path().join("destination.bin");
	std::fs::write(&source, b"large-ish fixture").expect("source should be written");

	let app = tauri::test::mock_builder()
		.plugin(tauri_plugin_vnidrop_fs::init())
		.build(tauri::test::mock_context(tauri::test::noop_assets()))
		.expect("mock app should build with vnidrop fs plugin");

	let fs = app.vnidrop_fs();
	let mut reader = fs.open_read(&source).expect("reader should open");
	let mut writer = fs
		.open_write(&destination, VnidropOpenWriteOptions::default().create(true))
		.expect("writer should open");

	let mut buffer = [0; 4];
	loop {
		let read = reader.read(&mut buffer).expect("read should succeed");
		if read == 0 {
			break;
		}
		writer.write_all(&buffer[..read]).expect("write should succeed");
	}
	writer.flush().expect("flush should succeed");

	assert_eq!(
		std::fs::read(destination).expect("destination should be readable"),
		b"large-ish fixture"
	);
}
