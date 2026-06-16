import {
	createNewDir,
	createNewFile,
	getPlatformFsCapabilities,
	readTextFile,
	showOpenDirPicker,
	showOpenFilePicker,
	writeTextFile,
	type PickedDirectory,
	type PickedFile,
} from '@vnidrop/tauri-plugin-fs'
import {
	convertThumbnailSrc,
	createNewPublicFile,
	persistPickerUriPermission,
	type AndroidFsUri,
} from '@vnidrop/tauri-plugin-fs/android'
import {
	listSecurityScopedBookmarks,
	persistSecurityScopedBookmark,
	type IosFsUri,
} from '@vnidrop/tauri-plugin-fs/ios'

async function checkRootImports(path: string): Promise<void> {
	await writeTextFile(path, 'body')
	const text: string = await readTextFile(path)
	const file: PickedFile | undefined = (await showOpenFilePicker())[0]
	const dir: PickedDirectory | null = await showOpenDirPicker()
	const newFile = await createNewFile(path)
	const newDir = await createNewDir(path)
	const capabilities = getPlatformFsCapabilities()

	void text
	void file
	void dir
	void newFile
	void newDir
	void capabilities
}

async function checkAndroidImports(uri: AndroidFsUri): Promise<void> {
	await persistPickerUriPermission(uri)
	const publicFile = await createNewPublicFile('Download', 'report.txt', 'text/plain')
	const thumbnailUrl: string = convertThumbnailSrc(publicFile)

	void thumbnailUrl
}

async function checkIosImports(uri: IosFsUri): Promise<void> {
	const persisted = await persistSecurityScopedBookmark(uri)
	const bookmarks: IosFsUri[] = await listSecurityScopedBookmarks()

	void persisted
	void bookmarks
}

void checkRootImports
void checkAndroidImports
void checkIosImports
