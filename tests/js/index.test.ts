import { beforeEach, describe, expect, it, vi } from 'vitest'

const tauriFsMock = vi.hoisted(() => ({
	readFile: vi.fn(),
	readTextFile: vi.fn(),
	writeFile: vi.fn(),
	writeTextFile: vi.fn(),
	readDir: vi.fn(),
	mkdir: vi.fn(),
	create: vi.fn(),
	remove: vi.fn(),
	rename: vi.fn(),
	exists: vi.fn(),
	stat: vi.fn(),
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

vi.mock('@tauri-apps/plugin-fs', () => tauriFsMock)
vi.mock('@tauri-apps/plugin-dialog', () => tauriDialogMock)
vi.mock('../../guest-js/android', async importOriginal => ({
	...await importOriginal<typeof import('../../guest-js/android')>(),
	...androidMock,
}))

describe('root package exports', () => {
	it('keeps Android-only runtime functions out of the portable root entrypoint', async () => {
		const root = await import('../../guest-js/index')

		expect(root).not.toHaveProperty('persistPickerUriPermission')
		expect(root).not.toHaveProperty('createNewPublicFile')
		expect(root).not.toHaveProperty('convertThumbnailSrc')
	})

	it('exposes Android-only functions from the android subpath entrypoint', async () => {
		const android = await import('../../guest-js/android')

		expect(android).toHaveProperty('persistPickerUriPermission')
		expect(android).toHaveProperty('createNewPublicFile')
		expect(android).toHaveProperty('convertThumbnailSrc')
	})
})

describe('platform capability helpers', () => {
	beforeEach(() => {
		androidMock.isAndroid.mockReturnValue(false)
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
		})
	})
})

describe('desktop routing', () => {
	beforeEach(() => {
		androidMock.isAndroid.mockReturnValue(false)
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
})

describe('Android routing', () => {
	beforeEach(() => {
		androidMock.isAndroid.mockReturnValue(true)
		androidMock.readFile.mockResolvedValue(new Uint8Array([9]))
		androidMock.readTextFile.mockResolvedValue('android')
		androidMock.writeFile.mockResolvedValue(undefined)
		androidMock.writeTextFile.mockResolvedValue(undefined)
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
