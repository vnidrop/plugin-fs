use std::{
    io::{Read, Seek, SeekFrom, Write},
    marker::PhantomData,
    path::{Path, PathBuf},
};

#[cfg(target_os = "ios")]
use serde::Serialize;

use crate::{Error, FileUri, IosFsUri, Result};

const DEFAULT_COPY_BUFFER_LEN: usize = 1024 * 1024;

/// File target accepted by the Rust backend API.
///
/// Use filesystem paths for desktop and app-container files. Use [`FileUri`]
/// for Android SAF/content targets. Use [`IosFsUri`] for external iOS files
/// selected through Vnidrop FS pickers or bookmark helpers.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VnidropFsTarget {
    /// Local filesystem path.
    Path(PathBuf),

    /// Android file/content URI.
    AndroidUri(FileUri),

    /// iOS file URL with optional security-scoped bookmark metadata.
    IosUri(IosFsUri),
}

impl From<PathBuf> for VnidropFsTarget {
    fn from(value: PathBuf) -> Self {
        Self::Path(value)
    }
}

impl From<&Path> for VnidropFsTarget {
    fn from(value: &Path) -> Self {
        Self::Path(value.to_path_buf())
    }
}

impl From<&PathBuf> for VnidropFsTarget {
    fn from(value: &PathBuf) -> Self {
        Self::Path(value.clone())
    }
}

impl From<FileUri> for VnidropFsTarget {
    fn from(value: FileUri) -> Self {
        Self::AndroidUri(value)
    }
}

impl From<&FileUri> for VnidropFsTarget {
    fn from(value: &FileUri) -> Self {
        Self::AndroidUri(value.clone())
    }
}

impl From<IosFsUri> for VnidropFsTarget {
    fn from(value: IosFsUri) -> Self {
        Self::IosUri(value)
    }
}

impl From<&IosFsUri> for VnidropFsTarget {
    fn from(value: &IosFsUri) -> Self {
        Self::IosUri(value.clone())
    }
}

/// Controls how the Rust backend API opens a file for writing.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct VnidropOpenWriteOptions {
    /// Creates the file when it does not already exist.
    pub create: bool,

    /// Moves the write cursor to the end before writing.
    pub append: bool,

    /// Clears existing contents before writing.
    pub truncate: bool,

    /// Moves the write cursor to this byte position after open/truncate/append handling.
    pub offset: Option<u64>,
}

impl Default for VnidropOpenWriteOptions {
    fn default() -> Self {
        Self {
            create: false,
            append: false,
            truncate: true,
            offset: None,
        }
    }
}

impl VnidropOpenWriteOptions {
    /// Opens missing files instead of failing.
    pub fn create(mut self, create: bool) -> Self {
        self.create = create;
        self
    }

    /// Preserves existing contents and writes from the end of the file.
    pub fn append(mut self, append: bool) -> Self {
        self.append = append;
        if append {
            self.truncate = false;
        }
        self
    }

    /// Replaces existing contents before writing.
    pub fn truncate(mut self, truncate: bool) -> Self {
        self.truncate = truncate;
        if truncate {
            self.append = false;
        }
        self
    }

    /// Starts writing at a byte offset.
    pub fn offset(mut self, offset: u64) -> Self {
        self.offset = Some(offset);
        self
    }
}

/// Rust-side filesystem manager exposed through [`VnidropFsExt`].
///
/// The methods return standard Rust `Read` and `Write` handles so backend code
/// can stream large files without involving frontend IPC or loading entire
/// files into memory.
pub struct VnidropFs<R: tauri::Runtime> {
    #[cfg(target_os = "android")]
    android: crate::api::api_sync::AndroidFs<R>,

    #[cfg(target_os = "ios")]
    handle: tauri::plugin::PluginHandle<R>,

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    _runtime: PhantomData<fn() -> R>,
}

impl<R: tauri::Runtime> VnidropFs<R> {
    #[cfg(target_os = "android")]
    pub(crate) fn android(handle: tauri::plugin::PluginHandle<R>) -> Self {
        Self {
            android: crate::api::api_sync::AndroidFs { handle },
        }
    }

    #[cfg(target_os = "ios")]
    pub(crate) fn ios(handle: tauri::plugin::PluginHandle<R>) -> Self {
        Self { handle }
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    pub(crate) fn desktop() -> Self {
        Self {
            _runtime: PhantomData,
        }
    }

    /// Opens a target for chunked reading.
    pub fn open_read(&self, target: impl Into<VnidropFsTarget>) -> Result<VnidropFileReader<R>> {
        match target.into() {
            VnidropFsTarget::Path(path) => self.open_path_read(path),
            VnidropFsTarget::AndroidUri(uri) => self.open_android_read(uri),
            VnidropFsTarget::IosUri(uri) => self.open_ios_read(uri),
        }
    }

    /// Opens a target for chunked writing.
    pub fn open_write(
        &self,
        target: impl Into<VnidropFsTarget>,
        options: VnidropOpenWriteOptions,
    ) -> Result<VnidropFileWriter<R>> {
        match target.into() {
            VnidropFsTarget::Path(path) => self.open_path_write(path, options),
            VnidropFsTarget::AndroidUri(uri) => self.open_android_write(uri, options),
            VnidropFsTarget::IosUri(uri) => self.open_ios_write(uri, options),
        }
    }

    /// Reads the full target into memory.
    ///
    /// Prefer [`VnidropFs::open_read`] for large files.
    pub fn read(&self, target: impl Into<VnidropFsTarget>) -> Result<Vec<u8>> {
        let mut reader = self.open_read(target)?;
        let mut bytes = Vec::new();
        reader.read_to_end(&mut bytes)?;
        Ok(bytes)
    }

    /// Replaces a target with the provided bytes.
    ///
    /// Prefer [`VnidropFs::open_write`] for large files.
    pub fn write(
        &self,
        target: impl Into<VnidropFsTarget>,
        data: impl AsRef<[u8]>,
    ) -> Result<()> {
        let mut writer = self.open_write(target, VnidropOpenWriteOptions::default().create(true))?;
        writer.write_all(data.as_ref())?;
        writer.flush()?;
        Ok(())
    }

    /// Streams bytes from one target to another with a fixed-size buffer.
    pub fn copy_streaming(
        &self,
        source: impl Into<VnidropFsTarget>,
        destination: impl Into<VnidropFsTarget>,
    ) -> Result<u64> {
        let mut reader = self.open_read(source)?;
        let mut writer = self.open_write(
            destination,
            VnidropOpenWriteOptions::default().create(true),
        )?;
        let copied = copy_with_buffer(&mut reader, &mut writer, DEFAULT_COPY_BUFFER_LEN)?;
        writer.flush()?;
        Ok(copied)
    }

    fn open_path_read(&self, path: PathBuf) -> Result<VnidropFileReader<R>> {
        let file = std::fs::File::open(path)?;
        Ok(VnidropFileReader::from_std(file))
    }

    fn open_path_write(
        &self,
        path: PathBuf,
        options: VnidropOpenWriteOptions,
    ) -> Result<VnidropFileWriter<R>> {
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create(options.create)
            .append(options.append)
            .truncate(options.truncate && !options.append)
            .open(path)?;
        if let Some(offset) = options.offset {
            file.seek(SeekFrom::Start(offset))?;
        }
        Ok(VnidropFileWriter::from_std(file))
    }

    fn open_android_read(&self, uri: FileUri) -> Result<VnidropFileReader<R>> {
        #[cfg(target_os = "android")]
        {
            return self.android.open_file_readable(&uri).map(VnidropFileReader::from_std);
        }

        #[cfg(not(target_os = "android"))]
        {
            if let Some(path) = uri.to_path() {
                self.open_path_read(path)
            } else {
                Err(Error::invalid_uri_scheme(uri.uri))
            }
        }
    }

    fn open_android_write(
        &self,
        uri: FileUri,
        options: VnidropOpenWriteOptions,
    ) -> Result<VnidropFileWriter<R>> {
        #[cfg(target_os = "android")]
        {
            let mode = if options.append {
                crate::FileAccessMode::WriteAppend
            } else if options.truncate {
                crate::FileAccessMode::WriteTruncate
            } else {
                #[allow(deprecated)]
                crate::FileAccessMode::Write
            };
            let mut file = self.android.open_file(&uri, mode)?;
            if let Some(offset) = options.offset {
                file.seek(SeekFrom::Start(offset))?;
            }
            return Ok(VnidropFileWriter::from_std(file));
        }

        #[cfg(not(target_os = "android"))]
        {
            if let Some(path) = uri.to_path() {
                self.open_path_write(path, options)
            } else {
                Err(Error::invalid_uri_scheme(uri.uri))
            }
        }
    }

    fn open_ios_read(&self, uri: IosFsUri) -> Result<VnidropFileReader<R>> {
        #[cfg(target_os = "ios")]
        {
            let id = self
                .handle
                .run_mobile_plugin::<i32>("openReadFileStream", IosOpenReadFileStreamArgs {
                    uri: IosStreamTarget::Uri(uri),
                    offset: None,
                })?;
            return Ok(VnidropFileReader::from_ios(self.handle.clone(), id));
        }

        #[cfg(not(target_os = "ios"))]
        {
            if let Some(path) = ios_file_url_to_path(&uri.uri) {
                self.open_path_read(path)
            } else {
                Err(Error::invalid_uri_scheme(uri.uri))
            }
        }
    }

    fn open_ios_write(
        &self,
        uri: IosFsUri,
        options: VnidropOpenWriteOptions,
    ) -> Result<VnidropFileWriter<R>> {
        #[cfg(target_os = "ios")]
        {
            let id = self
                .handle
                .run_mobile_plugin::<i32>("openWriteFileStream", IosOpenWriteFileStreamArgs {
                    uri: IosStreamTarget::Uri(uri),
                    create: options.create,
                    append: options.append,
                    truncate: options.truncate,
                    offset: options.offset,
                })?;
            return Ok(VnidropFileWriter::from_ios(self.handle.clone(), id));
        }

        #[cfg(not(target_os = "ios"))]
        {
            if let Some(path) = ios_file_url_to_path(&uri.uri) {
                self.open_path_write(path, options)
            } else {
                Err(Error::invalid_uri_scheme(uri.uri))
            }
        }
    }
}

/// Reader returned by [`VnidropFs::open_read`].
pub struct VnidropFileReader<R: tauri::Runtime> {
    inner: VnidropFileReaderInner<R>,
}

enum VnidropFileReaderInner<R: tauri::Runtime> {
    Std(std::fs::File, PhantomData<fn() -> R>),

    #[cfg(target_os = "ios")]
    Ios(IosReadStream<R>),
}

impl<R: tauri::Runtime> VnidropFileReader<R> {
    fn from_std(file: std::fs::File) -> Self {
        Self {
            inner: VnidropFileReaderInner::Std(file, PhantomData),
        }
    }

    #[cfg(target_os = "ios")]
    fn from_ios(handle: tauri::plugin::PluginHandle<R>, id: i32) -> Self {
        Self {
            inner: VnidropFileReaderInner::Ios(IosReadStream::new(handle, id)),
        }
    }

    /// Closes the native resource before the value is dropped.
    pub fn close(&mut self) -> Result<()> {
        match &mut self.inner {
            VnidropFileReaderInner::Std(_, _) => Ok(()),

            #[cfg(target_os = "ios")]
            VnidropFileReaderInner::Ios(stream) => stream.close(),
        }
    }
}

impl<R: tauri::Runtime> Read for VnidropFileReader<R> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        match &mut self.inner {
            VnidropFileReaderInner::Std(file, _) => file.read(buf),

            #[cfg(target_os = "ios")]
            VnidropFileReaderInner::Ios(stream) => stream.read(buf).map_err(Into::into),
        }
    }
}

/// Writer returned by [`VnidropFs::open_write`].
pub struct VnidropFileWriter<R: tauri::Runtime> {
    inner: VnidropFileWriterInner<R>,
}

enum VnidropFileWriterInner<R: tauri::Runtime> {
    Std(std::fs::File, PhantomData<fn() -> R>),

    #[cfg(target_os = "ios")]
    Ios(IosWriteStream<R>),
}

impl<R: tauri::Runtime> VnidropFileWriter<R> {
    fn from_std(file: std::fs::File) -> Self {
        Self {
            inner: VnidropFileWriterInner::Std(file, PhantomData),
        }
    }

    #[cfg(target_os = "ios")]
    fn from_ios(handle: tauri::plugin::PluginHandle<R>, id: i32) -> Self {
        Self {
            inner: VnidropFileWriterInner::Ios(IosWriteStream::new(handle, id)),
        }
    }

    /// Flushes and closes the native resource before the value is dropped.
    pub fn close(&mut self) -> Result<()> {
        match &mut self.inner {
            VnidropFileWriterInner::Std(file, _) => {
                file.flush()?;
                Ok(())
            }

            #[cfg(target_os = "ios")]
            VnidropFileWriterInner::Ios(stream) => stream.close(),
        }
    }
}

impl<R: tauri::Runtime> Write for VnidropFileWriter<R> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        match &mut self.inner {
            VnidropFileWriterInner::Std(file, _) => file.write(buf),

            #[cfg(target_os = "ios")]
            VnidropFileWriterInner::Ios(stream) => {
                stream.write_all(buf).map_err(std::io::Error::from)?;
                Ok(buf.len())
            }
        }
    }

    fn flush(&mut self) -> std::io::Result<()> {
        match &mut self.inner {
            VnidropFileWriterInner::Std(file, _) => file.flush(),

            #[cfg(target_os = "ios")]
            VnidropFileWriterInner::Ios(stream) => stream.flush().map_err(Into::into),
        }
    }
}

#[cfg(target_os = "ios")]
struct IosReadStream<R: tauri::Runtime> {
    handle: tauri::plugin::PluginHandle<R>,
    id: i32,
    closed: bool,
}

#[cfg(target_os = "ios")]
impl<R: tauri::Runtime> IosReadStream<R> {
    fn new(handle: tauri::plugin::PluginHandle<R>, id: i32) -> Self {
        Self {
            handle,
            id,
            closed: false,
        }
    }

    fn read(&self, buf: &mut [u8]) -> Result<usize> {
        if buf.is_empty() {
            return Ok(0);
        }

        let bytes = self
            .handle
            .run_mobile_plugin::<Vec<u8>>("readFileStreamChunk", IosReadChunkArgs {
                id: self.id,
                length: buf.len(),
            })?;
        let len = bytes.len();
        buf[..len].copy_from_slice(&bytes);
        Ok(len)
    }

    fn close(&mut self) -> Result<()> {
        if self.closed {
            return Ok(());
        }
        self.closed = true;
        self.handle
            .run_mobile_plugin::<()>("closeFileStream", IosStreamIdArgs { id: self.id })?;
        Ok(())
    }
}

#[cfg(target_os = "ios")]
impl<R: tauri::Runtime> Drop for IosReadStream<R> {
    fn drop(&mut self) {
        let _ = self.close();
    }
}

#[cfg(target_os = "ios")]
struct IosWriteStream<R: tauri::Runtime> {
    handle: tauri::plugin::PluginHandle<R>,
    id: i32,
    closed: bool,
}

#[cfg(target_os = "ios")]
impl<R: tauri::Runtime> IosWriteStream<R> {
    fn new(handle: tauri::plugin::PluginHandle<R>, id: i32) -> Self {
        Self {
            handle,
            id,
            closed: false,
        }
    }

    fn write_all(&self, data: &[u8]) -> Result<()> {
        self.handle.run_mobile_plugin::<()>(
            "writeFileStreamChunk",
            IosWriteChunkArgs {
                id: self.id,
                data,
            },
        )?;
        Ok(())
    }

    fn flush(&self) -> Result<()> {
        self.handle
            .run_mobile_plugin::<()>("flushFileStream", IosStreamIdArgs { id: self.id })?;
        Ok(())
    }

    fn close(&mut self) -> Result<()> {
        if self.closed {
            return Ok(());
        }
        self.closed = true;
        self.handle
            .run_mobile_plugin::<()>("closeFileStream", IosStreamIdArgs { id: self.id })?;
        Ok(())
    }
}

#[cfg(target_os = "ios")]
impl<R: tauri::Runtime> Drop for IosWriteStream<R> {
    fn drop(&mut self) {
        let _ = self.close();
    }
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
#[serde(untagged)]
enum IosStreamTarget {
    Uri(IosFsUri),
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IosOpenReadFileStreamArgs {
    uri: IosStreamTarget,
    offset: Option<u64>,
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IosOpenWriteFileStreamArgs {
    uri: IosStreamTarget,
    create: bool,
    append: bool,
    truncate: bool,
    offset: Option<u64>,
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
struct IosStreamIdArgs {
    id: i32,
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
struct IosReadChunkArgs {
    id: i32,
    length: usize,
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
struct IosWriteChunkArgs<'a> {
    id: i32,
    data: &'a [u8],
}

fn copy_with_buffer<R: Read, W: Write>(
    reader: &mut R,
    writer: &mut W,
    buffer_len: usize,
) -> std::io::Result<u64> {
    let mut buffer = vec![0; buffer_len];
    let mut copied = 0;

    loop {
        let read = reader.read(&mut buffer)?;
        if read == 0 {
            return Ok(copied);
        }
        writer.write_all(&buffer[..read])?;
        copied += read as u64;
    }
}

#[cfg(not(target_os = "ios"))]
fn ios_file_url_to_path(uri: &str) -> Option<PathBuf> {
    uri.strip_prefix("file://")
        .map(percent_encoding::percent_decode_str)
        .and_then(|decoded| decoded.decode_utf8().ok())
        .map(|decoded| PathBuf::from(decoded.as_ref()))
}
