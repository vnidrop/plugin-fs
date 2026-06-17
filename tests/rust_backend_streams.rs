use std::io::{Read, Write};

use tauri_plugin_vnidrop_fs::{
    VnidropEntryKind, VnidropEntryTarget, VnidropFsExt as _, VnidropOpenWriteOptions,
};

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
        .open_write(
            &destination,
            VnidropOpenWriteOptions::default().create(true),
        )
        .expect("writer should open");

    let mut buffer = [0; 4];
    loop {
        let read = reader.read(&mut buffer).expect("read should succeed");
        if read == 0 {
            break;
        }
        writer
            .write_all(&buffer[..read])
            .expect("write should succeed");
    }
    writer.flush().expect("flush should succeed");

    assert_eq!(
        std::fs::read(destination).expect("destination should be readable"),
        b"large-ish fixture"
    );
}

#[test]
fn backend_api_lists_and_walks_local_directories() {
    let temp = tempfile::tempdir().expect("tempdir should be created");
    let root = temp.path().join("source");
    std::fs::create_dir_all(root.join("nested")).expect("nested dir should be created");
    std::fs::write(root.join("alpha.txt"), b"alpha").expect("alpha should be written");
    std::fs::write(root.join("nested").join("beta.txt"), b"beta").expect("beta should be written");

    let app = tauri::test::mock_builder()
        .plugin(tauri_plugin_vnidrop_fs::init())
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .expect("mock app should build with vnidrop fs plugin");

    let fs = app.vnidrop_fs();
    let mut immediate = fs.read_dir(&root).expect("directory should be listed");
    immediate.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));

    assert_eq!(immediate.len(), 2);
    assert_eq!(
        immediate[0].relative_path,
        std::path::PathBuf::from("alpha.txt")
    );
    assert_eq!(immediate[0].kind, VnidropEntryKind::File);
    assert_eq!(immediate[0].len, Some(5));
    assert_eq!(
        immediate[1].relative_path,
        std::path::PathBuf::from("nested")
    );
    assert_eq!(immediate[1].kind, VnidropEntryKind::Dir);

    let mut walked = Vec::new();
    fs.walk_dir_recursive(&root, |entry| {
        walked.push((entry.relative_path, entry.kind));
        Ok(())
    })
    .expect("directory tree should be walked");
    walked.sort_by(|a, b| a.0.cmp(&b.0));

    assert_eq!(
        walked,
        vec![
            (
                std::path::PathBuf::from("alpha.txt"),
                VnidropEntryKind::File
            ),
            (std::path::PathBuf::from("nested"), VnidropEntryKind::Dir),
            (
                std::path::PathBuf::from("nested").join("beta.txt"),
                VnidropEntryKind::File
            ),
        ]
    );
}

#[test]
fn backend_api_creates_dirs_and_opens_relative_writers() {
    let temp = tempfile::tempdir().expect("tempdir should be created");

    let app = tauri::test::mock_builder()
        .plugin(tauri_plugin_vnidrop_fs::init())
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .expect("mock app should build with vnidrop fs plugin");

    let fs = app.vnidrop_fs();
    let created_dir = fs
        .create_dir_all(temp.path(), std::path::Path::new("out/nested"))
        .expect("nested directory should be created");
    let VnidropEntryTarget::Dir(dir_target) = VnidropEntryTarget::from(created_dir) else {
        panic!("created target should be a directory");
    };

    let mut writer = fs
        .open_write_relative(
            temp.path(),
            std::path::Path::new("out/nested/file.txt"),
            VnidropOpenWriteOptions::default().create(true),
        )
        .expect("relative writer should open");
    writer
        .write_all(b"relative output")
        .expect("relative writer should write");
    writer.flush().expect("relative writer should flush");

    let info = fs
        .entry_info(dir_target)
        .expect("created directory metadata should be readable");
    assert_eq!(info.kind, VnidropEntryKind::Dir);
    assert_eq!(
        std::fs::read(temp.path().join("out/nested/file.txt")).expect("file should be readable"),
        b"relative output"
    );
}

#[test]
fn backend_api_rejects_unsafe_relative_paths() {
    let temp = tempfile::tempdir().expect("tempdir should be created");

    let app = tauri::test::mock_builder()
        .plugin(tauri_plugin_vnidrop_fs::init())
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .expect("mock app should build with vnidrop fs plugin");

    let fs = app.vnidrop_fs();

    assert!(fs
        .create_dir_all(temp.path(), std::path::Path::new("../escape"))
        .is_err());
    assert!(fs
        .open_write_relative(
            temp.path(),
            std::path::Path::new("bad\\name.txt"),
            VnidropOpenWriteOptions::default().create(true),
        )
        .is_err());
}
