import * as TauriDialog from '@tauri-apps/plugin-dialog'
import * as TauriFs from '@tauri-apps/plugin-fs'
import * as Android from './android'

export type {
	AndroidEntryMetadata,
	AndroidEntryMetadataWithUri,
	AndroidFsUri,
	AndroidOpenDirPickerOptions,
	AndroidOpenFilePickerOptions,
	AndroidReadDirOptions,
	AndroidReadTextFileOptions,
	AndroidSaveFilePickerOptions,
	AndroidWriteFileOptions,
	AndroidWriteTextFileOptions,
} from './android'

/**
 * Returns `true` when the current Tauri runtime is Android.
 *
 * Use this when you need to branch between portable APIs and Android-only
 * functionality from `@vnidrop/tauri-plugin-fs/android`.
 */
export const isAndroid = Android.isAndroid

/**
 * A filesystem path accepted by the portable API.
 *
 * On desktop this is a normal Tauri filesystem path or `file://` URL. On
 * Android this can also be a content URI represented as a string/URL.
 */
export type FsPath = Android.FsPath

/**
 * A portable filesystem target.
 *
 * Desktop callers normally pass `string` or `URL` paths. Android callers may
 * also pass an `AndroidFsUri` returned by Android picker and storage APIs.
 */
export type VnidropFsPath = Android.FsPath | Android.AndroidFsUri

export type DesktopReadFileOptions = Parameters<typeof TauriFs.readFile>[1]
export type DesktopReadTextFileOptions = Parameters<typeof TauriFs.readTextFile>[1]
export type DesktopWriteFileOptions = Parameters<typeof TauriFs.writeFile>[2]
export type DesktopWriteTextFileOptions = Parameters<typeof TauriFs.writeTextFile>[2]
export type DesktopReadDirOptions = Parameters<typeof TauriFs.readDir>[1]
export type DesktopMkdirOptions = Parameters<typeof TauriFs.mkdir>[1]
export type DesktopCreateOptions = Parameters<typeof TauriFs.create>[1]
export type DesktopRemoveOptions = Parameters<typeof TauriFs.remove>[1]
export type DesktopRenameOptions = Parameters<typeof TauriFs.rename>[2]
export type DesktopExistsOptions = Parameters<typeof TauriFs.exists>[1]
export type DesktopStatOptions = Parameters<typeof TauriFs.stat>[1]
export type DesktopOpenDialogOptions = Parameters<typeof TauriDialog.open>[0]
export type DesktopSaveDialogOptions = Parameters<typeof TauriDialog.save>[0]

export type UnifiedReadTextFileOptions = Android.AndroidReadTextFileOptions | DesktopReadTextFileOptions
export type UnifiedWriteFileOptions = Android.AndroidWriteFileOptions | DesktopWriteFileOptions
export type UnifiedWriteTextFileOptions = Android.AndroidWriteTextFileOptions | DesktopWriteTextFileOptions
export type UnifiedReadDirOptions = Android.AndroidReadDirOptions | DesktopReadDirOptions
export type UnifiedRemoveDirAllOptions = DesktopRemoveOptions
export type UnifiedRemoveEmptyDirOptions = DesktopRemoveOptions
export type UnifiedExistsOptions = DesktopExistsOptions
export type UnifiedMetadataOptions = DesktopStatOptions
export type UnifiedOpenFilePickerOptions = Android.AndroidOpenFilePickerOptions | DesktopOpenDialogOptions
export type UnifiedOpenDirPickerOptions = Android.AndroidOpenDirPickerOptions | DesktopOpenDialogOptions
export type UnifiedSaveFilePickerOptions = Android.AndroidSaveFilePickerOptions | DesktopSaveDialogOptions

/**
 * A file selected by the portable file picker.
 *
 * Desktop returns a path string. Android returns an `AndroidFsUri`.
 */
export type PickedFile = Android.AndroidFsUri | string

/**
 * A directory selected by the portable directory picker.
 *
 * Desktop returns a path string. Android returns an `AndroidFsUri`.
 */
export type PickedDirectory = Android.AndroidFsUri | string

/**
 * A destination selected by the portable save-file picker.
 *
 * Desktop returns a path string. Android returns an `AndroidFsUri`.
 */
export type PickedSaveFile = Android.AndroidFsUri | string

/**
 * Describes the filesystem features available on the current platform.
 */
export type PlatformFsCapabilities = {
	/** Current platform bucket used by this package. */
	platform: 'android' | 'desktop'

	/** `true` when portable operations delegate to official Tauri plugins. */
	usesOfficialFs: boolean

	/** `true` when Android content/file URI objects are supported. */
	supportsAndroidUris: boolean

	/** `true` when Android public media/general storage APIs are available. */
	supportsPublicStorage: boolean

	/** `true` when Android persisted picker URI permissions are available. */
	supportsPersistedPickerPermissions: boolean

	/** `true` when Android provider thumbnail APIs are available. */
	supportsThumbnails: boolean
}

/**
 * Returns `true` when the runtime is not Android.
 */
export function isDesktop(): boolean {
	return !Android.isAndroid()
}

/**
 * Returns a feature summary for the current platform.
 *
 * This is useful when UI code needs to hide Android-only workflows such as
 * persisted picker permissions, public storage, or provider thumbnails.
 */
export function getPlatformFsCapabilities(): PlatformFsCapabilities {
	if (Android.isAndroid()) {
		return {
			platform: 'android',
			usesOfficialFs: false,
			supportsAndroidUris: true,
			supportsPublicStorage: true,
			supportsPersistedPickerPermissions: true,
			supportsThumbnails: true,
		}
	}

	return {
		platform: 'desktop',
		usesOfficialFs: true,
		supportsAndroidUris: false,
		supportsPublicStorage: false,
		supportsPersistedPickerPermissions: false,
		supportsThumbnails: false,
	}
}

function isAndroidFsUri(value: unknown): value is Android.AndroidFsUri {
	return (
		typeof value === 'object' &&
		value !== null &&
		'uri' in value &&
		typeof (value as { uri: unknown }).uri === 'string'
	)
}

function mapDesktopPath(path: Android.FsPath): string {
	return path instanceof URL ? path.toString() : path
}

async function createDesktopEmptyFile(path: Android.FsPath, options?: DesktopCreateOptions): Promise<void> {
	const file = await TauriFs.create(mapDesktopPath(path), options)
	await file.close()
}

function incrementDesktopPath(path: Android.FsPath, index: number): Android.FsPath {
	const raw = mapDesktopPath(path)
	const sepIndex = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'))
	const dir = sepIndex >= 0 ? raw.slice(0, sepIndex + 1) : ''
	const name = sepIndex >= 0 ? raw.slice(sepIndex + 1) : raw
	const dotIndex = name.lastIndexOf('.')
	const hasExtension = dotIndex > 0
	const stem = hasExtension ? name.slice(0, dotIndex) : name
	const extension = hasExtension ? name.slice(dotIndex) : ''

	return `${dir}${stem} (${index})${extension}`
}

async function resolveAvailableDesktopPath(path: Android.FsPath, options?: DesktopExistsOptions): Promise<Android.FsPath> {
	if (!await TauriFs.exists(mapDesktopPath(path), options)) {
		return path
	}

	for (let i = 1; i < Number.MAX_SAFE_INTEGER; i++) {
		const candidate = incrementDesktopPath(path, i)
		if (!await TauriFs.exists(mapDesktopPath(candidate), options)) {
			return candidate
		}
	}

	throw new Error('Unable to resolve an available desktop path.')
}

function requireAndroidBaseUri(value: VnidropFsPath, method: string): Android.AndroidFsUri {
	if (!isAndroidFsUri(value)) {
		throw new TypeError(`${method} on Android requires an AndroidFsUri base directory.`)
	}

	return value
}

function mapDesktopOpenFilePickerOptions(options?: UnifiedOpenFilePickerOptions): DesktopOpenDialogOptions {
	const mapped: DesktopOpenDialogOptions = {
		...(options as DesktopOpenDialogOptions),
		directory: false,
	}
	const mimeTypes = (options as Android.AndroidOpenFilePickerOptions | undefined)?.mimeTypes

	if (mimeTypes != null && mapped.filters == null) {
		mapped.filters = [{
			name: 'Files',
			extensions: Array.isArray(mimeTypes) ? mimeTypes : [mimeTypes],
		}]
	}

	return mapped
}

function mapDesktopOpenDirPickerOptions(options?: UnifiedOpenDirPickerOptions): DesktopOpenDialogOptions {
	return {
		...(options as DesktopOpenDialogOptions),
		directory: true,
		multiple: false,
	}
}

function mapDesktopSaveFilePickerOptions(
	defaultFileNameOrOptions?: string | DesktopSaveDialogOptions,
	options?: Android.AndroidSaveFilePickerOptions | DesktopSaveDialogOptions
): DesktopSaveDialogOptions {
	if (typeof defaultFileNameOrOptions !== 'string') {
		return defaultFileNameOrOptions
	}

	return {
		...(options as DesktopSaveDialogOptions),
		defaultPath: defaultFileNameOrOptions,
	}
}

/**
 * Reads an entire file as bytes.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.readFile`. Android delegates to
 * the native Android implementation and accepts `AndroidFsUri` values returned
 * by pickers or Android storage APIs.
 *
 * @param path File path, file URL, or Android file URI.
 * @param options Desktop filesystem options. Ignored on Android.
 * @returns File contents as a `Uint8Array`.
 */
export async function readFile(
	path: VnidropFsPath,
	options?: DesktopReadFileOptions
): Promise<Uint8Array<ArrayBuffer>> {
	if (Android.isAndroid()) {
		return Android.readFile(path)
	}

	return TauriFs.readFile(mapDesktopPath(path as Android.FsPath), options)
}

/**
 * Reads an entire file as text.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.readTextFile`. Android reads
 * bytes through the native implementation and decodes them with `TextDecoder`.
 *
 * @param path File path, file URL, or Android file URI.
 * @param options Desktop read options or Android text-decoding options.
 * @returns Decoded file contents.
 */
export async function readTextFile(
	path: VnidropFsPath,
	options?: UnifiedReadTextFileOptions
): Promise<string> {
	if (Android.isAndroid()) {
		return Android.readTextFile(path, options as Android.AndroidReadTextFileOptions)
	}

	return TauriFs.readTextFile(mapDesktopPath(path as Android.FsPath), options as DesktopReadTextFileOptions)
}

/**
 * Writes bytes to a file.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.writeFile`. Android delegates to
 * the native Android writer and can write to picker/content URIs when the app
 * has write permission.
 *
 * @param path Destination path, file URL, or Android file URI.
 * @param data Bytes to write.
 * @param options Desktop write options or Android write options.
 */
export async function writeFile(
	path: VnidropFsPath,
	data: Uint8Array<ArrayBufferLike>,
	options?: UnifiedWriteFileOptions
): Promise<void> {
	if (Android.isAndroid()) {
		return Android.writeFile(path, data, options as Android.AndroidWriteFileOptions)
	}

	return TauriFs.writeFile(mapDesktopPath(path as Android.FsPath), data, options as DesktopWriteFileOptions)
}

/**
 * Writes UTF-8 text to a file.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.writeTextFile`. Android encodes
 * the string as UTF-8 and writes through the native Android implementation.
 *
 * @param path Destination path, file URL, or Android file URI.
 * @param data Text to write.
 * @param options Desktop write options or Android write options.
 */
export async function writeTextFile(
	path: VnidropFsPath,
	data: string,
	options?: UnifiedWriteTextFileOptions
): Promise<void> {
	if (Android.isAndroid()) {
		return Android.writeTextFile(path, data, options as Android.AndroidWriteTextFileOptions)
	}

	return TauriFs.writeTextFile(mapDesktopPath(path as Android.FsPath), data, options as DesktopWriteTextFileOptions)
}

/**
 * Reads the immediate children of a directory.
 *
 * Desktop returns Tauri `DirEntry` objects. Android returns metadata entries
 * that include each child's `AndroidFsUri`.
 *
 * @param path Directory path on desktop, or an Android directory URI on Android.
 * @param options Desktop read-dir options or Android pagination options.
 */
export async function readDir(
	path: VnidropFsPath,
	options?: UnifiedReadDirOptions
): Promise<Android.AndroidEntryMetadataWithUri[] | Awaited<ReturnType<typeof TauriFs.readDir>>> {
	if (Android.isAndroid()) {
		return Android.readDir(requireAndroidBaseUri(path, 'readDir'), options as Android.AndroidReadDirOptions)
	}

	return TauriFs.readDir(mapDesktopPath(path as Android.FsPath), options as DesktopReadDirOptions)
}

/**
 * Creates a directory on desktop.
 *
 * On Android, use the overload that accepts a base `AndroidFsUri` and a
 * relative path.
 */
export async function createDir(
	pathOrBaseDir: Android.FsPath,
	options?: DesktopMkdirOptions
): Promise<void>

/**
 * Creates or resolves a directory under an Android base directory URI.
 *
 * The base directory should come from Android directory picker or another
 * Android storage API. Missing parent directories are created by the native
 * Android implementation.
 */
export async function createDir(
	baseDirUri: Android.AndroidFsUri,
	relativePath: string
): Promise<Android.AndroidFsUri>
export async function createDir(
	pathOrBaseDir: VnidropFsPath,
	optionsOrRelativePath?: DesktopMkdirOptions | string
): Promise<void | Android.AndroidFsUri> {
	if (Android.isAndroid()) {
		return Android.createDir(
			requireAndroidBaseUri(pathOrBaseDir, 'createDir'),
			typeof optionsOrRelativePath === 'string' ? optionsOrRelativePath : ''
		)
	}

	return TauriFs.mkdir(mapDesktopPath(pathOrBaseDir as Android.FsPath), optionsOrRelativePath as DesktopMkdirOptions)
}

/**
 * Opens a file picker.
 *
 * Desktop uses `@tauri-apps/plugin-dialog.open` and returns selected path
 * strings. Android uses the native Android picker and returns `AndroidFsUri`
 * objects. Cancellation returns an empty array.
 *
 * @param options Desktop dialog options or Android picker options. Android
 * `mimeTypes` are mapped to desktop dialog filters when possible.
 */
export async function showOpenFilePicker(
	options?: UnifiedOpenFilePickerOptions
): Promise<PickedFile[]> {
	if (Android.isAndroid()) {
		return Android.showOpenFilePicker(options as Android.AndroidOpenFilePickerOptions)
	}

	const selected = await TauriDialog.open(mapDesktopOpenFilePickerOptions(options))
	if (selected == null) {
		return []
	}

	return Array.isArray(selected) ? selected : [selected]
}

/**
 * Opens a directory picker.
 *
 * Desktop uses `@tauri-apps/plugin-dialog.open` with directory selection.
 * Android uses the native Storage Access Framework directory picker.
 *
 * @param options Desktop dialog options or Android directory picker options.
 * @returns A desktop path string, an Android directory URI, or `null` when
 * canceled.
 */
export async function showOpenDirPicker(
	options?: UnifiedOpenDirPickerOptions
): Promise<PickedDirectory | null> {
	if (Android.isAndroid()) {
		return Android.showOpenDirPicker(options as Android.AndroidOpenDirPickerOptions)
	}

	const selected = await TauriDialog.open(mapDesktopOpenDirPickerOptions(options))
	return Array.isArray(selected) ? (selected[0] ?? null) : selected
}

/**
 * Opens a save-file picker on Android.
 *
 * Android requires an initial file name and optional MIME type. Desktop callers
 * may use the object-options overload below instead.
 */
export async function showSaveFilePicker(
	defaultFileName: string,
	mimeType?: string | null,
	options?: Android.AndroidSaveFilePickerOptions
): Promise<PickedSaveFile | null>

/**
 * Opens a save-file picker on desktop.
 *
 * Desktop uses `@tauri-apps/plugin-dialog.save` and returns a path string or
 * `null` when canceled.
 */
export async function showSaveFilePicker(
	options?: DesktopSaveDialogOptions
): Promise<PickedSaveFile | null>
export async function showSaveFilePicker(
	defaultFileNameOrOptions?: string | DesktopSaveDialogOptions,
	mimeType: string | null = null,
	options?: Android.AndroidSaveFilePickerOptions | DesktopSaveDialogOptions
): Promise<PickedSaveFile | null> {
	if (Android.isAndroid()) {
		return Android.showSaveFilePicker(
			typeof defaultFileNameOrOptions === 'string' ? defaultFileNameOrOptions : '',
			mimeType,
			options as Android.AndroidSaveFilePickerOptions
		)
	}

	return TauriDialog.save(mapDesktopSaveFilePickerOptions(defaultFileNameOrOptions, options))
}

/**
 * Creates an empty file at a unique desktop path.
 *
 * If the requested path exists, the returned path is suffixed with ` (1)`,
 * ` (2)`, and so on before the extension.
 *
 * @returns The path that was actually created.
 */
export async function createNewFile(
	path: Android.FsPath,
	options?: DesktopCreateOptions
): Promise<Android.FsPath>

/**
 * Creates a new Android file under a base directory URI.
 *
 * If a file with the same name exists, Android appends a sequence number using
 * provider-specific behavior. The returned URI points to the created file.
 */
export async function createNewFile(
	baseDirUri: Android.AndroidFsUri,
	relativePath: string,
	mimeType?: string | null
): Promise<Android.AndroidFsUri>
export async function createNewFile(
	pathOrBaseDirUri: VnidropFsPath,
	optionsOrRelativePath?: DesktopCreateOptions | string,
	mimeType: string | null = null
): Promise<Android.FsPath | Android.AndroidFsUri> {
	if (Android.isAndroid()) {
		return Android.createNewFile(
			requireAndroidBaseUri(pathOrBaseDirUri, 'createNewFile'),
			typeof optionsOrRelativePath === 'string' ? optionsOrRelativePath : '',
			mimeType
		)
	}

	const path = await resolveAvailableDesktopPath(
		pathOrBaseDirUri as Android.FsPath,
		optionsOrRelativePath as DesktopExistsOptions
	)
	await createDesktopEmptyFile(path, optionsOrRelativePath as DesktopCreateOptions)
	return path
}

/**
 * Creates a directory at a unique desktop path.
 *
 * If the requested directory exists, the returned path is suffixed with ` (1)`,
 * ` (2)`, and so on.
 *
 * @returns The path that was actually created.
 */
export async function createNewDir(
	path: Android.FsPath,
	options?: DesktopMkdirOptions
): Promise<Android.FsPath>

/**
 * Creates a new Android directory under a base directory URI.
 *
 * If a directory with the same name exists, Android appends a sequence number
 * using provider-specific behavior. The returned URI points to the created
 * directory.
 */
export async function createNewDir(
	baseDirUri: Android.AndroidFsUri,
	relativePath: string
): Promise<Android.AndroidFsUri>
export async function createNewDir(
	pathOrBaseDirUri: VnidropFsPath,
	optionsOrRelativePath?: DesktopMkdirOptions | string
): Promise<Android.FsPath | Android.AndroidFsUri> {
	if (Android.isAndroid()) {
		return Android.createNewDir(
			requireAndroidBaseUri(pathOrBaseDirUri, 'createNewDir'),
			typeof optionsOrRelativePath === 'string' ? optionsOrRelativePath : ''
		)
	}

	const path = await resolveAvailableDesktopPath(
		pathOrBaseDirUri as Android.FsPath,
		optionsOrRelativePath as DesktopExistsOptions
	)
	await TauriFs.mkdir(mapDesktopPath(path), optionsOrRelativePath as DesktopMkdirOptions)
	return path
}

/**
 * Copies one file to another location.
 *
 * Desktop reads the source with `@tauri-apps/plugin-fs.readFile` and writes the
 * destination with `writeFile`. Android uses the native copy operation so it
 * can work with content URIs when permissions allow.
 *
 * @param srcPath Source file path or Android URI.
 * @param destPath Destination file path or Android URI.
 * @param options Android copy options. Ignored on desktop.
 */
export async function copyFile(
	srcPath: VnidropFsPath,
	destPath: VnidropFsPath,
	options?: Android.AndroidCopyFileOptions
): Promise<void> {
	if (Android.isAndroid()) {
		return Android.copyFile(srcPath, destPath, options)
	}

	const data = await TauriFs.readFile(mapDesktopPath(srcPath as Android.FsPath))
	return TauriFs.writeFile(mapDesktopPath(destPath as Android.FsPath), data)
}

/**
 * Renames a file.
 *
 * Desktop renames from one path to another. Android renames a file URI to a
 * new entry name and returns the new URI.
 *
 * @param pathOrUri Desktop source path or Android file URI.
 * @param newPathOrName Desktop destination path, or Android new file name.
 */
export async function renameFile(
	pathOrUri: VnidropFsPath,
	newPathOrName: string,
	options?: DesktopRenameOptions
): Promise<void | Android.AndroidFsUri> {
	if (Android.isAndroid()) {
		return Android.renameFile(requireAndroidBaseUri(pathOrUri, 'renameFile'), newPathOrName)
	}

	return TauriFs.rename(mapDesktopPath(pathOrUri as Android.FsPath), newPathOrName, options)
}

/**
 * Renames a directory.
 *
 * Desktop renames from one path to another. Android renames a directory URI to
 * a new entry name and returns the new URI.
 *
 * @param pathOrUri Desktop source path or Android directory URI.
 * @param newPathOrName Desktop destination path, or Android new directory name.
 */
export async function renameDir(
	pathOrUri: VnidropFsPath,
	newPathOrName: string,
	options?: DesktopRenameOptions
): Promise<void | Android.AndroidFsUri> {
	if (Android.isAndroid()) {
		return Android.renameDir(requireAndroidBaseUri(pathOrUri, 'renameDir'), newPathOrName)
	}

	return TauriFs.rename(mapDesktopPath(pathOrUri as Android.FsPath), newPathOrName, options)
}

/**
 * Removes a file.
 *
 * Desktop removes a path with `@tauri-apps/plugin-fs.remove`. Android removes
 * the file represented by an `AndroidFsUri`.
 */
export async function removeFile(pathOrUri: VnidropFsPath): Promise<void> {
	if (Android.isAndroid()) {
		return Android.removeFile(requireAndroidBaseUri(pathOrUri, 'removeFile'))
	}

	return TauriFs.remove(mapDesktopPath(pathOrUri as Android.FsPath))
}

/**
 * Removes an empty directory.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.remove` without forcing
 * recursion. Android uses the native empty-directory removal operation.
 */
export async function removeEmptyDir(
	pathOrUri: VnidropFsPath,
	options?: UnifiedRemoveEmptyDirOptions
): Promise<void> {
	if (Android.isAndroid()) {
		return Android.removeEmptyDir(requireAndroidBaseUri(pathOrUri, 'removeEmptyDir'))
	}

	return TauriFs.remove(mapDesktopPath(pathOrUri as Android.FsPath), options)
}

/**
 * Removes a directory and all of its contents.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.remove` with `recursive: true`.
 * Android uses the native recursive directory removal operation.
 */
export async function removeDirAll(
	pathOrUri: VnidropFsPath,
	options?: UnifiedRemoveDirAllOptions
): Promise<void> {
	if (Android.isAndroid()) {
		return Android.removeDirAll(requireAndroidBaseUri(pathOrUri, 'removeDirAll'))
	}

	return TauriFs.remove(mapDesktopPath(pathOrUri as Android.FsPath), { ...options, recursive: true })
}

/**
 * Checks whether a file or directory exists.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.exists`. Android attempts to
 * read the target type and returns `false` if the target cannot be resolved.
 */
export async function exists(
	path: Android.FsPath,
	options?: UnifiedExistsOptions
): Promise<boolean> {
	if (Android.isAndroid()) {
		try {
			await Android.getType(path)
			return true
		}
		catch {
			return false
		}
	}

	return TauriFs.exists(mapDesktopPath(path), options)
}

/**
 * Reads metadata for a file or directory.
 *
 * Desktop returns Tauri `FileInfo`. Android returns Android entry metadata,
 * including MIME type and byte length for files.
 */
export async function getMetadata(
	path: VnidropFsPath,
	options?: UnifiedMetadataOptions
): Promise<Android.AndroidEntryMetadata | Awaited<ReturnType<typeof TauriFs.stat>>> {
	if (Android.isAndroid()) {
		return Android.getMetadata(path)
	}

	return TauriFs.stat(mapDesktopPath(path as Android.FsPath), options)
}
