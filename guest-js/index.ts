import * as TauriDialog from '@tauri-apps/plugin-dialog'
import * as TauriFs from '@tauri-apps/plugin-fs'
import * as Android from './android'
import * as Ios from './ios'

export type {
	AndroidEntryMetadata,
	AndroidEntryMetadataWithUri,
	AndroidFsUri,
	AndroidOpenDirPickerOptions,
	AndroidOpenFilePickerOptions,
	AndroidOpenReadFileStreamOptions,
	AndroidOpenWriteFileStreamOptions,
	AndroidReadDirOptions,
	AndroidReadTextFileOptions,
	AndroidSaveFilePickerOptions,
	AndroidWriteFileOptions,
	AndroidWriteTextFileOptions,
} from './android'

export type {
	IosEntryMetadata,
	IosEntryMetadataWithUri,
	IosFsUri,
	IosOpenDirPickerOptions,
	IosOpenFilePickerOptions,
	IosOpenReadFileStreamOptions,
	IosOpenWriteFileStreamOptions,
	IosReadDirOptions,
	IosReadTextFileOptions,
	IosSaveFilePickerOptions,
	IosWriteFileOptions,
	IosWriteTextFileOptions,
} from './ios'

/**
 * Returns `true` when the current Tauri runtime is Android.
 *
 * Use this when you need to branch between portable APIs and Android-only
 * functionality from `@vnidrop/tauri-plugin-fs/android`.
 */
export const isAndroid = Android.isAndroid

/**
 * Returns `true` when the current Tauri runtime is iOS.
 */
export const isIos = Ios.isIos

/**
 * A filesystem path accepted by the portable API.
 *
 * On desktop and iOS this is a normal filesystem path or `file://` URL. On
 * Android this can also be a `content://` URI represented as a string/URL.
 */
export type FsPath = Android.FsPath

/**
 * A portable filesystem target.
 *
 * Desktop callers normally pass `string` or `URL` paths. Android callers may
 * also pass an `AndroidFsUri` returned by Android picker and storage APIs. iOS
 * callers should pass the `IosFsUri` objects returned by iOS picker/bookmark
 * APIs when accessing external document-provider files.
 */
export type VnidropFsPath = Android.FsPath | Android.AndroidFsUri | Ios.IosFsUri

/**
 * Desktop-only options forwarded to `@tauri-apps/plugin-fs.readFile`.
 */
export type DesktopReadFileOptions = Parameters<typeof TauriFs.readFile>[1]

/**
 * Desktop-only options forwarded to `@tauri-apps/plugin-fs.readTextFile`.
 */
export type DesktopReadTextFileOptions = Parameters<typeof TauriFs.readTextFile>[1]

/**
 * Desktop-only options forwarded to `@tauri-apps/plugin-fs.writeFile`.
 */
export type DesktopWriteFileOptions = Parameters<typeof TauriFs.writeFile>[2]

/**
 * Desktop-only options forwarded to `@tauri-apps/plugin-fs.writeTextFile`.
 */
export type DesktopWriteTextFileOptions = Parameters<typeof TauriFs.writeTextFile>[2]

/**
 * Desktop file-handle options used by stream APIs.
 */
export type DesktopOpenOptions = Parameters<typeof TauriFs.open>[1]

/**
 * Desktop-only options forwarded to `@tauri-apps/plugin-fs.readDir`.
 */
export type DesktopReadDirOptions = Parameters<typeof TauriFs.readDir>[1]

/**
 * Desktop-only options forwarded to `@tauri-apps/plugin-fs.mkdir`.
 */
export type DesktopMkdirOptions = Parameters<typeof TauriFs.mkdir>[1]

/**
 * Desktop-only options forwarded to `@tauri-apps/plugin-fs.create`.
 */
export type DesktopCreateOptions = Parameters<typeof TauriFs.create>[1]

/**
 * Desktop-only options forwarded to `@tauri-apps/plugin-fs.remove`.
 */
export type DesktopRemoveOptions = Parameters<typeof TauriFs.remove>[1]

/**
 * Desktop-only options forwarded to `@tauri-apps/plugin-fs.rename`.
 */
export type DesktopRenameOptions = Parameters<typeof TauriFs.rename>[2]

/**
 * Desktop-only options forwarded to `@tauri-apps/plugin-fs.exists`.
 */
export type DesktopExistsOptions = Parameters<typeof TauriFs.exists>[1]

/**
 * Desktop-only options forwarded to `@tauri-apps/plugin-fs.stat`.
 */
export type DesktopStatOptions = Parameters<typeof TauriFs.stat>[1]

/**
 * Desktop dialog options accepted by portable open pickers.
 */
export type DesktopOpenDialogOptions = Parameters<typeof TauriDialog.open>[0]

/**
 * Desktop dialog options accepted by the portable save picker.
 */
export type DesktopSaveDialogOptions = Parameters<typeof TauriDialog.save>[0]

/**
 * Text decoding options accepted by `readTextFile` on every platform.
 */
export type UnifiedReadTextFileOptions = Android.AndroidReadTextFileOptions | Ios.IosReadTextFileOptions | DesktopReadTextFileOptions

/**
 * Byte write options accepted by `writeFile` on every platform.
 */
export type UnifiedWriteFileOptions = Android.AndroidWriteFileOptions | Ios.IosWriteFileOptions | DesktopWriteFileOptions

/**
 * Text encoding/write options accepted by `writeTextFile` on every platform.
 */
export type UnifiedWriteTextFileOptions = Android.AndroidWriteTextFileOptions | Ios.IosWriteTextFileOptions | DesktopWriteTextFileOptions

/**
 * Chunked byte-read options accepted by `openReadFileStream`.
 */
export type UnifiedOpenReadFileStreamOptions = Android.AndroidOpenReadFileStreamOptions | Ios.IosOpenReadFileStreamOptions | (DesktopOpenOptions & {
	/** Number of bytes requested for each stream pull. Defaults to 512 KiB. */
	bufferByteLength?: number
	/** Byte offset where reading should begin. */
	offset?: number
	/** Aborts the stream and releases the file handle. */
	signal?: AbortSignal
})

/**
 * Chunked byte-write options accepted by `openWriteFileStream`.
 */
export type UnifiedOpenWriteFileStreamOptions = Android.AndroidOpenWriteFileStreamOptions | Ios.IosOpenWriteFileStreamOptions | (DesktopOpenOptions & {
	/** Number of bytes buffered before writing. Defaults to 512 KiB. */
	bufferByteLength?: number
	/** Byte offset where writing should begin. */
	offset?: number
	/** Aborts the stream and releases the file handle. */
	signal?: AbortSignal
})

/**
 * Directory-listing options accepted by `readDir`.
 */
export type UnifiedReadDirOptions = Android.AndroidReadDirOptions | Ios.IosReadDirOptions | DesktopReadDirOptions

/**
 * Removal options accepted by recursive directory deletion on desktop.
 */
export type UnifiedRemoveDirAllOptions = DesktopRemoveOptions

/**
 * Removal options accepted by empty directory deletion on desktop.
 */
export type UnifiedRemoveEmptyDirOptions = DesktopRemoveOptions

/**
 * Existence-check options accepted by desktop paths.
 */
export type UnifiedExistsOptions = DesktopExistsOptions

/**
 * Metadata options accepted by desktop paths.
 */
export type UnifiedMetadataOptions = DesktopStatOptions

/**
 * File picker options accepted by the portable file picker.
 */
export type UnifiedOpenFilePickerOptions = Android.AndroidOpenFilePickerOptions | Ios.IosOpenFilePickerOptions | DesktopOpenDialogOptions

/**
 * Directory picker options accepted by the portable directory picker.
 */
export type UnifiedOpenDirPickerOptions = Android.AndroidOpenDirPickerOptions | Ios.IosOpenDirPickerOptions | DesktopOpenDialogOptions

/**
 * Save picker options accepted by the portable save picker.
 */
export type UnifiedSaveFilePickerOptions = Android.AndroidSaveFilePickerOptions | Ios.IosSaveFilePickerOptions | DesktopSaveDialogOptions

/**
 * A file selected by the portable file picker.
 *
 * Desktop returns a path string. Android returns an `AndroidFsUri`. iOS returns
 * an `IosFsUri` with bookmark metadata when the provider supports it.
 */
export type PickedFile = Android.AndroidFsUri | Ios.IosFsUri | string

/**
 * A directory selected by the portable directory picker.
 *
 * Desktop returns a path string. Android returns an `AndroidFsUri`. iOS returns
 * an `IosFsUri` with `isDirectory: true`.
 */
export type PickedDirectory = Android.AndroidFsUri | Ios.IosFsUri | string

/**
 * A destination selected by the portable save-file picker.
 *
 * Desktop returns a path string. Android and iOS return platform URI objects.
 */
export type PickedSaveFile = Android.AndroidFsUri | Ios.IosFsUri | string

/**
 * Describes the filesystem features available on the current platform.
 */
export type PlatformFsCapabilities = {
	/** Current platform bucket used by this package. */
	platform: 'android' | 'ios' | 'desktop'

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

	/** `true` when iOS security-scoped bookmarks are available. */
	supportsSecurityScopedBookmarks: boolean

	/** `true` when byte streams can be opened without loading entire files. */
	supportsFileStreams: boolean
}

/**
 * Returns `true` when the runtime is neither Android nor iOS.
 */
export function isDesktop(): boolean {
	return !Android.isAndroid() && !Ios.isIos()
}

/**
 * Returns a feature summary for the current platform.
 *
 * This is useful when UI code needs to hide platform-specific workflows such
 * as Android public storage or iOS security-scoped bookmark management.
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
			supportsSecurityScopedBookmarks: false,
			supportsFileStreams: true,
		}
	}

	if (Ios.isIos()) {
		return {
			platform: 'ios',
			usesOfficialFs: false,
			supportsAndroidUris: false,
			supportsPublicStorage: false,
			supportsPersistedPickerPermissions: false,
			supportsThumbnails: false,
			supportsSecurityScopedBookmarks: true,
			supportsFileStreams: true,
		}
	}

	return {
		platform: 'desktop',
		usesOfficialFs: true,
		supportsAndroidUris: false,
		supportsPublicStorage: false,
		supportsPersistedPickerPermissions: false,
		supportsThumbnails: false,
		supportsSecurityScopedBookmarks: false,
		supportsFileStreams: true,
	}
}

const DEFAULT_STREAM_BUFFER_BYTE_LENGTH = 512 * 1024
const desktopStreamHandles = new Set<TauriFs.FileHandle>()

function isAndroidFsUri(value: unknown): value is Android.AndroidFsUri {
	return (
		typeof value === 'object' &&
		value !== null &&
		'uri' in value &&
		typeof (value as { uri: unknown }).uri === 'string'
	)
}

function isIosFsUri(value: unknown): value is Ios.IosFsUri {
	return (
		typeof value === 'object' &&
		value !== null &&
		'uri' in value &&
		'bookmarkId' in value &&
		typeof (value as { uri: unknown }).uri === 'string'
	)
}

function mapDesktopPath(path: Android.FsPath): string {
	return path instanceof URL ? path.toString() : path
}

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw signal.reason ?? new Error('The operation was aborted.')
	}
}

function mapStreamBufferByteLength(value?: number): number {
	if (value == null) {
		return DEFAULT_STREAM_BUFFER_BYTE_LENGTH
	}
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new RangeError('bufferByteLength must be a positive safe integer.')
	}
	return value
}

function mapStreamOffset(value?: number): number | null {
	if (value == null) {
		return null
	}
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new RangeError('offset must be a non-negative safe integer.')
	}
	return value
}

async function createDesktopEmptyFile(path: Android.FsPath, options?: DesktopCreateOptions): Promise<void> {
	const file = await TauriFs.create(mapDesktopPath(path), options)
	await file.close()
}

async function closeDesktopFileHandle(file: TauriFs.FileHandle): Promise<void> {
	if (!desktopStreamHandles.delete(file)) return
	await file.close()
}

function mapDesktopReadStreamOptions(options?: UnifiedOpenReadFileStreamOptions): DesktopOpenOptions {
	const { bufferByteLength: _bufferByteLength, offset: _offset, signal: _signal, ...openOptions } = (options ?? {}) as DesktopOpenOptions & {
		bufferByteLength?: number
		offset?: number
		signal?: AbortSignal
	}
	return {
		...openOptions,
		read: true,
	}
}

function mapDesktopWriteStreamOptions(options?: UnifiedOpenWriteFileStreamOptions): DesktopOpenOptions {
	const { bufferByteLength: _bufferByteLength, offset, signal: _signal, notification: _notification, ...openOptions } = (options ?? {}) as DesktopOpenOptions & {
		bufferByteLength?: number
		offset?: number
		signal?: AbortSignal
		notification?: unknown
	}
	const append = openOptions.append ?? false
	return {
		...openOptions,
		write: true,
		create: openOptions.create ?? false,
		append,
		truncate: openOptions.truncate ?? (!append && offset == null),
	}
}

async function openDesktopReadFileStream(
	path: Android.FsPath,
	options?: UnifiedOpenReadFileStreamOptions
): Promise<ReadableStream<Uint8Array<ArrayBuffer>>> {
	throwIfAborted((options as { signal?: AbortSignal } | undefined)?.signal)
	const bufferByteLength = mapStreamBufferByteLength((options as { bufferByteLength?: number } | undefined)?.bufferByteLength)
	const offset = mapStreamOffset((options as { offset?: number } | undefined)?.offset)
	const signal = (options as { signal?: AbortSignal } | undefined)?.signal
	const file = await TauriFs.open(mapDesktopPath(path), mapDesktopReadStreamOptions(options))
	desktopStreamHandles.add(file)
	if (offset != null) {
		await file.seek(offset, TauriFs.SeekMode.Start)
	}

	return new ReadableStream<Uint8Array<ArrayBuffer>>({
		start: controller => {
			signal?.addEventListener('abort', () => {
				void closeDesktopFileHandle(file).finally(() => controller.error(signal.reason ?? new Error('The operation was aborted.')))
			}, { once: true })
		},
		async pull(controller) {
			try {
				throwIfAborted(signal)
				const buffer = new Uint8Array(bufferByteLength)
				const read = await file.read(buffer)
				if (read == null) {
					await closeDesktopFileHandle(file)
					controller.close()
					return
				}
				controller.enqueue(buffer.slice(0, read) as Uint8Array<ArrayBuffer>)
			}
			catch (error) {
				await closeDesktopFileHandle(file)
				controller.error(error)
			}
		},
		cancel: () => closeDesktopFileHandle(file),
	})
}

async function openDesktopWriteFileStream(
	path: Android.FsPath,
	options?: UnifiedOpenWriteFileStreamOptions
): Promise<WritableStream<Uint8Array<ArrayBufferLike>>> {
	throwIfAborted((options as { signal?: AbortSignal } | undefined)?.signal)
	const offset = mapStreamOffset((options as { offset?: number } | undefined)?.offset)
	const signal = (options as { signal?: AbortSignal } | undefined)?.signal
	const file = await TauriFs.open(mapDesktopPath(path), mapDesktopWriteStreamOptions(options))
	desktopStreamHandles.add(file)
	if (offset != null) {
		await file.seek(offset, TauriFs.SeekMode.Start)
	}

	return new WritableStream<Uint8Array<ArrayBufferLike>>({
		start: controller => {
			signal?.addEventListener('abort', () => {
				void closeDesktopFileHandle(file).finally(() => controller.error(signal.reason ?? new Error('The operation was aborted.')))
			}, { once: true })
		},
		async write(chunk) {
			throwIfAborted(signal)
			let written = 0
			while (written < chunk.byteLength) {
				const next = await file.write(chunk.subarray(written))
				if (next <= 0) {
					throw new Error('Unable to write stream chunk.')
				}
				written += next
			}
		},
		close: () => closeDesktopFileHandle(file),
		abort: () => closeDesktopFileHandle(file),
	})
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

function requireIosBaseUri(value: VnidropFsPath, method: string): Ios.IosFsUri {
	if (!isIosFsUri(value)) {
		throw new TypeError(`${method} on iOS requires an IosFsUri base directory.`)
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
 * Desktop delegates to `@tauri-apps/plugin-fs.readFile`. Android and iOS
 * delegate to native implementations and accept URI objects returned by their
 * picker/storage APIs.
 *
 * @param path File path, file URL, Android file URI, or iOS file URI.
 * @param options Desktop filesystem options. Ignored on mobile.
 * @returns File contents as a `Uint8Array`.
 */
export async function readFile(
	path: VnidropFsPath,
	options?: DesktopReadFileOptions
): Promise<Uint8Array<ArrayBuffer>> {
	if (Android.isAndroid()) {
		return Android.readFile(path as Android.FsPath | Android.AndroidFsUri)
	}
	if (Ios.isIos()) {
		return Ios.readFile(path as Ios.FsPath | Ios.IosFsUri)
	}

	return TauriFs.readFile(mapDesktopPath(path as Android.FsPath), options)
}

/**
 * Reads an entire file as text.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.readTextFile`. Android and iOS
 * read through native implementations and decode with the requested encoding
 * where supported.
 *
 * @param path File path, file URL, Android file URI, or iOS file URI.
 * @param options Desktop read options or mobile text-decoding options.
 * @returns Decoded file contents.
 */
export async function readTextFile(
	path: VnidropFsPath,
	options?: UnifiedReadTextFileOptions
): Promise<string> {
	if (Android.isAndroid()) {
		return Android.readTextFile(path as Android.FsPath | Android.AndroidFsUri, options as Android.AndroidReadTextFileOptions)
	}
	if (Ios.isIos()) {
		return Ios.readTextFile(path as Ios.FsPath | Ios.IosFsUri, options as Ios.IosReadTextFileOptions)
	}

	return TauriFs.readTextFile(mapDesktopPath(path as Android.FsPath), options as DesktopReadTextFileOptions)
}

/**
 * Writes bytes to a file.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.writeFile`. Android and iOS
 * delegate to native writers and can write to picker/provider URIs when the app
 * has permission.
 *
 * @param path Destination path, file URL, Android file URI, or iOS file URI.
 * @param data Bytes to write.
 * @param options Desktop write options or mobile write options.
 */
export async function writeFile(
	path: VnidropFsPath,
	data: Uint8Array<ArrayBufferLike>,
	options?: UnifiedWriteFileOptions
): Promise<void> {
	if (Android.isAndroid()) {
		return Android.writeFile(path as Android.FsPath | Android.AndroidFsUri, data, options as Android.AndroidWriteFileOptions)
	}
	if (Ios.isIos()) {
		return Ios.writeFile(path as Ios.FsPath | Ios.IosFsUri, data, options as Ios.IosWriteFileOptions)
	}

	return TauriFs.writeFile(mapDesktopPath(path as Android.FsPath), data, options as DesktopWriteFileOptions)
}

/**
 * Writes UTF-8 text to a file.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.writeTextFile`. Android and iOS
 * encode the string and write through native implementations.
 *
 * @param path Destination path, file URL, Android file URI, or iOS file URI.
 * @param data Text to write.
 * @param options Desktop write options or mobile write options.
 */
export async function writeTextFile(
	path: VnidropFsPath,
	data: string,
	options?: UnifiedWriteTextFileOptions
): Promise<void> {
	if (Android.isAndroid()) {
		return Android.writeTextFile(path as Android.FsPath | Android.AndroidFsUri, data, options as Android.AndroidWriteTextFileOptions)
	}
	if (Ios.isIos()) {
		return Ios.writeTextFile(path as Ios.FsPath | Ios.IosFsUri, data, options as Ios.IosWriteTextFileOptions)
	}

	return TauriFs.writeTextFile(mapDesktopPath(path as Android.FsPath), data, options as DesktopWriteTextFileOptions)
}

/**
 * Opens a file as a byte `ReadableStream`.
 *
 * This is the portable large-file read API. It reads chunks on demand instead
 * of loading the whole file into WebView memory. Desktop uses
 * `@tauri-apps/plugin-fs.open`; Android and iOS keep native file descriptors
 * open until the stream reaches EOF, is canceled, errors, or the abort signal
 * fires.
 *
 * @param path File path, file URL, Android file URI, or iOS file URI.
 * @param options Chunk size, optional start offset, abort signal, and desktop
 * open options where applicable.
 */
export async function openReadFileStream(
	path: VnidropFsPath,
	options?: UnifiedOpenReadFileStreamOptions
): Promise<ReadableStream<Uint8Array<ArrayBuffer>>> {
	if (Android.isAndroid()) {
		return Android.openReadFileStream(path as Android.FsPath | Android.AndroidFsUri, options as Android.AndroidOpenReadFileStreamOptions)
	}
	if (Ios.isIos()) {
		return Ios.openReadFileStream(path as Ios.FsPath | Ios.IosFsUri, options as Ios.IosOpenReadFileStreamOptions)
	}

	return openDesktopReadFileStream(path as Android.FsPath, options)
}

/**
 * Opens a file as a byte `WritableStream`.
 *
 * This is the portable large-file write API. It sends chunks to native code as
 * the stream is written, avoiding whole-file buffering. Desktop uses
 * `@tauri-apps/plugin-fs.open`; Android and iOS keep native file descriptors
 * open until the stream is closed, aborted, errors, or the abort signal fires.
 *
 * @param path Destination path, file URL, Android file URI, or iOS file URI.
 * @param options Creation/append/truncate behavior, optional write offset,
 * chunk size, abort signal, and desktop open options where applicable.
 */
export async function openWriteFileStream(
	path: VnidropFsPath,
	options?: UnifiedOpenWriteFileStreamOptions
): Promise<WritableStream<Uint8Array<ArrayBufferLike>>> {
	if (Android.isAndroid()) {
		return Android.openWriteFileStream(path as Android.FsPath | Android.AndroidFsUri, options as Android.AndroidOpenWriteFileStreamOptions)
	}
	if (Ios.isIos()) {
		return Ios.openWriteFileStream(path as Ios.FsPath | Ios.IosFsUri, options as Ios.IosOpenWriteFileStreamOptions)
	}

	return openDesktopWriteFileStream(path as Android.FsPath, options)
}

/**
 * Forcibly closes every native file stream opened by this plugin.
 *
 * Use this as a cleanup escape hatch during app shutdown, failed stream
 * operations, or test teardown. Existing JavaScript stream objects should be
 * discarded after this call.
 */
export async function closeAllFileStreams(): Promise<void> {
	if (Android.isAndroid()) {
		return Android.closeAllFileStreams()
	}
	if (Ios.isIos()) {
		return Ios.closeAllFileStreams()
	}

	await Promise.all([...desktopStreamHandles].map(file => closeDesktopFileHandle(file)))
}

/**
 * Returns the number of currently open file streams owned by this plugin.
 *
 * On desktop this counts streams opened through the portable root API. On
 * mobile it asks the native backend for its open descriptor/resource count.
 */
export async function countAllFileStreams(): Promise<number> {
	if (Android.isAndroid()) {
		return Android.countAllFileStreams()
	}
	if (Ios.isIos()) {
		return Ios.countAllFileStreams()
	}

	return desktopStreamHandles.size
}

/**
 * Reads the immediate children of a directory.
 *
 * Desktop returns Tauri `DirEntry` objects. Android and iOS return metadata
 * entries that include each child's platform URI object.
 *
 * @param path Directory path on desktop, or a platform directory URI on mobile.
 * @param options Desktop read-dir options or mobile pagination options.
 */
export async function readDir(
	path: VnidropFsPath,
	options?: UnifiedReadDirOptions
): Promise<Android.AndroidEntryMetadataWithUri[] | Ios.IosEntryMetadataWithUri[] | Awaited<ReturnType<typeof TauriFs.readDir>>> {
	if (Android.isAndroid()) {
		return Android.readDir(requireAndroidBaseUri(path, 'readDir'), options as Android.AndroidReadDirOptions)
	}
	if (Ios.isIos()) {
		return Ios.readDir(requireIosBaseUri(path, 'readDir'), options as Ios.IosReadDirOptions)
	}

	return TauriFs.readDir(mapDesktopPath(path as Android.FsPath), options as DesktopReadDirOptions)
}

/**
 * Creates a directory on desktop.
 *
 * On mobile, use the overload that accepts a platform base directory URI and a
 * relative path.
 */
export async function createDir(
	pathOrBaseDir: Android.FsPath,
	options?: DesktopMkdirOptions
): Promise<void>

/**
 * Creates or resolves a directory under an Android or iOS base directory URI.
 *
 * The base directory should come from a mobile directory picker or another
 * platform storage API. Missing parent directories are created by the native
 * implementation where supported.
 */
export async function createDir(
	baseDirUri: Android.AndroidFsUri,
	relativePath: string
): Promise<Android.AndroidFsUri>
export async function createDir(
	baseDirUri: Ios.IosFsUri,
	relativePath: string
): Promise<Ios.IosFsUri>
export async function createDir(
	pathOrBaseDir: VnidropFsPath,
	optionsOrRelativePath?: DesktopMkdirOptions | string
): Promise<void | Android.AndroidFsUri | Ios.IosFsUri> {
	if (Android.isAndroid()) {
		return Android.createDir(
			requireAndroidBaseUri(pathOrBaseDir, 'createDir'),
			typeof optionsOrRelativePath === 'string' ? optionsOrRelativePath : ''
		)
	}
	if (Ios.isIos()) {
		return Ios.createDir(
			requireIosBaseUri(pathOrBaseDir, 'createDir'),
			typeof optionsOrRelativePath === 'string' ? optionsOrRelativePath : ''
		)
	}

	return TauriFs.mkdir(mapDesktopPath(pathOrBaseDir as Android.FsPath), optionsOrRelativePath as DesktopMkdirOptions)
}

/**
 * Opens a file picker.
 *
 * Desktop uses `@tauri-apps/plugin-dialog.open` and returns selected path
 * strings. Android and iOS use native pickers and return platform URI objects.
 * Cancellation returns an empty array.
 *
 * @param options Desktop dialog options or mobile picker options. Mobile
 * `mimeTypes` are mapped to desktop dialog filters when possible.
 */
export async function showOpenFilePicker(
	options?: UnifiedOpenFilePickerOptions
): Promise<PickedFile[]> {
	if (Android.isAndroid()) {
		return Android.showOpenFilePicker(options as Android.AndroidOpenFilePickerOptions)
	}
	if (Ios.isIos()) {
		return Ios.showOpenFilePicker(options as Ios.IosOpenFilePickerOptions)
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
 * Android uses the native Storage Access Framework directory picker. iOS uses
 * a native open-in-place document picker for directories.
 *
 * @param options Desktop dialog options or mobile directory picker options.
 * @returns A desktop path string, a platform directory URI, or `null` when
 * canceled.
 */
export async function showOpenDirPicker(
	options?: UnifiedOpenDirPickerOptions
): Promise<PickedDirectory | null> {
	if (Android.isAndroid()) {
		return Android.showOpenDirPicker(options as Android.AndroidOpenDirPickerOptions)
	}
	if (Ios.isIos()) {
		return Ios.showOpenDirPicker(options as Ios.IosOpenDirPickerOptions)
	}

	const selected = await TauriDialog.open(mapDesktopOpenDirPickerOptions(options))
	return Array.isArray(selected) ? (selected[0] ?? null) : selected
}

/**
 * Opens a save-file picker on mobile.
 *
 * Android and iOS require an initial file name and optional MIME type. Desktop
 * callers may use the object-options overload below instead.
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
	if (Ios.isIos()) {
		return Ios.showSaveFilePicker(
			typeof defaultFileNameOrOptions === 'string' ? defaultFileNameOrOptions : '',
			mimeType,
			options as Ios.IosSaveFilePickerOptions
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
 * Creates a new Android or iOS file under a base directory URI.
 *
 * If a file with the same name exists, the native implementation creates a
 * unique name. The returned URI points to the created file.
 */
export async function createNewFile(
	baseDirUri: Android.AndroidFsUri,
	relativePath: string,
	mimeType?: string | null
): Promise<Android.AndroidFsUri>
export async function createNewFile(
	baseDirUri: Ios.IosFsUri,
	relativePath: string,
	mimeType?: string | null
): Promise<Ios.IosFsUri>
export async function createNewFile(
	pathOrBaseDirUri: VnidropFsPath,
	optionsOrRelativePath?: DesktopCreateOptions | string,
	mimeType: string | null = null
): Promise<Android.FsPath | Android.AndroidFsUri | Ios.IosFsUri> {
	if (Android.isAndroid()) {
		return Android.createNewFile(
			requireAndroidBaseUri(pathOrBaseDirUri, 'createNewFile'),
			typeof optionsOrRelativePath === 'string' ? optionsOrRelativePath : '',
			mimeType
		)
	}
	if (Ios.isIos()) {
		return Ios.createNewFile(
			requireIosBaseUri(pathOrBaseDirUri, 'createNewFile'),
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
 * Creates a new Android or iOS directory under a base directory URI.
 *
 * If a directory with the same name exists, the native implementation creates a
 * unique name. The returned URI points to the created directory.
 */
export async function createNewDir(
	baseDirUri: Android.AndroidFsUri,
	relativePath: string
): Promise<Android.AndroidFsUri>
export async function createNewDir(
	baseDirUri: Ios.IosFsUri,
	relativePath: string
): Promise<Ios.IosFsUri>
export async function createNewDir(
	pathOrBaseDirUri: VnidropFsPath,
	optionsOrRelativePath?: DesktopMkdirOptions | string
): Promise<Android.FsPath | Android.AndroidFsUri | Ios.IosFsUri> {
	if (Android.isAndroid()) {
		return Android.createNewDir(
			requireAndroidBaseUri(pathOrBaseDirUri, 'createNewDir'),
			typeof optionsOrRelativePath === 'string' ? optionsOrRelativePath : ''
		)
	}
	if (Ios.isIos()) {
		return Ios.createNewDir(
			requireIosBaseUri(pathOrBaseDirUri, 'createNewDir'),
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
 * destination with `writeFile`. Android and iOS use native copy operations so
 * they can work with provider URIs when permissions allow.
 *
 * @param srcPath Source file path or platform URI.
 * @param destPath Destination file path or platform URI.
 * @param options Android copy options. Ignored on desktop and iOS.
 */
export async function copyFile(
	srcPath: VnidropFsPath,
	destPath: VnidropFsPath,
	options?: Android.AndroidCopyFileOptions
): Promise<void> {
	if (Android.isAndroid()) {
		return Android.copyFile(
			srcPath as Android.FsPath | Android.AndroidFsUri,
			destPath as Android.FsPath | Android.AndroidFsUri,
			options
		)
	}
	if (Ios.isIos()) {
		return Ios.copyFile(srcPath as Ios.FsPath | Ios.IosFsUri, destPath as Ios.FsPath | Ios.IosFsUri)
	}

	const data = await TauriFs.readFile(mapDesktopPath(srcPath as Android.FsPath))
	return TauriFs.writeFile(mapDesktopPath(destPath as Android.FsPath), data)
}

/**
 * Renames a file.
 *
 * Desktop renames from one path to another. Android and iOS rename a file URI
 * to a new entry name and return the new URI.
 *
 * @param pathOrUri Desktop source path or mobile file URI.
 * @param newPathOrName Desktop destination path, or mobile new file name.
 */
export async function renameFile(
	pathOrUri: VnidropFsPath,
	newPathOrName: string,
	options?: DesktopRenameOptions
): Promise<void | Android.AndroidFsUri | Ios.IosFsUri> {
	if (Android.isAndroid()) {
		return Android.renameFile(requireAndroidBaseUri(pathOrUri, 'renameFile'), newPathOrName)
	}
	if (Ios.isIos()) {
		return Ios.renameFile(requireIosBaseUri(pathOrUri, 'renameFile'), newPathOrName)
	}

	return TauriFs.rename(mapDesktopPath(pathOrUri as Android.FsPath), newPathOrName, options)
}

/**
 * Renames a directory.
 *
 * Desktop renames from one path to another. Android and iOS rename a directory
 * URI to a new entry name and return the new URI.
 *
 * @param pathOrUri Desktop source path or mobile directory URI.
 * @param newPathOrName Desktop destination path, or mobile new directory name.
 */
export async function renameDir(
	pathOrUri: VnidropFsPath,
	newPathOrName: string,
	options?: DesktopRenameOptions
): Promise<void | Android.AndroidFsUri | Ios.IosFsUri> {
	if (Android.isAndroid()) {
		return Android.renameDir(requireAndroidBaseUri(pathOrUri, 'renameDir'), newPathOrName)
	}
	if (Ios.isIos()) {
		return Ios.renameDir(requireIosBaseUri(pathOrUri, 'renameDir'), newPathOrName)
	}

	return TauriFs.rename(mapDesktopPath(pathOrUri as Android.FsPath), newPathOrName, options)
}

/**
 * Removes a file.
 *
 * Desktop removes a path with `@tauri-apps/plugin-fs.remove`. Android and iOS
 * remove the file represented by a platform URI object.
 */
export async function removeFile(pathOrUri: VnidropFsPath): Promise<void> {
	if (Android.isAndroid()) {
		return Android.removeFile(requireAndroidBaseUri(pathOrUri, 'removeFile'))
	}
	if (Ios.isIos()) {
		return Ios.removeFile(requireIosBaseUri(pathOrUri, 'removeFile'))
	}

	return TauriFs.remove(mapDesktopPath(pathOrUri as Android.FsPath))
}

/**
 * Removes an empty directory.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.remove` without forcing
 * recursion. Android and iOS use native empty-directory removal operations.
 */
export async function removeEmptyDir(
	pathOrUri: VnidropFsPath,
	options?: UnifiedRemoveEmptyDirOptions
): Promise<void> {
	if (Android.isAndroid()) {
		return Android.removeEmptyDir(requireAndroidBaseUri(pathOrUri, 'removeEmptyDir'))
	}
	if (Ios.isIos()) {
		return Ios.removeEmptyDir(requireIosBaseUri(pathOrUri, 'removeEmptyDir'))
	}

	return TauriFs.remove(mapDesktopPath(pathOrUri as Android.FsPath), options)
}

/**
 * Removes a directory and all of its contents.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.remove` with `recursive: true`.
 * Android and iOS use native recursive directory removal operations.
 */
export async function removeDirAll(
	pathOrUri: VnidropFsPath,
	options?: UnifiedRemoveDirAllOptions
): Promise<void> {
	if (Android.isAndroid()) {
		return Android.removeDirAll(requireAndroidBaseUri(pathOrUri, 'removeDirAll'))
	}
	if (Ios.isIos()) {
		return Ios.removeDirAll(requireIosBaseUri(pathOrUri, 'removeDirAll'))
	}

	return TauriFs.remove(mapDesktopPath(pathOrUri as Android.FsPath), { ...options, recursive: true })
}

/**
 * Checks whether a file or directory exists.
 *
 * Desktop delegates to `@tauri-apps/plugin-fs.exists`. Android and iOS attempt
 * native resolution and return `false` if the target cannot be resolved.
 */
export async function exists(
	path: VnidropFsPath,
	options?: UnifiedExistsOptions
): Promise<boolean> {
	if (Android.isAndroid()) {
		try {
			await Android.getType(path as Android.FsPath | Android.AndroidFsUri)
			return true
		}
		catch {
			return false
		}
	}
	if (Ios.isIos()) {
		return Ios.exists(path as Ios.FsPath | Ios.IosFsUri)
	}

	return TauriFs.exists(mapDesktopPath(path as Android.FsPath), options)
}

/**
 * Reads metadata for a file or directory.
 *
 * Desktop returns Tauri `FileInfo`. Android and iOS return mobile entry
 * metadata, including MIME type and byte length for files.
 */
export async function getMetadata(
	path: VnidropFsPath,
	options?: UnifiedMetadataOptions
): Promise<Android.AndroidEntryMetadata | Ios.IosEntryMetadata | Awaited<ReturnType<typeof TauriFs.stat>>> {
	if (Android.isAndroid()) {
		return Android.getMetadata(path as Android.FsPath | Android.AndroidFsUri)
	}
	if (Ios.isIos()) {
		return Ios.getMetadata(path as Ios.FsPath | Ios.IosFsUri)
	}

	return TauriFs.stat(mapDesktopPath(path as Android.FsPath), options)
}
