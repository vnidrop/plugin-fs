use tauri_plugin_vnidrop_fs::AndroidFsExt as _;

#[test]
fn plugin_registers_android_fs_state_with_tauri_mock_runtime() {
	let app = tauri::test::mock_builder()
		.plugin(tauri_plugin_vnidrop_fs::init())
		.build(tauri::test::mock_context(tauri::test::noop_assets()))
		.expect("mock app should build with vnidrop fs plugin");

	let _sync_api = app.android_fs();
	let _async_api = app.android_fs_async();
}
