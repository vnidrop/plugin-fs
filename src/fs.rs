use std::{
    io::{Read, Seek, SeekFrom, Write},
    marker::PhantomData,
    path::{Path, PathBuf},
    time::SystemTime,
};

use serde::{Deserialize, Serialize};

#[cfg(target_os = "android")]
use crate::Entry;
use crate::{Error, FileUri, IosFsUri, Result};

const DEFAULT_COPY_BUFFER_LEN: usize = 1024 * 1024;

/// File target accepted by the Rust backend API.
///
/// Use filesystem paths for desktop and app-container files. Use [`FileUri`]
/// for Android SAF/content targets. Use [`IosFsUri`] for external iOS files
/// selected through Vnidrop FS pickers or bookmark helpers.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind", content = "value")]
pub enum VnidropFsTarget {
    /// Local filesystem path.
    Path(PathBuf),

    /// Android file/content URI.
    AndroidUri(FileUri),

    /// iOS file URL with optional security-scoped bookmark metadata.
    IosUri(IosFsUri),
}

/// Directory target accepted by the Rust backend API.
///
/// Directory targets are intentionally separate from file targets. Mobile
/// providers often give different capabilities to directory and file URIs, and
/// keeping them separate prevents callers from accidentally treating a folder as
/// an openable file stream.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind", content = "value")]
pub enum VnidropDirTarget {
    /// Local filesystem directory path.
    Path(PathBuf),

    /// Android directory/content URI.
    AndroidUri(FileUri),

    /// iOS directory URL with optional security-scoped bookmark metadata.
    IosUri(IosFsUri),
}

/// A filesystem entry target returned by Rust-side directory APIs.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind", content = "value")]
pub enum VnidropEntryTarget {
    File(VnidropFsTarget),
    Dir(VnidropDirTarget),
}

/// Portable entry kind used by the Rust backend API.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum VnidropEntryKind {
    File,
    Dir,
}

/// Metadata for a file or directory target.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VnidropEntryInfo {
    pub target: VnidropEntryTarget,
    pub name: String,
    pub kind: VnidropEntryKind,
    pub len: Option<u64>,
    pub mime_type: Option<String>,
    pub last_modified: Option<SystemTime>,
}

/// Directory entry returned by [`VnidropFs::read_dir`] and
/// [`VnidropFs::walk_dir_recursive`].
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VnidropDirEntry {
    pub target: VnidropEntryTarget,
    pub relative_path: PathBuf,
    pub name: String,
    pub kind: VnidropEntryKind,
    pub len: Option<u64>,
    pub mime_type: Option<String>,
    pub last_modified: Option<SystemTime>,
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

impl From<PathBuf> for VnidropDirTarget {
    fn from(value: PathBuf) -> Self {
        Self::Path(value)
    }
}

impl From<&Path> for VnidropDirTarget {
    fn from(value: &Path) -> Self {
        Self::Path(value.to_path_buf())
    }
}

impl From<&PathBuf> for VnidropDirTarget {
    fn from(value: &PathBuf) -> Self {
        Self::Path(value.clone())
    }
}

impl From<FileUri> for VnidropDirTarget {
    fn from(value: FileUri) -> Self {
        Self::AndroidUri(value)
    }
}

impl From<&FileUri> for VnidropDirTarget {
    fn from(value: &FileUri) -> Self {
        Self::AndroidUri(value.clone())
    }
}

impl From<IosFsUri> for VnidropDirTarget {
    fn from(value: IosFsUri) -> Self {
        Self::IosUri(value)
    }
}

impl From<&IosFsUri> for VnidropDirTarget {
    fn from(value: &IosFsUri) -> Self {
        Self::IosUri(value.clone())
    }
}

impl From<VnidropFsTarget> for VnidropEntryTarget {
    fn from(value: VnidropFsTarget) -> Self {
        Self::File(value)
    }
}

impl From<VnidropDirTarget> for VnidropEntryTarget {
    fn from(value: VnidropDirTarget) -> Self {
        Self::Dir(value)
    }
}

impl VnidropEntryTarget {
    pub fn kind(&self) -> VnidropEntryKind {
        match self {
            Self::File(_) => VnidropEntryKind::File,
            Self::Dir(_) => VnidropEntryKind::Dir,
        }
    }

    pub fn file_target(&self) -> Option<&VnidropFsTarget> {
        match self {
            Self::File(target) => Some(target),
            Self::Dir(_) => None,
        }
    }

    pub fn dir_target(&self) -> Option<&VnidropDirTarget> {
        match self {
            Self::File(_) => None,
            Self::Dir(target) => Some(target),
        }
    }
}

/// Controls how the Rust backend API opens a file for writing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
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
    pub fn write(&self, target: impl Into<VnidropFsTarget>, data: impl AsRef<[u8]>) -> Result<()> {
        let mut writer =
            self.open_write(target, VnidropOpenWriteOptions::default().create(true))?;
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
        let mut writer =
            self.open_write(destination, VnidropOpenWriteOptions::default().create(true))?;
        let copied = copy_with_buffer(&mut reader, &mut writer, DEFAULT_COPY_BUFFER_LEN)?;
        writer.flush()?;
        Ok(copied)
    }

    /// Returns metadata for a file or directory target.
    pub fn entry_info(&self, target: impl Into<VnidropEntryTarget>) -> Result<VnidropEntryInfo> {
        match target.into() {
            VnidropEntryTarget::File(target) => self.file_entry_info(target),
            VnidropEntryTarget::Dir(target) => self.dir_entry_info(target),
        }
    }

    /// Lists immediate children of a directory target.
    pub fn read_dir(&self, target: impl Into<VnidropDirTarget>) -> Result<Vec<VnidropDirEntry>> {
        self.read_dir_with_prefix(target.into(), Path::new(""))
    }

    /// Recursively visits all descendants of a directory target.
    ///
    /// This uses a visitor instead of returning a prebuilt recursive vector so
    /// large directory trees can be streamed into application logic without
    /// retaining every entry in memory.
    pub fn walk_dir_recursive<F>(
        &self,
        target: impl Into<VnidropDirTarget>,
        mut visitor: F,
    ) -> Result<()>
    where
        F: FnMut(VnidropDirEntry) -> Result<()>,
    {
        self.walk_dir_recursive_inner(target.into(), PathBuf::new(), &mut visitor)
    }

    /// Creates a directory and any missing parents under a directory target.
    pub fn create_dir_all(
        &self,
        base: impl Into<VnidropDirTarget>,
        relative_path: impl AsRef<Path>,
    ) -> Result<VnidropDirTarget> {
        let relative_path = validate_backend_relative_path(relative_path.as_ref())?;
        match base.into() {
            VnidropDirTarget::Path(path) => {
                let target = path.join(relative_path);
                std::fs::create_dir_all(&target)?;
                Ok(VnidropDirTarget::Path(target))
            }
            VnidropDirTarget::AndroidUri(uri) => self.create_android_dir_all(uri, relative_path),
            VnidropDirTarget::IosUri(uri) => self.create_ios_dir_all(uri, relative_path),
        }
    }

    /// Opens a file under a directory target for writing.
    ///
    /// Parent directories are created before the file is opened. On providers
    /// that sanitize names or avoid collisions, the returned writer points to
    /// the provider-created target.
    pub fn open_write_relative(
        &self,
        base: impl Into<VnidropDirTarget>,
        relative_path: impl AsRef<Path>,
        options: VnidropOpenWriteOptions,
    ) -> Result<VnidropFileWriter<R>> {
        let relative_path = validate_backend_relative_path(relative_path.as_ref())?;
        match base.into() {
            VnidropDirTarget::Path(path) => {
                let target = path.join(relative_path);
                if let Some(parent) = target.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                self.open_path_write(target, options)
            }
            VnidropDirTarget::AndroidUri(uri) => {
                self.open_android_write_relative(uri, relative_path, options)
            }
            VnidropDirTarget::IosUri(uri) => {
                self.open_ios_write_relative(uri, relative_path, options)
            }
        }
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
            return self
                .android
                .open_file_readable(&uri)
                .map(VnidropFileReader::from_std);
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
            let id = self.handle.run_mobile_plugin::<i32>(
                "openReadFileStream",
                IosOpenReadFileStreamArgs {
                    uri: IosStreamTarget::Uri(uri),
                    offset: None,
                },
            )?;
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
            let id = self.handle.run_mobile_plugin::<i32>(
                "openWriteFileStream",
                IosOpenWriteFileStreamArgs {
                    uri: IosStreamTarget::Uri(uri),
                    create: options.create,
                    append: options.append,
                    truncate: options.truncate,
                    offset: options.offset,
                },
            )?;
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

    fn file_entry_info(&self, target: VnidropFsTarget) -> Result<VnidropEntryInfo> {
        match target {
            VnidropFsTarget::Path(path) => self.path_entry_info(path, VnidropEntryKind::File),
            VnidropFsTarget::AndroidUri(uri) => {
                self.android_entry_info(uri, VnidropEntryKind::File)
            }
            VnidropFsTarget::IosUri(uri) => self.ios_entry_info(uri, VnidropEntryKind::File),
        }
    }

    fn dir_entry_info(&self, target: VnidropDirTarget) -> Result<VnidropEntryInfo> {
        match target {
            VnidropDirTarget::Path(path) => self.path_entry_info(path, VnidropEntryKind::Dir),
            VnidropDirTarget::AndroidUri(uri) => {
                self.android_entry_info(uri, VnidropEntryKind::Dir)
            }
            VnidropDirTarget::IosUri(uri) => self.ios_entry_info(uri, VnidropEntryKind::Dir),
        }
    }

    fn path_entry_info(
        &self,
        path: PathBuf,
        expected: VnidropEntryKind,
    ) -> Result<VnidropEntryInfo> {
        let metadata = std::fs::metadata(&path)?;
        let kind = metadata_to_kind(&metadata);
        ensure_expected_kind(kind, expected, &path)?;
        Ok(VnidropEntryInfo {
            target: entry_target_for_path(path.clone(), kind),
            name: path_file_name(&path),
            kind,
            len: metadata.is_file().then_some(metadata.len()),
            mime_type: None,
            last_modified: metadata.modified().ok(),
        })
    }

    fn android_entry_info(
        &self,
        uri: FileUri,
        expected: VnidropEntryKind,
    ) -> Result<VnidropEntryInfo> {
        #[cfg(target_os = "android")]
        {
            let entry = self.android.get_info(&uri)?;
            return entry_to_info_android(entry, Some(expected));
        }

        #[cfg(not(target_os = "android"))]
        {
            if let Some(path) = uri.to_path() {
                return self.path_entry_info(path, expected);
            }
            Err(Error::invalid_uri_scheme(uri.uri))
        }
    }

    fn ios_entry_info(
        &self,
        uri: IosFsUri,
        expected: VnidropEntryKind,
    ) -> Result<VnidropEntryInfo> {
        #[cfg(target_os = "ios")]
        {
            let entry = self.handle.run_mobile_plugin::<IosEntry>(
                "getMetadata",
                IosUriArg {
                    uri: IosFsUriOrString::Uri(uri),
                },
            )?;
            return ios_entry_to_info(entry, Some(expected));
        }

        #[cfg(not(target_os = "ios"))]
        {
            if let Some(path) = ios_file_url_to_path(&uri.uri) {
                return self.path_entry_info(path, expected);
            }
            Err(Error::invalid_uri_scheme(uri.uri))
        }
    }

    fn read_dir_with_prefix(
        &self,
        target: VnidropDirTarget,
        prefix: &Path,
    ) -> Result<Vec<VnidropDirEntry>> {
        match target {
            VnidropDirTarget::Path(path) => self.read_path_dir(path, prefix),
            VnidropDirTarget::AndroidUri(uri) => self.read_android_dir(uri, prefix),
            VnidropDirTarget::IosUri(uri) => self.read_ios_dir(uri, prefix),
        }
    }

    fn walk_dir_recursive_inner<F>(
        &self,
        target: VnidropDirTarget,
        prefix: PathBuf,
        visitor: &mut F,
    ) -> Result<()>
    where
        F: FnMut(VnidropDirEntry) -> Result<()>,
    {
        for entry in self.read_dir_with_prefix(target, &prefix)? {
            let next_dir = match &entry.target {
                VnidropEntryTarget::Dir(dir) => Some((dir.clone(), entry.relative_path.clone())),
                VnidropEntryTarget::File(_) => None,
            };
            visitor(entry)?;
            if let Some((dir, relative_path)) = next_dir {
                self.walk_dir_recursive_inner(dir, relative_path, visitor)?;
            }
        }
        Ok(())
    }

    fn read_path_dir(&self, path: PathBuf, prefix: &Path) -> Result<Vec<VnidropDirEntry>> {
        let mut entries = Vec::new();
        for child in std::fs::read_dir(path)? {
            let child = child?;
            let metadata = child.metadata()?;
            let kind = metadata_to_kind(&metadata);
            let name = child.file_name().to_string_lossy().into_owned();
            let relative_path = prefix.join(&name);
            entries.push(VnidropDirEntry {
                target: entry_target_for_path(child.path(), kind),
                relative_path,
                name,
                kind,
                len: metadata.is_file().then_some(metadata.len()),
                mime_type: None,
                last_modified: metadata.modified().ok(),
            });
        }
        Ok(entries)
    }

    fn read_android_dir(&self, uri: FileUri, prefix: &Path) -> Result<Vec<VnidropDirEntry>> {
        #[cfg(target_os = "android")]
        {
            return self
                .android
                .read_dir(&uri)?
                .into_iter()
                .map(|entry| entry_to_dir_entry_android(entry, prefix))
                .collect();
        }

        #[cfg(not(target_os = "android"))]
        {
            if let Some(path) = uri.to_path() {
                return self.read_path_dir(path, prefix);
            }
            Err(Error::invalid_uri_scheme(uri.uri))
        }
    }

    fn read_ios_dir(&self, uri: IosFsUri, prefix: &Path) -> Result<Vec<VnidropDirEntry>> {
        #[cfg(target_os = "ios")]
        {
            return self
                .handle
                .run_mobile_plugin::<Vec<IosEntry>>(
                    "readDir",
                    IosReadDirArgs {
                        uri,
                        offset: None,
                        limit: None,
                    },
                )?
                .into_iter()
                .map(|entry| ios_entry_to_dir_entry(entry, prefix))
                .collect();
        }

        #[cfg(not(target_os = "ios"))]
        {
            if let Some(path) = ios_file_url_to_path(&uri.uri) {
                return self.read_path_dir(path, prefix);
            }
            Err(Error::invalid_uri_scheme(uri.uri))
        }
    }

    fn create_android_dir_all(
        &self,
        uri: FileUri,
        relative_path: &Path,
    ) -> Result<VnidropDirTarget> {
        #[cfg(target_os = "android")]
        {
            return self
                .android
                .create_dir_all(&uri, relative_path)
                .map(VnidropDirTarget::AndroidUri);
        }

        #[cfg(not(target_os = "android"))]
        {
            if let Some(path) = uri.to_path() {
                let target = path.join(relative_path);
                std::fs::create_dir_all(&target)?;
                return Ok(VnidropDirTarget::Path(target));
            }
            Err(Error::invalid_uri_scheme(uri.uri))
        }
    }

    fn create_ios_dir_all(&self, uri: IosFsUri, relative_path: &Path) -> Result<VnidropDirTarget> {
        #[cfg(target_os = "ios")]
        {
            return self
                .handle
                .run_mobile_plugin::<IosFsUri>(
                    "createDir",
                    IosBaseDirRelativePathArgs {
                        base_dir_uri: uri,
                        relative_path: relative_path_to_string(relative_path),
                    },
                )
                .map(VnidropDirTarget::IosUri)
                .map_err(Into::into);
        }

        #[cfg(not(target_os = "ios"))]
        {
            if let Some(path) = ios_file_url_to_path(&uri.uri) {
                let target = path.join(relative_path);
                std::fs::create_dir_all(&target)?;
                return Ok(VnidropDirTarget::Path(target));
            }
            Err(Error::invalid_uri_scheme(uri.uri))
        }
    }

    fn open_android_write_relative(
        &self,
        uri: FileUri,
        relative_path: &Path,
        options: VnidropOpenWriteOptions,
    ) -> Result<VnidropFileWriter<R>> {
        #[cfg(target_os = "android")]
        {
            let file_uri = match self.android.resolve_file_uri(&uri, relative_path) {
                Ok(existing) => existing,
                Err(err) if options.create => {
                    let _ = err;
                    self.android.create_new_file(&uri, relative_path, None)?
                }
                Err(err) => return Err(err),
            };
            return self.open_android_write(file_uri, options);
        }

        #[cfg(not(target_os = "android"))]
        {
            if let Some(path) = uri.to_path() {
                let target = path.join(relative_path);
                if let Some(parent) = target.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                return self.open_path_write(target, options);
            }
            Err(Error::invalid_uri_scheme(uri.uri))
        }
    }

    fn open_ios_write_relative(
        &self,
        uri: IosFsUri,
        relative_path: &Path,
        options: VnidropOpenWriteOptions,
    ) -> Result<VnidropFileWriter<R>> {
        #[cfg(target_os = "ios")]
        {
            if let Some(parent) = relative_path
                .parent()
                .filter(|path| !path.as_os_str().is_empty())
            {
                let _ = self.create_ios_dir_all(uri.clone(), parent)?;
            }
            let relative_path = relative_path_to_string(relative_path);
            let file_uri = match self.handle.run_mobile_plugin::<IosFsUri>(
                "resolveFile",
                IosBaseDirRelativePathArgs {
                    base_dir_uri: uri.clone(),
                    relative_path: relative_path.clone(),
                },
            ) {
                Ok(existing) => existing,
                Err(err) if options.create => {
                    let _ = err;
                    self.handle.run_mobile_plugin::<IosFsUri>(
                        "createNewFile",
                        IosCreateNewFileArgs {
                            base_dir_uri: uri,
                            relative_path,
                            mime_type: None,
                        },
                    )?
                }
                Err(err) => return Err(err.into()),
            };
            return self.open_ios_write(file_uri, options);
        }

        #[cfg(not(target_os = "ios"))]
        {
            if let Some(path) = ios_file_url_to_path(&uri.uri) {
                let target = path.join(relative_path);
                if let Some(parent) = target.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                return self.open_path_write(target, options);
            }
            Err(Error::invalid_uri_scheme(uri.uri))
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

        let bytes = self.handle.run_mobile_plugin::<Vec<u8>>(
            "readFileStreamChunk",
            IosReadChunkArgs {
                id: self.id,
                length: buf.len(),
            },
        )?;
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
            IosWriteChunkArgs { id: self.id, data },
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
    Path(String),
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
#[serde(untagged)]
enum IosFsUriOrString {
    Uri(IosFsUri),
    Path(String),
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

#[cfg(target_os = "ios")]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IosUriArg {
    uri: IosFsUriOrString,
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IosReadDirArgs {
    uri: IosFsUri,
    offset: Option<usize>,
    limit: Option<usize>,
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IosBaseDirRelativePathArgs {
    base_dir_uri: IosFsUri,
    relative_path: String,
}

#[cfg(target_os = "ios")]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IosCreateNewFileArgs {
    base_dir_uri: IosFsUri,
    relative_path: String,
    mime_type: Option<String>,
}

#[cfg(target_os = "ios")]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type")]
enum IosEntry {
    File {
        uri: IosFsUri,
        name: String,
        last_modified: f64,
        byte_length: u64,
        mime_type: String,
    },
    Dir {
        uri: IosFsUri,
        name: String,
        last_modified: f64,
    },
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

fn validate_backend_relative_path(path: &Path) -> Result<&Path> {
    if path.as_os_str().is_empty() {
        return Err(Error::with("relative path must not be empty"));
    }

    for component in path.components() {
        use std::path::Component::*;

        match component {
            Prefix(_) | RootDir => return Err(Error::with("relative path must not be absolute")),
            ParentDir => return Err(Error::with("relative path must not contain '..'")),
            CurDir => return Err(Error::with("relative path must not contain '.'")),
            Normal(part) => {
                let part = part.to_string_lossy();
                if part.contains('\\') || part.chars().any(char::is_control) {
                    return Err(Error::with("relative path contains unsupported characters"));
                }
            }
        }
    }

    Ok(path)
}

fn metadata_to_kind(metadata: &std::fs::Metadata) -> VnidropEntryKind {
    if metadata.is_dir() {
        VnidropEntryKind::Dir
    } else {
        VnidropEntryKind::File
    }
}

fn ensure_expected_kind(
    actual: VnidropEntryKind,
    expected: VnidropEntryKind,
    target: impl std::fmt::Debug,
) -> Result<()> {
    if actual == expected {
        Ok(())
    } else {
        Err(Error::with(format!(
            "expected {expected:?}, found {actual:?}: {target:?}"
        )))
    }
}

fn entry_target_for_path(path: PathBuf, kind: VnidropEntryKind) -> VnidropEntryTarget {
    match kind {
        VnidropEntryKind::File => VnidropEntryTarget::File(VnidropFsTarget::Path(path)),
        VnidropEntryKind::Dir => VnidropEntryTarget::Dir(VnidropDirTarget::Path(path)),
    }
}

fn path_file_name(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string_lossy().into_owned())
}

#[cfg(target_os = "ios")]
fn relative_path_to_string(path: &Path) -> String {
    path.components()
        .map(|component| component.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/")
}

#[cfg(any(target_os = "android", target_os = "ios"))]
fn entry_name_relative(prefix: &Path, name: &str) -> PathBuf {
    prefix.join(name)
}

#[cfg(target_os = "android")]
fn entry_to_info_android(
    entry: Entry,
    expected: Option<VnidropEntryKind>,
) -> Result<VnidropEntryInfo> {
    match entry {
        Entry::File {
            uri,
            name,
            last_modified,
            len,
            mime_type,
        } => {
            if let Some(expected) = expected {
                ensure_expected_kind(VnidropEntryKind::File, expected, &uri)?;
            }
            Ok(VnidropEntryInfo {
                target: VnidropEntryTarget::File(VnidropFsTarget::AndroidUri(uri)),
                name,
                kind: VnidropEntryKind::File,
                len: Some(len),
                mime_type: Some(mime_type),
                last_modified: Some(last_modified),
            })
        }
        Entry::Dir {
            uri,
            name,
            last_modified,
        } => {
            if let Some(expected) = expected {
                ensure_expected_kind(VnidropEntryKind::Dir, expected, &uri)?;
            }
            Ok(VnidropEntryInfo {
                target: VnidropEntryTarget::Dir(VnidropDirTarget::AndroidUri(uri)),
                name,
                kind: VnidropEntryKind::Dir,
                len: None,
                mime_type: None,
                last_modified: Some(last_modified),
            })
        }
    }
}

#[cfg(target_os = "android")]
fn entry_to_dir_entry_android(entry: Entry, prefix: &Path) -> Result<VnidropDirEntry> {
    let info = entry_to_info_android(entry, None)?;
    Ok(VnidropDirEntry {
        relative_path: entry_name_relative(prefix, &info.name),
        target: info.target,
        name: info.name,
        kind: info.kind,
        len: info.len,
        mime_type: info.mime_type,
        last_modified: info.last_modified,
    })
}

#[cfg(target_os = "ios")]
fn ios_entry_to_info(
    entry: IosEntry,
    expected: Option<VnidropEntryKind>,
) -> Result<VnidropEntryInfo> {
    match entry {
        IosEntry::File {
            uri,
            name,
            last_modified,
            byte_length,
            mime_type,
        } => {
            if let Some(expected) = expected {
                ensure_expected_kind(VnidropEntryKind::File, expected, &uri)?;
            }
            Ok(VnidropEntryInfo {
                target: VnidropEntryTarget::File(VnidropFsTarget::IosUri(uri)),
                name,
                kind: VnidropEntryKind::File,
                len: Some(byte_length),
                mime_type: Some(mime_type),
                last_modified: Some(ios_millis_to_system_time(last_modified)),
            })
        }
        IosEntry::Dir {
            uri,
            name,
            last_modified,
        } => {
            if let Some(expected) = expected {
                ensure_expected_kind(VnidropEntryKind::Dir, expected, &uri)?;
            }
            Ok(VnidropEntryInfo {
                target: VnidropEntryTarget::Dir(VnidropDirTarget::IosUri(uri)),
                name,
                kind: VnidropEntryKind::Dir,
                len: None,
                mime_type: None,
                last_modified: Some(ios_millis_to_system_time(last_modified)),
            })
        }
    }
}

#[cfg(target_os = "ios")]
fn ios_entry_to_dir_entry(entry: IosEntry, prefix: &Path) -> Result<VnidropDirEntry> {
    let info = ios_entry_to_info(entry, None)?;
    Ok(VnidropDirEntry {
        relative_path: entry_name_relative(prefix, &info.name),
        target: info.target,
        name: info.name,
        kind: info.kind,
        len: info.len,
        mime_type: info.mime_type,
        last_modified: info.last_modified,
    })
}

#[cfg(target_os = "ios")]
fn ios_millis_to_system_time(value: f64) -> SystemTime {
    let millis = value.max(0.0) as u64;
    SystemTime::UNIX_EPOCH + std::time::Duration::from_millis(millis)
}

#[cfg(not(target_os = "ios"))]
fn ios_file_url_to_path(uri: &str) -> Option<PathBuf> {
    uri.strip_prefix("file://")
        .map(percent_encoding::percent_decode_str)
        .and_then(|decoded| decoded.decode_utf8().ok())
        .map(|decoded| PathBuf::from(decoded.as_ref()))
}
