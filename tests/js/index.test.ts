import { beforeEach, describe, expect, it, vi } from 'vitest'

const tauriFsMock = vi.hoisted(() => ({
	readFile: vi.fn(),
	readTextFile: vi.fn(),
	writeFile: vi.fn(),
	writeTextFile: vi.fn(),
	readDir: vi.fn(),
	mkdir: vi.fn(),
	create: vi.fn(),
	open: vi.fn(),
	remove: vi.fn(),
	rename: vi.fn(),
	exists: vi.fn(),
	stat: vi.fn(),
	SeekMode: { Start: 0, Current: 1, End: 2 },
}))

const tauriDialogMock = vi.hoisted(() => ({
	open: vi.fn(),
	save: vi.fn(),
}))

const androidMock = vi.hoisted(() => ({
	isAndroid: vi.fn(() => false),
	readFile: vi.fn(),
	readTextFile: vi.fn(),
	writeFile: vi.fn(),
	writeTextFile: vi.fn(),
	openReadFileStream: vi.fn(),
	openWriteFileStream: vi.fn(),
	closeAllFileStreams: vi.fn(),
	countAllFileStreams: vi.fn(),
	readDir: vi.fn(),
	createDir: vi.fn(),
	showOpenFilePicker: vi.fn(),
	showOpenDirPicker: vi.fn(),
	showSaveFilePicker: vi.fn(),
	createNewFile: vi.fn(),
	createNewDir: vi.fn(),
	copyFile: vi.fn(),
	renameFile: vi.fn(),
	renameDir: vi.fn(),
	removeFile: vi.fn(),
	removeEmptyDir: vi.fn(),
	removeDirAll: vi.fn(),
	getType: vi.fn(),
	getMetadata: vi.fn(),
}))

const iosMock = vi.hoisted(() => ({
	isIos: vi.fn(() => false),
	readFile: vi.fn(),
	readTextFile: vi.fn(),
	writeFile: vi.fn(),
	writeTextFile: vi.fn(),
	openReadFileStream: vi.fn(),
	openWriteFileStream: vi.fn(),
	closeAllFileStreams: vi.fn(),
	countAllFileStreams: vi.fn(),
	readDir: vi.fn(),
	createDir: vi.fn(),
	showOpenFilePicker: vi.fn(),
	showOpenDirPicker: vi.fn(),
	showSaveFilePicker: vi.fn(),
	createNewFile: vi.fn(),
	createNewDir: vi.fn(),
	copyFile: vi.fn(),
	renameFile: vi.fn(),
	renameDir: vi.fn(),
	removeFile: vi.fn(),
	removeEmptyDir: vi.fn(),
	removeDirAll: vi.fn(),
	exists: vi.fn(),
	getMetadata: vi.fn(),
	listSecurityScopedBookmarks: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-fs', () => tauriFsMock)
vi.mock('@tauri-apps/plugin-dialog', () => tauriDialogMock)
vi.mock('../../guest-js/android', async importOriginal => ({
	...await importOriginal<typeof import('../../guest-js/android')>(),
	...androidMock,
}))
vi.mock('../../guest-js/ios', async importOriginal => ({
	...await importOriginal<typeof import('../../guest-js/ios')>(),
	...iosMock,
}))

describe('root package exports', () => {
	it('keeps Android-only runtime functions out of the portable root entrypoint', async () => {
		const root = await import('../../guest-js/index')

		expect(root).not.toHaveProperty('persistPickerUriPermission')
		expect(root).not.toHaveProperty('createNewPublicFile')
		expect(root).not.toHaveProperty('convertThumbnailSrc')
		expect(root).not.toHaveProperty('listSecurityScopedBookmarks')
	})

	it('exposes Android-only functions from the android subpath entrypoint', async () => {
		const android = await import('../../guest-js/android')

		expect(android).toHaveProperty('persistPickerUriPermission')
		expect(android).toHaveProperty('createNewPublicFile')
		expect(android).toHaveProperty('convertThumbnailSrc')
	})

	it('exposes iOS-only functions from the ios subpath entrypoint', async () => {
		const ios = await import('../../guest-js/ios')

		expect(ios).toHaveProperty('listSecurityScopedBookmarks')
		expect(ios).toHaveProperty('resolveSecurityScopedBookmark')
		expect(ios).toHaveProperty('releaseSecurityScopedBookmark')
		expect(ios).toHaveProperty('persistSecurityScopedBookmark')
	})
})

describe('platform capability helpers', () => {
	beforeEach(() => {
		androidMock.isAndroid.mockReturnValue(false)
		iosMock.isIos.mockReturnValue(false)
	})

	it('reports desktop capabilities when Android is unavailable', async () => {
		const fs = await import('../../guest-js/index')

		expect(fs.isDesktop()).toBe(true)
		expect(fs.getPlatformFsCapabilities()).toEqual({
			platform: 'desktop',
			usesOfficialFs: true,
			supportsAndroidUris: false,
			supportsPublicStorage: false,
			supportsPersistedPickerPermissions: false,
			supportsThumbnails: false,
			supportsSecurityScopedBookmarks: false,
			supportsFileStreams: true,
		})
	})

	it('reports Android capabilities when the runtime is Android', async () => {
		androidMock.isAndroid.mockReturnValue(true)
		const fs = await import('../../guest-js/index')

		expect(fs.isDesktop()).toBe(false)
		expect(fs.getPlatformFsCapabilities()).toEqual({
			platform: 'android',
			usesOfficialFs: false,
			supportsAndroidUris: true,
			supportsPublicStorage: true,
			supportsPersistedPickerPermissions: true,
			supportsThumbnails: true,
			supportsSecurityScopedBookmarks: false,
			supportsFileStreams: true,
		})
	})

	it('reports iOS capabilities when the runtime is iOS', async () => {
		iosMock.isIos.mockReturnValue(true)
		const fs = await import('../../guest-js/index')

		expect(fs.isDesktop()).toBe(false)
		expect(fs.getPlatformFsCapabilities()).toEqual({
			platform: 'ios',
			usesOfficialFs: false,
			supportsAndroidUris: false,
			supportsPublicStorage: false,
			supportsPersistedPickerPermissions: false,
			supportsThumbnails: false,
			supportsSecurityScopedBookmarks: true,
			supportsFileStreams: true,
		})
	})
})

describe('desktop routing', () => {
	beforeEach(() => {
		androidMock.isAndroid.mockReturnValue(false)
		iosMock.isIos.mockReturnValue(false)
		tauriFsMock.readFile.mockResolvedValue(new Uint8Array([1, 2, 3]))
		tauriFsMock.readTextFile.mockResolvedValue('hello')
		tauriFsMock.writeFile.mockResolvedValue(undefined)
		tauriFsMock.writeTextFile.mockResolvedValue(undefined)
		tauriFsMock.readDir.mockResolvedValue([])
		tauriFsMock.mkdir.mockResolvedValue(undefined)
		tauriFsMock.remove.mockResolvedValue(undefined)
		tauriFsMock.rename.mockResolvedValue(undefined)
		tauriFsMock.stat.mockResolvedValue({ isFile: true })
		tauriFsMock.exists.mockResolvedValue(false)
		tauriFsMock.create.mockResolvedValue({ close: vi.fn().mockResolvedValue(undefined) })
		tauriFsMock.open.mockResolvedValue({
			read: vi.fn()
				.mockResolvedValueOnce(2)
				.mockResolvedValueOnce(null),
			write: vi.fn().mockResolvedValue(2),
			seek: vi.fn().mockResolvedValue(3),
			close: vi.fn().mockResolvedValue(undefined),
		})
		tauriDialogMock.open.mockResolvedValue(null)
		tauriDialogMock.save.mockResolvedValue(null)
	})

	it('delegates file operations to @tauri-apps/plugin-fs', async () => {
		const fs = await import('../../guest-js/index')
		const data = new Uint8Array([7, 8])

		await fs.readFile('/tmp/a.txt', { baseDir: 1 } as never)
		await fs.readTextFile('/tmp/a.txt', { baseDir: 1 } as never)
		await fs.writeFile('/tmp/a.txt', data, { baseDir: 1 } as never)
		await fs.writeTextFile('/tmp/a.txt', 'body', { baseDir: 1 } as never)
		await fs.readDir('/tmp', { baseDir: 1 } as never)
		await fs.createDir('/tmp/new', { recursive: true } as never)
		await fs.renameFile('/tmp/a.txt', '/tmp/b.txt', { oldPathBaseDir: 1 } as never)
		await fs.removeFile('/tmp/b.txt')
		await fs.removeDirAll('/tmp/dir', { baseDir: 1 } as never)
		await fs.exists('/tmp/a.txt', { baseDir: 1 } as never)
		await fs.getMetadata('/tmp/a.txt', { baseDir: 1 } as never)

		expect(tauriFsMock.readFile).toHaveBeenCalledWith('/tmp/a.txt', { baseDir: 1 })
		expect(tauriFsMock.readTextFile).toHaveBeenCalledWith('/tmp/a.txt', { baseDir: 1 })
		expect(tauriFsMock.writeFile).toHaveBeenCalledWith('/tmp/a.txt', data, { baseDir: 1 })
		expect(tauriFsMock.writeTextFile).toHaveBeenCalledWith('/tmp/a.txt', 'body', { baseDir: 1 })
		expect(tauriFsMock.readDir).toHaveBeenCalledWith('/tmp', { baseDir: 1 })
		expect(tauriFsMock.mkdir).toHaveBeenCalledWith('/tmp/new', { recursive: true })
		expect(tauriFsMock.rename).toHaveBeenCalledWith('/tmp/a.txt', '/tmp/b.txt', { oldPathBaseDir: 1 })
		expect(tauriFsMock.remove).toHaveBeenCalledWith('/tmp/b.txt')
		expect(tauriFsMock.remove).toHaveBeenCalledWith('/tmp/dir', { baseDir: 1, recursive: true })
		expect(tauriFsMock.exists).toHaveBeenCalledWith('/tmp/a.txt', { baseDir: 1 })
		expect(tauriFsMock.stat).toHaveBeenCalledWith('/tmp/a.txt', { baseDir: 1 })
	})

	it('maps Android-style picker mimeTypes to desktop dialog filters', async () => {
		const fs = await import('../../guest-js/index')
		tauriDialogMock.open.mockResolvedValue('/tmp/picked.txt')

		await expect(fs.showOpenFilePicker({ mimeTypes: ['text/plain', 'image/png'] })).resolves.toEqual(['/tmp/picked.txt'])

		expect(tauriDialogMock.open).toHaveBeenCalledWith({
			mimeTypes: ['text/plain', 'image/png'],
			directory: false,
			filters: [{ name: 'Files', extensions: ['text/plain', 'image/png'] }],
		})
	})

	it('uses directory mode for desktop directory picker', async () => {
		const fs = await import('../../guest-js/index')
		tauriDialogMock.open.mockResolvedValue(['/tmp/dir'])

		await expect(fs.showOpenDirPicker({ multiple: true } as never)).resolves.toBe('/tmp/dir')

		expect(tauriDialogMock.open).toHaveBeenCalledWith({
			multiple: false,
			directory: true,
		})
	})

	it('creates unique desktop file and directory paths when entries already exist', async () => {
		const fs = await import('../../guest-js/index')
		tauriFsMock.exists
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(false)

		await expect(fs.createNewFile('/tmp/report.txt')).resolves.toBe('/tmp/report (1).txt')
		await expect(fs.createNewDir('/tmp/photos')).resolves.toBe('/tmp/photos (1)')

		expect(tauriFsMock.create).toHaveBeenCalledWith('/tmp/report (1).txt', undefined)
		expect(tauriFsMock.mkdir).toHaveBeenCalledWith('/tmp/photos (1)', undefined)
	})

	it('opens desktop read and write streams with official file handles', async () => {
		const fs = await import('../../guest-js/index')

		const readStream = await fs.openReadFileStream('/tmp/read.bin', { bufferByteLength: 2, offset: 3, baseDir: 1 } as never)
		const read = readStream.getReader()
		await expect(read.read()).resolves.toEqual({ done: false, value: new Uint8Array([0, 0]) })
		await expect(read.read()).resolves.toEqual({ done: true, value: undefined })

		const writeStream = await fs.openWriteFileStream('/tmp/write.bin', { create: true, offset: 3, baseDir: 1 } as never)
		const writer = writeStream.getWriter()
		await writer.write(new Uint8Array([1, 2]))
		await writer.close()

		expect(tauriFsMock.open).toHaveBeenCalledWith('/tmp/read.bin', { baseDir: 1, read: true })
		expect(tauriFsMock.open).toHaveBeenCalledWith('/tmp/write.bin', {
			baseDir: 1,
			create: true,
			append: false,
			truncate: false,
			write: true,
		})
		await expect(fs.countAllFileStreams()).resolves.toBe(0)
	})
})

describe('Android routing', () => {
	beforeEach(() => {
		androidMock.isAndroid.mockReturnValue(true)
		iosMock.isIos.mockReturnValue(false)
		androidMock.readFile.mockResolvedValue(new Uint8Array([9]))
		androidMock.readTextFile.mockResolvedValue('android')
		androidMock.writeFile.mockResolvedValue(undefined)
		androidMock.writeTextFile.mockResolvedValue(undefined)
		androidMock.openReadFileStream.mockResolvedValue(new ReadableStream())
		androidMock.openWriteFileStream.mockResolvedValue(new WritableStream())
		androidMock.closeAllFileStreams.mockResolvedValue(undefined)
		androidMock.countAllFileStreams.mockResolvedValue(2)
		androidMock.readDir.mockResolvedValue([])
		androidMock.createDir.mockResolvedValue({ uri: 'content://dir/new', documentTopTreeUri: null })
		androidMock.showOpenFilePicker.mockResolvedValue([{ uri: 'content://file', documentTopTreeUri: null }])
		androidMock.showOpenDirPicker.mockResolvedValue({ uri: 'content://dir', documentTopTreeUri: null })
		androidMock.showSaveFilePicker.mockResolvedValue({ uri: 'content://save', documentTopTreeUri: null })
		androidMock.createNewFile.mockResolvedValue({ uri: 'content://dir/file', documentTopTreeUri: null })
		androidMock.createNewDir.mockResolvedValue({ uri: 'content://dir/sub', documentTopTreeUri: null })
		androidMock.removeDirAll.mockResolvedValue(undefined)
		androidMock.getType.mockResolvedValue({ type: 'File', mimeType: 'text/plain' })
	})

	it('delegates portable calls to the Android submodule', async () => {
		const fs = await import('../../guest-js/index')
		const base = { uri: 'content://tree/root', documentTopTreeUri: 'content://tree/root' }

		await fs.readFile(base)
		await fs.readTextFile(base, { encoding: 'utf-8' })
		await fs.writeFile(base, new Uint8Array([1]))
		await fs.writeTextFile(base, 'body')
		await fs.openReadFileStream(base, { bufferByteLength: 1 })
		await fs.openWriteFileStream(base, { create: true })
		await fs.closeAllFileStreams()
		await expect(fs.countAllFileStreams()).resolves.toBe(2)
		await fs.readDir(base, { limit: 10 })
		await fs.createDir(base, 'nested')
		await fs.showOpenFilePicker({ mimeTypes: 'text/plain' })
		await fs.showOpenDirPicker()
		await fs.showSaveFilePicker('note.txt', 'text/plain')
		await fs.createNewFile(base, 'note.txt', 'text/plain')
		await fs.createNewDir(base, 'nested')
		await fs.removeDirAll(base)
		await expect(fs.exists(base.uri)).resolves.toBe(true)

		expect(androidMock.readFile).toHaveBeenCalledWith(base)
		expect(androidMock.readTextFile).toHaveBeenCalledWith(base, { encoding: 'utf-8' })
		expect(androidMock.writeFile).toHaveBeenCalledWith(base, new Uint8Array([1]), undefined)
		expect(androidMock.writeTextFile).toHaveBeenCalledWith(base, 'body', undefined)
		expect(androidMock.openReadFileStream).toHaveBeenCalledWith(base, { bufferByteLength: 1 })
		expect(androidMock.openWriteFileStream).toHaveBeenCalledWith(base, { create: true })
		expect(androidMock.closeAllFileStreams).toHaveBeenCalled()
		expect(androidMock.countAllFileStreams).toHaveBeenCalled()
		expect(androidMock.readDir).toHaveBeenCalledWith(base, { limit: 10 })
		expect(androidMock.createDir).toHaveBeenCalledWith(base, 'nested')
		expect(androidMock.showOpenFilePicker).toHaveBeenCalledWith({ mimeTypes: 'text/plain' })
		expect(androidMock.showOpenDirPicker).toHaveBeenCalledWith(undefined)
		expect(androidMock.showSaveFilePicker).toHaveBeenCalledWith('note.txt', 'text/plain', undefined)
		expect(androidMock.createNewFile).toHaveBeenCalledWith(base, 'note.txt', 'text/plain')
		expect(androidMock.createNewDir).toHaveBeenCalledWith(base, 'nested')
		expect(androidMock.removeDirAll).toHaveBeenCalledWith(base)
		expect(androidMock.getType).toHaveBeenCalledWith(base.uri)
	})

	it('rejects Android directory operations that require a URI object', async () => {
		const fs = await import('../../guest-js/index')

		await expect(fs.readDir('content://tree/root')).rejects.toThrow('readDir on Android requires an AndroidFsUri')
		await expect(fs.createNewDir('content://tree/root' as never, 'nested')).rejects.toThrow('createNewDir on Android requires an AndroidFsUri')
	})
})

describe('iOS routing', () => {
	beforeEach(() => {
		androidMock.isAndroid.mockReturnValue(false)
		iosMock.isIos.mockReturnValue(true)
		iosMock.readFile.mockResolvedValue(new Uint8Array([4]))
		iosMock.readTextFile.mockResolvedValue('ios')
		iosMock.writeFile.mockResolvedValue(undefined)
		iosMock.writeTextFile.mockResolvedValue(undefined)
		iosMock.openReadFileStream.mockResolvedValue(new ReadableStream())
		iosMock.openWriteFileStream.mockResolvedValue(new WritableStream())
		iosMock.closeAllFileStreams.mockResolvedValue(undefined)
		iosMock.countAllFileStreams.mockResolvedValue(1)
		iosMock.readDir.mockResolvedValue([])
		iosMock.createDir.mockResolvedValue({ uri: 'file:///dir/new', bookmarkId: 'dir-new', isDirectory: true })
		iosMock.showOpenFilePicker.mockResolvedValue([{ uri: 'file:///file.txt', bookmarkId: 'file' }])
		iosMock.showOpenDirPicker.mockResolvedValue({ uri: 'file:///dir', bookmarkId: 'dir', isDirectory: true })
		iosMock.showSaveFilePicker.mockResolvedValue({ uri: 'file:///save.txt', bookmarkId: 'save' })
		iosMock.createNewFile.mockResolvedValue({ uri: 'file:///dir/file.txt', bookmarkId: 'file' })
		iosMock.createNewDir.mockResolvedValue({ uri: 'file:///dir/sub', bookmarkId: 'sub', isDirectory: true })
		iosMock.removeDirAll.mockResolvedValue(undefined)
		iosMock.exists.mockResolvedValue(true)
	})

	it('delegates portable calls to the iOS submodule', async () => {
		const fs = await import('../../guest-js/index')
		const base = { uri: 'file:///dir', bookmarkId: 'dir', isDirectory: true }

		await fs.readFile(base)
		await fs.readTextFile(base, { encoding: 'utf-8' })
		await fs.writeFile(base, new Uint8Array([1]))
		await fs.writeTextFile(base, 'body')
		await fs.openReadFileStream(base, { bufferByteLength: 1 })
		await fs.openWriteFileStream(base, { create: true })
		await fs.closeAllFileStreams()
		await expect(fs.countAllFileStreams()).resolves.toBe(1)
		await fs.readDir(base, { limit: 10 })
		await fs.createDir(base, 'nested')
		await fs.showOpenFilePicker({ mimeTypes: 'text/plain' })
		await fs.showOpenDirPicker()
		await fs.showSaveFilePicker('note.txt', 'text/plain')
		await fs.createNewFile(base, 'note.txt', 'text/plain')
		await fs.createNewDir(base, 'nested')
		await fs.removeDirAll(base)
		await expect(fs.exists(base)).resolves.toBe(true)

		expect(iosMock.readFile).toHaveBeenCalledWith(base)
		expect(iosMock.readTextFile).toHaveBeenCalledWith(base, { encoding: 'utf-8' })
		expect(iosMock.writeFile).toHaveBeenCalledWith(base, new Uint8Array([1]), undefined)
		expect(iosMock.writeTextFile).toHaveBeenCalledWith(base, 'body', undefined)
		expect(iosMock.openReadFileStream).toHaveBeenCalledWith(base, { bufferByteLength: 1 })
		expect(iosMock.openWriteFileStream).toHaveBeenCalledWith(base, { create: true })
		expect(iosMock.closeAllFileStreams).toHaveBeenCalled()
		expect(iosMock.countAllFileStreams).toHaveBeenCalled()
		expect(iosMock.readDir).toHaveBeenCalledWith(base, { limit: 10 })
		expect(iosMock.createDir).toHaveBeenCalledWith(base, 'nested')
		expect(iosMock.showOpenFilePicker).toHaveBeenCalledWith({ mimeTypes: 'text/plain' })
		expect(iosMock.showOpenDirPicker).toHaveBeenCalledWith(undefined)
		expect(iosMock.showSaveFilePicker).toHaveBeenCalledWith('note.txt', 'text/plain', undefined)
		expect(iosMock.createNewFile).toHaveBeenCalledWith(base, 'note.txt', 'text/plain')
		expect(iosMock.createNewDir).toHaveBeenCalledWith(base, 'nested')
		expect(iosMock.removeDirAll).toHaveBeenCalledWith(base)
		expect(iosMock.exists).toHaveBeenCalledWith(base)
	})

	it('rejects iOS directory operations that require an IosFsUri object', async () => {
		const fs = await import('../../guest-js/index')

		await expect(fs.readDir('file:///dir')).rejects.toThrow('readDir on iOS requires an IosFsUri')
		await expect(fs.createNewDir('file:///dir' as never, 'nested')).rejects.toThrow('createNewDir on iOS requires an IosFsUri')
	})
})
