use std::fs;

#[test]
fn all_permission_contains_mutating_and_picker_commands() {
	let contents = fs::read_to_string("permissions/all.toml").expect("all permission file should exist");

	for command in [
		"write_file",
		"copy_file",
		"remove_file",
		"remove_dir_all",
		"show_open_file_picker",
		"persist_picker_uri_permission",
		"create_new_public_file",
		"writeFile",
		"showOpenFilePicker",
		"persistSecurityScopedBookmark",
	] {
		assert!(
			contents.contains(&format!(r#""{command}""#)),
			"all permission should include {command}"
		);
	}
}

#[test]
fn default_permission_uses_read_only_profile() {
	let contents = fs::read_to_string("permissions/default.toml").expect("default permission file should exist");

	assert!(contents.contains(r#""read-only""#));
}

#[test]
fn read_only_excludes_mutating_commands() {
	let contents = fs::read_to_string("permissions/read-only.toml").expect("read-only permission file should exist");

	for command in [
		"create_new_file",
		"create_new_dir",
		"create_new_public_file",
		"write_file",
		"copy_file",
		"rename_file",
		"remove_file",
		"remove_dir_all",
		"persist_picker_uri_permission",
		"release_persisted_picker_uri_permission",
		"persistSecurityScopedBookmark",
		"releaseSecurityScopedBookmark",
		"createNewFile",
		"writeFile",
		"renameFile",
		"removeFile",
	] {
		assert!(
			!contents.contains(&format!(r#""{command}""#)),
			"read-only should not include {command}"
		);
	}
}

#[test]
fn all_without_delete_excludes_destructive_commands() {
	let contents = fs::read_to_string("permissions/all-without-delete.toml")
		.expect("all-without-delete permission file should exist");

	for command in [
		"remove_file",
		"remove_empty_dir",
		"remove_dir_all",
		"write_file",
		"copy_file",
		"removeFile",
		"removeEmptyDir",
		"removeDirAll",
		"writeFile",
		"copyFile",
	] {
		assert!(
			!contents.contains(&format!(r#""{command}""#)),
			"all-without-delete should not include {command}"
		);
	}
}
