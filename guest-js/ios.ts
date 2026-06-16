import { invoke } from '@tauri-apps/api/core'

declare global {
	interface Window {
		__TAURI_VNIDROP_FS_PLUGIN_INTERNALS__?: {
			isAndroid: boolean
			isIos: boolean
		}
	}
}

export type FsPath = string | URL

/**
 * iOS filesystem URI returned by Vnidrop FS pickers and bookmark APIs.
 *
 * `uri` is usually a `file://` URL. `bookmarkId` identifies the persisted
 * security-scoped bookmark used to regain access after app restart. App-local
 * URLs may have `bookmarkId: null`.
 */
export type IosFsUri = {
	uri: string
	bookmarkId: string | null
	isDirectory?: boolean
}

export type IosReadTextFileOptions = {
	encoding?: string
}

export type IosWriteFileOptions = {
	create?: boolean
}

export type IosWriteTextFileOptions = IosWriteFileOptions & {
	encoding?: string
}

export type IosReadDirOptions = {
	offset?: number
	limit?: number
}

export type IosOpenFilePickerOptions = {
	multiple?: boolean
	mimeTypes?: string | string[]
}

export type IosOpenDirPickerOptions = {
	initialLocation?: IosFsUri | FsPath
}

export type IosSaveFilePickerOptions = {
	mimeType?: string | null
}

export type IosEntryMetadata =
	| {
		type: 'Dir'
		name: string
		lastModified: Date
	}
	| {
		type: 'File'
		name: string
		lastModified: Date
		byteLength: number
		mimeType: string
	}

export type IosEntryMetadataWithUri = IosEntryMetadata & { uri: IosFsUri }

type IosEntryMetadataInner =
	| {
		type: 'Dir'
		name: string
		lastModified: number
	}
	| {
		type: 'File'
		name: string
		lastModified: number
		byteLength: number
		mimeType: string
	}

type IosEntryMetadataWithUriInner = IosEntryMetadataInner & { uri: IosFsUri }

function mapFsPathForInput(uri: FsPath | IosFsUri): string | IosFsUri {
	return uri instanceof URL ? uri.toString() : uri
}

function mapMetadata(entry: IosEntryMetadataInner): IosEntryMetadata {
	return {
		...entry,
		lastModified: new Date(entry.lastModified),
	} as IosEntryMetadata
}

function mapMetadataWithUri(entry: IosEntryMetadataWithUriInner): IosEntryMetadataWithUri {
	return {
		...mapMetadata(entry),
		uri: entry.uri,
	}
}

/**
 * Returns `true` when the current Tauri runtime is iOS.
 */
export function isIos(): boolean {
	const isIos = window.__TAURI_VNIDROP_FS_PLUGIN_INTERNALS__?.isIos
	if (isIos !== undefined) {
		return isIos
	}

	return false
}

/**
 * Lists security-scoped bookmarks persisted by this plugin.
 */
export async function listSecurityScopedBookmarks(): Promise<IosFsUri[]> {
	return invoke('plugin:vnidrop-fs|listSecurityScopedBookmarks')
}

/**
 * Resolves a persisted security-scoped bookmark into an `IosFsUri`.
 *
 * Use this when restoring access to a document-provider file or directory that
 * was picked in an earlier app session.
 */
export async function resolveSecurityScopedBookmark(bookmarkId: string): Promise<IosFsUri> {
	return invoke('plugin:vnidrop-fs|resolveSecurityScopedBookmark', { bookmarkId })
}

/**
 * Removes a persisted security-scoped bookmark from the plugin store.
 *
 * Returns `true` when a bookmark was removed.
 */
export async function releaseSecurityScopedBookmark(bookmarkId: string): Promise<boolean> {
	return invoke('plugin:vnidrop-fs|releaseSecurityScopedBookmark', { bookmarkId })
}

/**
 * Persists a security-scoped bookmark for an iOS URL.
 *
 * Picker results are already persisted. Call this for URLs obtained through
 * other trusted flows when you need future access. Raw string paths are limited
 * to app-container file URLs; external documents should come from a picker.
 */
export async function persistSecurityScopedBookmark(uri: IosFsUri | FsPath): Promise<IosFsUri> {
	return invoke('plugin:vnidrop-fs|persistSecurityScopedBookmark', { uri: mapFsPathForInput(uri) })
}

/**
 * Reads an iOS app-local file URL or picker URI as bytes.
 */
export async function readFile(uri: IosFsUri | FsPath): Promise<Uint8Array<ArrayBuffer>> {
	const bytes = await invoke<number[]>('plugin:vnidrop-fs|readFile', { uri: mapFsPathForInput(uri) })
	return new Uint8Array(bytes) as Uint8Array<ArrayBuffer>
}

/**
 * Reads an iOS app-local file URL or picker URI as text.
 */
export async function readTextFile(uri: IosFsUri | FsPath, options?: IosReadTextFileOptions): Promise<string> {
	return invoke('plugin:vnidrop-fs|readTextFile', { uri: mapFsPathForInput(uri), encoding: options?.encoding ?? null })
}

/**
 * Writes bytes to an iOS app-local file URL or picker URI.
 */
export async function writeFile(
	uri: IosFsUri | FsPath,
	data: Uint8Array<ArrayBufferLike>,
	options?: IosWriteFileOptions
): Promise<void> {
	return invoke('plugin:vnidrop-fs|writeFile', {
		uri: mapFsPathForInput(uri),
		data: Array.from(data),
		create: options?.create ?? true,
	})
}

/**
 * Writes text to an iOS app-local file URL or picker URI.
 */
export async function writeTextFile(
	uri: IosFsUri | FsPath,
	data: string,
	options?: IosWriteTextFileOptions
): Promise<void> {
	return invoke('plugin:vnidrop-fs|writeTextFile', {
		uri: mapFsPathForInput(uri),
		data,
		encoding: options?.encoding ?? null,
		create: options?.create ?? true,
	})
}

/**
 * Lists immediate children of an iOS directory URI.
 */
export async function readDir(uri: IosFsUri, options?: IosReadDirOptions): Promise<IosEntryMetadataWithUri[]> {
	const entries = await invoke<IosEntryMetadataWithUriInner[]>('plugin:vnidrop-fs|readDir', {
		uri,
		offset: options?.offset ?? 0,
		limit: options?.limit ?? null,
	})

	return entries.map(mapMetadataWithUri)
}

/**
 * Creates a directory under an iOS directory URI.
 */
export async function createDir(baseDirUri: IosFsUri, relativePath: string): Promise<IosFsUri> {
	return invoke('plugin:vnidrop-fs|createDir', { baseDirUri, relativePath })
}

/**
 * Creates a new file under an iOS directory URI using a unique name when
 * needed.
 */
export async function createNewFile(
	baseDirUri: IosFsUri,
	relativePath: string,
	mimeType: string | null = null
): Promise<IosFsUri> {
	return invoke('plugin:vnidrop-fs|createNewFile', { baseDirUri, relativePath, mimeType })
}

/**
 * Creates a new directory under an iOS directory URI using a unique name when
 * needed.
 */
export async function createNewDir(baseDirUri: IosFsUri, relativePath: string): Promise<IosFsUri> {
	return invoke('plugin:vnidrop-fs|createNewDir', { baseDirUri, relativePath })
}

/**
 * Copies between iOS app-local file URLs and/or picker URIs.
 */
export async function copyFile(srcPath: IosFsUri | FsPath, destPath: IosFsUri | FsPath): Promise<void> {
	return invoke('plugin:vnidrop-fs|copyFile', {
		srcPath: mapFsPathForInput(srcPath),
		destPath: mapFsPathForInput(destPath),
	})
}

/**
 * Renames an iOS file URI and returns the updated URI.
 */
export async function renameFile(uri: IosFsUri, newName: string): Promise<IosFsUri> {
	return invoke('plugin:vnidrop-fs|renameFile', { uri, newName })
}

/**
 * Renames an iOS directory URI and returns the updated URI.
 */
export async function renameDir(uri: IosFsUri, newName: string): Promise<IosFsUri> {
	return invoke('plugin:vnidrop-fs|renameDir', { uri, newName })
}

/**
 * Removes the file represented by an iOS URI.
 */
export async function removeFile(uri: IosFsUri): Promise<void> {
	return invoke('plugin:vnidrop-fs|removeFile', { uri })
}

/**
 * Removes an empty iOS directory. The native operation fails when the directory
 * still contains entries.
 */
export async function removeEmptyDir(uri: IosFsUri): Promise<void> {
	return invoke('plugin:vnidrop-fs|removeEmptyDir', { uri })
}

/**
 * Removes an iOS directory and all of its contents.
 */
export async function removeDirAll(uri: IosFsUri): Promise<void> {
	return invoke('plugin:vnidrop-fs|removeDirAll', { uri })
}

/**
 * Checks whether an iOS app-local file URL or picker URI exists.
 */
export async function exists(uri: IosFsUri | FsPath): Promise<boolean> {
	return invoke('plugin:vnidrop-fs|exists', { uri: mapFsPathForInput(uri) })
}

/**
 * Reads metadata for an iOS app-local file URL or picker URI.
 */
export async function getMetadata(uri: IosFsUri | FsPath): Promise<IosEntryMetadata> {
	const entry = await invoke<IosEntryMetadataInner>('plugin:vnidrop-fs|getMetadata', { uri: mapFsPathForInput(uri) })
	return mapMetadata(entry)
}

/**
 * Opens the iOS file picker in place. Cancellation returns an empty array.
 */
export async function showOpenFilePicker(options?: IosOpenFilePickerOptions): Promise<IosFsUri[]> {
	const mimeTypes = options?.mimeTypes
	return invoke('plugin:vnidrop-fs|showOpenFilePicker', {
		multiple: options?.multiple ?? false,
		mimeTypes: mimeTypes == null ? [] : Array.isArray(mimeTypes) ? mimeTypes : [mimeTypes],
	})
}

/**
 * Opens the iOS directory picker in place. Cancellation returns `null`.
 */
export async function showOpenDirPicker(_options?: IosOpenDirPickerOptions): Promise<IosFsUri | null> {
	return invoke('plugin:vnidrop-fs|showOpenDirPicker')
}

/**
 * Opens the iOS save picker by exporting a temporary placeholder file.
 * Cancellation returns `null`.
 */
export async function showSaveFilePicker(
	defaultFileName: string,
	mimeType: string | null = null,
	_options?: IosSaveFilePickerOptions
): Promise<IosFsUri | null> {
	return invoke('plugin:vnidrop-fs|showSaveFilePicker', { defaultFileName, mimeType })
}
