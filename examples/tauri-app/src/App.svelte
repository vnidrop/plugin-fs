<script>
  import {
    copyFile,
    createDir,
    createNewDir,
    createNewFile,
    exists,
    getMetadata,
    getPlatformFsCapabilities,
    isAndroid,
    isDesktop,
    isIos,
    readDir,
    readTextFile,
    removeDirAll,
    removeEmptyDir,
    removeFile,
    renameDir,
    renameFile,
    showOpenDirPicker,
    showOpenFilePicker,
    showSaveFilePicker,
    writeTextFile,
  } from '@vnidrop/tauri-plugin-fs'
  import {
    AndroidPublicGeneralPurposeDir,
    checkPickerUriPermission,
    checkPublicFilesPermission,
    closeAllFileStreams,
    countAllFileStreams,
    createNewPublicFile,
    getAndroidApiLevel,
    getThumbnailAsDataURL,
    listVolumes,
    persistPickerUriPermission,
    releasePersistedPickerUriPermission,
    requestPublicFilesPermission,
    scanPublicFile,
    showShareFileDialog,
    showViewFileDialog,
  } from '@vnidrop/tauri-plugin-fs/android'
  import {
    listSecurityScopedBookmarks,
    persistSecurityScopedBookmark,
    releaseSecurityScopedBookmark,
    resolveSecurityScopedBookmark,
  } from '@vnidrop/tauri-plugin-fs/ios'

  function detectCapabilities() {
    try {
      return getPlatformFsCapabilities()
    }
    catch {
      return {
        platform: 'browser-preview',
        usesOfficialFs: false,
        supportsAndroidUris: false,
        supportsPublicStorage: false,
        supportsPersistedPickerPermissions: false,
        supportsThumbnails: false,
        supportsSecurityScopedBookmarks: false,
      }
    }
  }

  function safePlatformCheck(check) {
    try {
      return check()
    }
    catch {
      return false
    }
  }

  let capabilities = detectCapabilities()
  let platform = capabilities.platform
  let selectedFile = null
  let selectedDir = null
  let saveTarget = null
  let copyTarget = null
  let fileName = 'vnidrop-example.txt'
  let dirName = 'vnidrop-example-folder'
  let renameTo = 'vnidrop-renamed.txt'
  let textBody = 'Hello from Vnidrop FS example.'
  let fileText = ''
  let entries = []
  let metadata = null
  let androidResult = ''
  let iosResult = ''
  let thumbnailSrc = ''
  let logs = []

  function asLabel(value) {
    if (value == null) return 'None'
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  }

  function log(label, value) {
    logs = [
      {
        time: new Date().toLocaleTimeString(),
        label,
        value: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
      ...logs,
    ].slice(0, 80)
  }

  async function run(label, task) {
    try {
      const value = await task()
      log(label, value ?? 'ok')
      return value
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log(`${label} failed`, message)
      throw error
    }
  }

  function requireFile() {
    if (!selectedFile) throw new Error('Pick or create a file first.')
    return selectedFile
  }

  function requireDir() {
    if (!selectedDir) throw new Error('Pick a directory first.')
    return selectedDir
  }

  function siblingPath(path, newName) {
    const raw = path instanceof URL ? path.toString() : path
    const index = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'))
    return index >= 0 ? `${raw.slice(0, index + 1)}${newName}` : newName
  }

  function childPath(dir, name) {
    const raw = dir instanceof URL ? dir.toString() : dir
    const separator = raw.endsWith('/') || raw.endsWith('\\') ? '' : '/'
    return `${raw}${separator}${name}`
  }

  async function pickFile() {
    await run('open file picker', async () => {
      const files = await showOpenFilePicker({ multiple: false, mimeTypes: ['text/plain', 'application/json', 'image/*'] })
      selectedFile = files[0] ?? selectedFile
      return files
    })
  }

  async function pickDir() {
    await run('open directory picker', async () => {
      selectedDir = await showOpenDirPicker()
      return selectedDir
    })
  }

  async function pickSaveFile() {
    await run('save file picker', async () => {
      saveTarget = await showSaveFilePicker(fileName, 'text/plain')
      selectedFile = saveTarget ?? selectedFile
      return saveTarget
    })
  }

  async function createExampleFile() {
    await run('create unique file', async () => {
      const target = isDesktop() ? childPath(requireDir(), fileName) : await createNewFile(requireDir(), fileName, 'text/plain')
      selectedFile = isDesktop() ? await createNewFile(target) : target
      return selectedFile
    })
  }

  async function createExampleDir() {
    await run('create unique directory', async () => {
      const target = isDesktop() ? childPath(requireDir(), dirName) : await createNewDir(requireDir(), dirName)
      const created = isDesktop() ? await createNewDir(target) : target
      selectedDir = created
      return created
    })
  }

  async function createNestedDir() {
    await run('create directory', async () => {
      if (isDesktop()) {
        const target = childPath(requireDir(), dirName)
        await createDir(target, { recursive: true })
        selectedDir = target
        return target
      }
      selectedDir = await createDir(requireDir(), dirName)
      return selectedDir
    })
  }

  async function writeSelectedFile() {
    await run('write text file', async () => {
      await writeTextFile(requireFile(), textBody)
      return requireFile()
    })
  }

  async function readSelectedFile() {
    await run('read text file', async () => {
      fileText = await readTextFile(requireFile())
      return fileText
    })
  }

  async function readSelectedDir() {
    await run('read directory', async () => {
      entries = await readDir(requireDir())
      return entries
    })
  }

  async function statSelectedTarget() {
    await run('metadata and exists', async () => {
      const target = selectedFile ?? selectedDir
      if (!target) throw new Error('Pick a file or directory first.')
      metadata = {
        exists: await exists(target),
        metadata: await getMetadata(target),
      }
      return metadata
    })
  }

  async function renameSelectedFile() {
    await run('rename file', async () => {
      const file = requireFile()
      const renamed = await renameFile(file, isDesktop() && typeof file === 'string' ? siblingPath(file, renameTo) : renameTo)
      selectedFile = renamed ?? (typeof file === 'string' ? siblingPath(file, renameTo) : file)
      return selectedFile
    })
  }

  async function renameSelectedDir() {
    await run('rename directory', async () => {
      const dir = requireDir()
      const renamed = await renameDir(dir, isDesktop() && typeof dir === 'string' ? siblingPath(dir, dirName) : dirName)
      selectedDir = renamed ?? (typeof dir === 'string' ? siblingPath(dir, dirName) : dir)
      return selectedDir
    })
  }

  async function copySelectedFile() {
    await run('copy file', async () => {
      const file = requireFile()
      const destination = copyTarget || (isDesktop() && typeof file === 'string' ? siblingPath(file, `copy-${fileName}`) : saveTarget)
      if (!destination) throw new Error('Choose a save target or enter a desktop copy target.')
      await copyFile(file, destination)
      return destination
    })
  }

  async function removeSelectedFile() {
    await run('remove file', async () => {
      await removeFile(requireFile())
      const removed = selectedFile
      selectedFile = null
      return removed
    })
  }

  async function removeSelectedDir(emptyOnly) {
    await run(emptyOnly ? 'remove empty directory' : 'remove directory recursively', async () => {
      const dir = requireDir()
      if (emptyOnly) {
        await removeEmptyDir(dir)
      }
      else {
        await removeDirAll(dir)
      }
      selectedDir = null
      return dir
    })
  }

  async function refreshAndroidInfo() {
    await run('android info', async () => {
      androidResult = JSON.stringify({
        apiLevel: await getAndroidApiLevel(),
        publicFilesPermission: await checkPublicFilesPermission(),
        volumes: await listVolumes(),
        streams: await countAllFileStreams(),
      }, null, 2)
      return JSON.parse(androidResult)
    })
  }

  async function requestAndroidPublicPermission() {
    await run('request Android public files permission', async () => {
      const granted = await requestPublicFilesPermission()
      await refreshAndroidInfo()
      return granted
    })
  }

  async function createAndroidPublicDocument() {
    await run('create Android public document', async () => {
      const uri = await createNewPublicFile(AndroidPublicGeneralPurposeDir.Documents, `Vnidrop/${fileName}`, 'text/plain')
      selectedFile = uri
      await writeTextFile(uri, textBody)
      await scanPublicFile(uri)
      return uri
    })
  }

  async function persistAndroidPermission() {
    await run('persist Android picker permission', async () => {
      await persistPickerUriPermission(requireFile())
      return await checkPickerUriPermission(requireFile())
    })
  }

  async function releaseAndroidPermission() {
    await run('release Android picker permission', async () => {
      return await releasePersistedPickerUriPermission(requireFile())
    })
  }

  async function loadAndroidThumbnail() {
    await run('load Android thumbnail', async () => {
      thumbnailSrc = await getThumbnailAsDataURL(requireFile(), { width: 256, height: 256, format: 'jpeg' }) ?? ''
      return thumbnailSrc ? 'thumbnail loaded' : 'no thumbnail'
    })
  }

  async function refreshIosBookmarks() {
    await run('iOS bookmarks', async () => {
      iosResult = JSON.stringify(await listSecurityScopedBookmarks(), null, 2)
      return JSON.parse(iosResult)
    })
  }

  async function persistIosBookmark() {
    await run('persist iOS bookmark', async () => {
      const target = selectedFile ?? selectedDir
      if (!target) throw new Error('Pick a file or directory first.')
      const uri = await persistSecurityScopedBookmark(target)
      await refreshIosBookmarks()
      return uri
    })
  }

  async function resolveFirstIosBookmark() {
    await run('resolve first iOS bookmark', async () => {
      const bookmarks = await listSecurityScopedBookmarks()
      const first = bookmarks[0]
      if (!first?.bookmarkId) throw new Error('No bookmark to resolve.')
      return await resolveSecurityScopedBookmark(first.bookmarkId)
    })
  }

  async function releaseFirstIosBookmark() {
    await run('release first iOS bookmark', async () => {
      const bookmarks = await listSecurityScopedBookmarks()
      const first = bookmarks[0]
      if (!first?.bookmarkId) throw new Error('No bookmark to release.')
      const released = await releaseSecurityScopedBookmark(first.bookmarkId)
      await refreshIosBookmarks()
      return released
    })
  }
</script>

<main>
  <header>
    <div>
      <h1>Vnidrop FS Example</h1>
      <p>Manual smoke test console for the shared API and platform-specific filesystem features.</p>
    </div>
    <div class="platform">
      <strong>{platform}</strong>
      <span>desktop: {safePlatformCheck(isDesktop) ? 'yes' : 'no'}</span>
      <span>android: {safePlatformCheck(isAndroid) ? 'yes' : 'no'}</span>
      <span>ios: {safePlatformCheck(isIos) ? 'yes' : 'no'}</span>
    </div>
  </header>

  <section class="grid">
    <article>
      <h2>Selected Targets</h2>
      <dl>
        <dt>File</dt>
        <dd>{asLabel(selectedFile)}</dd>
        <dt>Directory</dt>
        <dd>{asLabel(selectedDir)}</dd>
        <dt>Save target</dt>
        <dd>{asLabel(saveTarget)}</dd>
      </dl>
      <div class="buttons">
        <button onclick={pickFile}>Pick File</button>
        <button onclick={pickDir}>Pick Directory</button>
        <button onclick={pickSaveFile}>Pick Save Target</button>
      </div>
    </article>

    <article>
      <h2>Shared Operations</h2>
      <label>
        File name
        <input bind:value={fileName} />
      </label>
      <label>
        Directory name
        <input bind:value={dirName} />
      </label>
      <label>
        Rename to
        <input bind:value={renameTo} />
      </label>
      <label>
        Text body
        <textarea bind:value={textBody}></textarea>
      </label>
      <label>
        Desktop copy target or mobile save URI from picker
        <input bind:value={copyTarget} placeholder="Optional path for desktop copy" />
      </label>
      <div class="buttons">
        <button onclick={createExampleFile}>Create Unique File</button>
        <button onclick={createExampleDir}>Create Unique Dir</button>
        <button onclick={createNestedDir}>Create Dir</button>
        <button onclick={writeSelectedFile}>Write Text</button>
        <button onclick={readSelectedFile}>Read Text</button>
        <button onclick={readSelectedDir}>Read Dir</button>
        <button onclick={statSelectedTarget}>Metadata</button>
        <button onclick={copySelectedFile}>Copy File</button>
        <button onclick={renameSelectedFile}>Rename File</button>
        <button onclick={renameSelectedDir}>Rename Dir</button>
        <button class="danger" onclick={removeSelectedFile}>Remove File</button>
        <button class="danger" onclick={() => removeSelectedDir(true)}>Remove Empty Dir</button>
        <button class="danger" onclick={() => removeSelectedDir(false)}>Remove Dir All</button>
      </div>
    </article>

    <article>
      <h2>Results</h2>
      <h3>File Text</h3>
      <pre>{fileText || 'No file read yet.'}</pre>
      <h3>Directory Entries</h3>
      <pre>{entries.length ? JSON.stringify(entries, null, 2) : 'No directory listing yet.'}</pre>
      <h3>Metadata</h3>
      <pre>{metadata ? JSON.stringify(metadata, null, 2) : 'No metadata yet.'}</pre>
    </article>

    <article class:disabled={!capabilities.supportsPublicStorage}>
      <h2>Android Only</h2>
      <p>Public storage, picker URI permissions, thumbnails, stream resources, share/view intents.</p>
      <div class="buttons">
        <button disabled={!safePlatformCheck(isAndroid)} onclick={refreshAndroidInfo}>Refresh Android Info</button>
        <button disabled={!safePlatformCheck(isAndroid)} onclick={requestAndroidPublicPermission}>Request Public Permission</button>
        <button disabled={!safePlatformCheck(isAndroid)} onclick={createAndroidPublicDocument}>Create Public Document</button>
        <button disabled={!safePlatformCheck(isAndroid)} onclick={persistAndroidPermission}>Persist Picker Permission</button>
        <button disabled={!safePlatformCheck(isAndroid)} onclick={releaseAndroidPermission}>Release Picker Permission</button>
        <button disabled={!safePlatformCheck(isAndroid)} onclick={loadAndroidThumbnail}>Load Thumbnail</button>
        <button disabled={!safePlatformCheck(isAndroid)} onclick={() => showShareFileDialog(requireFile())}>Share File</button>
        <button disabled={!safePlatformCheck(isAndroid)} onclick={() => showViewFileDialog(requireFile())}>View File</button>
        <button disabled={!safePlatformCheck(isAndroid)} onclick={() => run('close Android streams', closeAllFileStreams)}>Close Streams</button>
      </div>
      {#if thumbnailSrc}
        <img class="thumbnail" src={thumbnailSrc} alt="Android thumbnail preview" />
      {/if}
      <pre>{androidResult || 'Run Refresh Android Info on an Android build.'}</pre>
    </article>

    <article class:disabled={!capabilities.supportsSecurityScopedBookmarks}>
      <h2>iOS Only</h2>
      <p>Security-scoped bookmark lifecycle for files and directories returned by iOS pickers.</p>
      <div class="buttons">
        <button disabled={!safePlatformCheck(isIos)} onclick={refreshIosBookmarks}>List Bookmarks</button>
        <button disabled={!safePlatformCheck(isIos)} onclick={persistIosBookmark}>Persist Selected</button>
        <button disabled={!safePlatformCheck(isIos)} onclick={resolveFirstIosBookmark}>Resolve First</button>
        <button disabled={!safePlatformCheck(isIos)} onclick={releaseFirstIosBookmark}>Release First</button>
      </div>
      <pre>{iosResult || 'Run List Bookmarks on an iOS build.'}</pre>
    </article>

    <article>
      <h2>Capabilities</h2>
      <pre>{JSON.stringify(capabilities, null, 2)}</pre>
    </article>
  </section>

  <section class="log">
    <h2>Operation Log</h2>
    {#if logs.length === 0}
      <p>No operations yet.</p>
    {:else}
      {#each logs as item}
        <div class="log-row">
          <span>{item.time}</span>
          <strong>{item.label}</strong>
          <pre>{item.value}</pre>
        </div>
      {/each}
    {/if}
  </section>
</main>
