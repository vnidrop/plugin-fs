<script>
  import { invoke } from '@tauri-apps/api/core'
  import {
    getPlatformFsCapabilities,
    showOpenFilePicker,
    showSaveFilePicker,
  } from '@vnidrop/tauri-plugin-fs'

  const capabilities = getPlatformFsCapabilities()

  let source = null
  let destination = null
  let text = 'Hello from Rust-side Vnidrop FS.'
  let preview = ''
  let logs = []

  function label(value) {
    if (value == null) return 'None'
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  }

  function log(action, value) {
    logs = [
      {
        time: new Date().toLocaleTimeString(),
        action,
        value: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
      ...logs,
    ].slice(0, 40)
  }

  async function run(action, task) {
    try {
      const value = await task()
      log(action, value ?? 'ok')
      return value
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log(`${action} failed`, message)
      throw error
    }
  }

  function requireSource() {
    if (!source) throw new Error('Pick a source file first.')
    return source
  }

  function requireDestination() {
    if (!destination) throw new Error('Choose a destination first.')
    return destination
  }

  async function pickSource() {
    await run('pick source', async () => {
      const files = await showOpenFilePicker({
        multiple: false,
        mimeTypes: ['text/plain', 'application/json', 'application/octet-stream', 'image/*', 'video/*'],
      })
      source = files[0] ?? source
      return source
    })
  }

  async function pickDestination() {
    await run('choose destination', async () => {
      destination = await showSaveFilePicker('vnidrop-rust-copy.bin', 'application/octet-stream')
      return destination
    })
  }

  async function readPreview() {
    await run('rust read preview', async () => {
      const result = await invoke('rust_read_preview', { target: requireSource() })
      preview = result.text
      return result
    })
  }

  async function writeText() {
    await run('rust write text', async () => {
      return invoke('rust_write_text', {
        target: requireDestination(),
        text,
      })
    })
  }

  async function copyStreaming() {
    await run('rust streaming copy', async () => {
      return invoke('rust_copy_streaming', {
        source: requireSource(),
        destination: requireDestination(),
      })
    })
  }
</script>

<main>
  <header>
    <div>
      <h1>Vnidrop FS Rust-Side Example</h1>
      <p>Pick files in the frontend, then stream and write them from Rust with <code>app.vnidrop_fs()</code>.</p>
    </div>
    <section class="platform">
      <span>Platform</span>
      <strong>{capabilities.platform}</strong>
    </section>
  </header>

  <section class="grid">
    <article>
      <h2>Targets</h2>
      <dl>
        <dt>Source</dt>
        <dd>{label(source)}</dd>
        <dt>Destination</dt>
        <dd>{label(destination)}</dd>
      </dl>
      <div class="buttons">
        <button on:click={pickSource}>Pick Source</button>
        <button on:click={pickDestination}>Choose Destination</button>
      </div>
    </article>

    <article>
      <h2>Rust Commands</h2>
      <label>
        Text written by Rust
        <textarea bind:value={text}></textarea>
      </label>
      <div class="buttons">
        <button on:click={readPreview} disabled={!source}>Read Preview</button>
        <button on:click={writeText} disabled={!destination}>Write Text</button>
        <button on:click={copyStreaming} disabled={!source || !destination}>Stream Copy</button>
      </div>
    </article>
  </section>

  <section class="grid lower">
    <article>
      <h2>Preview</h2>
      <pre>{preview || 'No preview loaded.'}</pre>
    </article>

    <article class="log">
      <h2>Log</h2>
      {#each logs as item}
        <div class="log-item">
          <strong>{item.time} · {item.action}</strong>
          <pre>{item.value}</pre>
        </div>
      {/each}
      {#if logs.length === 0}
        <p>No actions yet.</p>
      {/if}
    </article>
  </section>
</main>
