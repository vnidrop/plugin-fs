import Foundation
import Tauri
#if canImport(UIKit)
import UIKit
#endif
import VnidropFsCore

#if canImport(UIKit)

private final class UriArg: Decodable {
  let uri: IosFsUriOrString
}

private enum IosFsUriOrString: Decodable {
  case uri(IosFsUri)
  case string(String)

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if let uri = try? container.decode(IosFsUri.self) {
      self = .uri(uri)
      return
    }
    self = .string(try container.decode(String.self))
  }
}

private final class ReadTextFileArgs: Decodable {
  let uri: IosFsUriOrString
  let encoding: String?
}

private final class WriteFileArgs: Decodable {
  let uri: IosFsUriOrString
  let data: [UInt8]
  let create: Bool
}

private final class WriteTextFileArgs: Decodable {
  let uri: IosFsUriOrString
  let data: String
  let encoding: String?
  let create: Bool
}

private final class ReadDirArgs: Decodable {
  let uri: IosFsUri
  let offset: Int?
  let limit: Int?
}

private final class BaseDirRelativePathArgs: Decodable {
  let baseDirUri: IosFsUri
  let relativePath: String
}

private final class CreateNewFileArgs: Decodable {
  let baseDirUri: IosFsUri
  let relativePath: String
  let mimeType: String?
}

private final class CopyFileArgs: Decodable {
  let srcPath: IosFsUriOrString
  let destPath: IosFsUriOrString
}

private final class RenameArgs: Decodable {
  let uri: IosFsUri
  let newName: String
}

private final class OpenFilePickerArgs: Decodable {
  let multiple: Bool
  let mimeTypes: [String]
}

private final class SaveFilePickerArgs: Decodable {
  let defaultFileName: String
  let mimeType: String?
}

private final class OpenReadFileStreamArgs: Decodable {
  let uri: IosFsUriOrString
  let offset: UInt64?
}

private final class OpenWriteFileStreamArgs: Decodable {
  let uri: IosFsUriOrString
  let create: Bool
  let append: Bool
  let truncate: Bool
  let offset: UInt64?
}

private final class FileStreamIdArgs: Decodable {
  let id: Int
}

private final class ReadFileStreamChunkArgs: Decodable {
  let id: Int
  let length: Int
}

private final class WriteFileStreamChunkArgs: Decodable {
  let id: Int
  let data: [UInt8]
}

private final class BookmarkIdArgs: Decodable {
  let bookmarkId: String
}

private final class DocumentPickerDelegate: NSObject, UIDocumentPickerDelegate {
  private let onResolve: ([URL]?) -> Void
  private let onReject: (String) -> Void

  init(onResolve: @escaping ([URL]?) -> Void, onReject: @escaping (String) -> Void) {
    self.onResolve = onResolve
    self.onReject = onReject
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    onResolve(nil)
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    onResolve(urls)
  }
}

final class VnidropFsPlugin: Plugin {
  private let store = SecurityScopedBookmarkStore(defaults: .standard)
  private var retainedDelegates: [DocumentPickerDelegate] = []
  private let streamLock = NSLock()
  private var nextStreamId = 1
  private var readStreams: [Int: IosReadFileStream] = [:]
  private var writeStreams: [Int: IosWriteFileStream] = [:]

  @objc public func listSecurityScopedBookmarks(_ invoke: Invoke) throws {
    let values = store.bookmarkIds().compactMap { id -> IosFsUri? in
      guard let resolved = try? resolveBookmark(id: id) else { return nil }
      return resolved.uri
    }
    invoke.resolve(values)
  }

  @objc public func resolveSecurityScopedBookmark(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BookmarkIdArgs.self)
    let resolved = try resolveBookmark(id: args.bookmarkId)
    invoke.resolve(resolved.uri)
  }

  @objc public func releaseSecurityScopedBookmark(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BookmarkIdArgs.self)
    invoke.resolve(store.remove(id: args.bookmarkId))
  }

  @objc public func persistSecurityScopedBookmark(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(UriArg.self)
    let resolved = try resolve(args.uri)
    invoke.resolve(persist(url: resolved.url))
  }

  @objc public func readFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(UriArg.self)
    run(invoke) {
      let resolved = try self.resolve(args.uri)
      return try self.withAccess(resolved.url) {
        Array(try Data(contentsOf: resolved.url))
      }
    }
  }

  @objc public func openReadFileStream(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(OpenReadFileStreamArgs.self)
    run(invoke) {
      let resolved = try self.resolve(args.uri)
      let accessed = resolved.url.startAccessingSecurityScopedResource()
      do {
        let handle = try FileHandle(forReadingFrom: resolved.url)
        if let offset = args.offset {
          try handle.seek(toOffset: offset)
        }
        return self.insertReadStream(IosReadFileStream(url: resolved.url, handle: handle, accessed: accessed))
      } catch {
        if accessed {
          resolved.url.stopAccessingSecurityScopedResource()
        }
        throw error
      }
    }
  }

  @objc public func readFileStreamChunk(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ReadFileStreamChunkArgs.self)
    run(invoke) {
      guard args.length > 0 else {
        throw FsError("length must be greater than zero")
      }
      return Array(try self.readStream(id: args.id).read(maxLength: args.length))
    }
  }

  @objc public func readTextFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ReadTextFileArgs.self)
    run(invoke) {
      let resolved = try self.resolve(args.uri)
      return try self.withAccess(resolved.url) {
        try String(contentsOf: resolved.url, encoding: self.stringEncoding(args.encoding))
      }
    }
  }

  @objc public func writeFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(WriteFileArgs.self)
    runVoid(invoke) {
      let resolved = try self.resolve(args.uri)
      try self.withAccess(resolved.url) {
        if !args.create && !FileManager.default.fileExists(atPath: resolved.url.path) {
          throw FsError("file does not exist")
        }
        try Data(args.data).write(to: resolved.url, options: .atomic)
      }
    }
  }

  @objc public func openWriteFileStream(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(OpenWriteFileStreamArgs.self)
    run(invoke) {
      let resolved = try self.resolve(args.uri)
      let accessed = resolved.url.startAccessingSecurityScopedResource()
      do {
        let exists = FileManager.default.fileExists(atPath: resolved.url.path)
        if !exists {
          guard args.create else {
            throw FsError("file does not exist")
          }
          guard FileManager.default.createFile(atPath: resolved.url.path, contents: Data()) else {
            throw FsError("unable to create file")
          }
        }
        let handle = try FileHandle(forWritingTo: resolved.url)
        if args.append {
          handle.seekToEndOfFile()
        } else if args.truncate {
          handle.truncateFile(atOffset: 0)
        }
        if let offset = args.offset {
          try handle.seek(toOffset: offset)
        }
        return self.insertWriteStream(IosWriteFileStream(url: resolved.url, handle: handle, accessed: accessed))
      } catch {
        if accessed {
          resolved.url.stopAccessingSecurityScopedResource()
        }
        throw error
      }
    }
  }

  @objc public func writeFileStreamChunk(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(WriteFileStreamChunkArgs.self)
    runVoid(invoke) {
      try self.writeStream(id: args.id).write(Data(args.data))
    }
  }

  @objc public func flushFileStream(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(FileStreamIdArgs.self)
    runVoid(invoke) {
      try self.writeStream(id: args.id).flush()
    }
  }

  @objc public func closeFileStream(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(FileStreamIdArgs.self)
    runVoid(invoke) {
      if let stream = self.removeReadStream(id: args.id) {
        try stream.close()
        return
      }
      if let stream = self.removeWriteStream(id: args.id) {
        try stream.close()
      }
    }
  }

  @objc public func writeTextFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(WriteTextFileArgs.self)
    runVoid(invoke) {
      let resolved = try self.resolve(args.uri)
      try self.withAccess(resolved.url) {
        if !args.create && !FileManager.default.fileExists(atPath: resolved.url.path) {
          throw FsError("file does not exist")
        }
        try args.data.write(to: resolved.url, atomically: true, encoding: self.stringEncoding(args.encoding))
      }
    }
  }

  @objc public func readDir(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ReadDirArgs.self)
    run(invoke) {
      let resolved = try self.resolve(.uri(args.uri))
      return try self.withAccess(resolved.url) {
        let keys: [URLResourceKey] = [.isDirectoryKey, .contentModificationDateKey, .fileSizeKey, .typeIdentifierKey]
        let urls = try FileManager.default.contentsOfDirectory(at: resolved.url, includingPropertiesForKeys: keys)
        let offset = max(args.offset ?? 0, 0)
        let end = args.limit.map { min(offset + max($0, 0), urls.count) } ?? urls.count
        guard offset <= end else { return [IosFsEntry]() }
        return try urls[offset..<end].map { url in
          try self.encodeEntry(url: url)
        }
      }
    }
  }

  @objc public func createDir(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BaseDirRelativePathArgs.self)
    run(invoke) {
      let url = try self.childUrl(base: args.baseDirUri, relativePath: args.relativePath)
      try self.withAccess(try self.resolve(.uri(args.baseDirUri)).url) {
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
      }
      return self.persist(url: url)
    }
  }

  @objc public func resolveFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BaseDirRelativePathArgs.self)
    run(invoke) {
      let url = try self.childUrl(base: args.baseDirUri, relativePath: args.relativePath)
      return try self.withAccess(try self.resolve(.uri(args.baseDirUri)).url) {
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory), !isDirectory.boolValue else {
          throw FsError("file does not exist")
        }
        return self.persist(url: url)
      }
    }
  }

  @objc public func resolveDir(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BaseDirRelativePathArgs.self)
    run(invoke) {
      let url = try self.childUrl(base: args.baseDirUri, relativePath: args.relativePath)
      return try self.withAccess(try self.resolve(.uri(args.baseDirUri)).url) {
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory), isDirectory.boolValue else {
          throw FsError("directory does not exist")
        }
        return self.persist(url: url)
      }
    }
  }

  @objc public func createNewFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(CreateNewFileArgs.self)
    run(invoke) {
      let target = try self.childUrl(base: args.baseDirUri, relativePath: args.relativePath)
      let url = uniqueCandidateURL(baseURL: target) { FileManager.default.fileExists(atPath: $0.path) }
      try self.withAccess(try self.resolve(.uri(args.baseDirUri)).url) {
        _ = FileManager.default.createFile(atPath: url.path, contents: Data())
      }
      return self.persist(url: url)
    }
  }

  @objc public func createNewDir(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BaseDirRelativePathArgs.self)
    run(invoke) {
      let target = try self.childUrl(base: args.baseDirUri, relativePath: args.relativePath)
      let url = uniqueCandidateURL(baseURL: target) { FileManager.default.fileExists(atPath: $0.path) }
      try self.withAccess(try self.resolve(.uri(args.baseDirUri)).url) {
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
      }
      return self.persist(url: url)
    }
  }

  @objc public func copyFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(CopyFileArgs.self)
    runVoid(invoke) {
      let src = try self.resolve(args.srcPath)
      let dest = try self.resolve(args.destPath)
      try self.withAccess(src.url) {
        try self.withAccess(dest.url) {
          if FileManager.default.fileExists(atPath: dest.url.path) {
            try FileManager.default.removeItem(at: dest.url)
          }
          try FileManager.default.copyItem(at: src.url, to: dest.url)
        }
      }
    }
  }

  @objc public func renameFile(_ invoke: Invoke) throws {
    try rename(invoke)
  }

  @objc public func renameDir(_ invoke: Invoke) throws {
    try rename(invoke)
  }

  @objc public func removeFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(UriArg.self)
    runVoid(invoke) {
      let resolved = try self.resolve(args.uri)
      try self.withAccess(resolved.url) {
        try FileManager.default.removeItem(at: resolved.url)
      }
    }
  }

  @objc public func removeEmptyDir(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(UriArg.self)
    runVoid(invoke) {
      let resolved = try self.resolve(args.uri)
      try self.withAccess(resolved.url) {
        if try !FileManager.default.contentsOfDirectory(atPath: resolved.url.path).isEmpty {
          throw FsError("directory is not empty")
        }
        try FileManager.default.removeItem(at: resolved.url)
      }
    }
  }

  @objc public func removeDirAll(_ invoke: Invoke) throws {
    try removeFile(invoke)
  }

  @objc public func exists(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(UriArg.self)
    let resolved = try resolve(args.uri)
    invoke.resolve(FileManager.default.fileExists(atPath: resolved.url.path))
  }

  @objc public func getMetadata(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(UriArg.self)
    run(invoke) {
      let resolved = try self.resolve(args.uri)
      return try self.withAccess(resolved.url) {
        try self.encodeMetadata(url: resolved.url)
      }
    }
  }

  @objc public func closeAllFileStreams(_ invoke: Invoke) throws {
    runVoid(invoke) {
      let streams = self.removeAllStreams()
      for stream in streams {
        try stream.close()
      }
    }
  }

  @objc public func countAllFileStreams(_ invoke: Invoke) throws {
    invoke.resolve(countStreams())
  }

  @objc public func showOpenFilePicker(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(OpenFilePickerArgs.self)
    presentPicker(invoke: invoke, mode: .open, documentTypes: documentTypes(for: args.mimeTypes), allowsMultipleSelection: args.multiple, cancelValue: [IosFsUri]()) { urls in
      urls.map { self.persist(url: $0) }
    }
  }

  @objc public func showOpenDirPicker(_ invoke: Invoke) throws {
    presentPicker(invoke: invoke, mode: .open, documentTypes: ["public.folder"], allowsMultipleSelection: false, cancelValue: Optional<IosFsUri>.none) { urls in
      urls.first.map { self.persist(url: $0) }
    }
  }

  @objc public func showSaveFilePicker(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(SaveFilePickerArgs.self)
    let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(try validateFileName(args.defaultFileName))
    _ = FileManager.default.createFile(atPath: tmp.path, contents: Data())
    presentExportPicker(invoke: invoke, url: tmp, cancelValue: Optional<IosFsUri>.none) { urls in
      urls.first.map { self.persist(url: $0) }
    }
  }

  private func rename(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(RenameArgs.self)
    run(invoke) {
      let resolved = try self.resolve(.uri(args.uri))
      let dest = resolved.url.deletingLastPathComponent().appendingPathComponent(try validateFileName(args.newName))
      try self.withAccess(resolved.url) {
        try FileManager.default.moveItem(at: resolved.url, to: dest)
      }
      return self.persist(url: dest)
    }
  }

  private func run<T: Encodable>(_ invoke: Invoke, _ body: @escaping () throws -> T) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        invoke.resolve(try body())
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  private func runVoid(_ invoke: Invoke, _ body: @escaping () throws -> Void) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try body()
        invoke.resolve()
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  private func insertReadStream(_ stream: IosReadFileStream) -> Int {
    streamLock.lock()
    defer { streamLock.unlock() }
    let id = nextStreamId
    nextStreamId += 1
    readStreams[id] = stream
    return id
  }

  private func insertWriteStream(_ stream: IosWriteFileStream) -> Int {
    streamLock.lock()
    defer { streamLock.unlock() }
    let id = nextStreamId
    nextStreamId += 1
    writeStreams[id] = stream
    return id
  }

  private func readStream(id: Int) throws -> IosReadFileStream {
    streamLock.lock()
    defer { streamLock.unlock() }
    guard let stream = readStreams[id] else {
      throw FsError("read stream not found")
    }
    return stream
  }

  private func writeStream(id: Int) throws -> IosWriteFileStream {
    streamLock.lock()
    defer { streamLock.unlock() }
    guard let stream = writeStreams[id] else {
      throw FsError("write stream not found")
    }
    return stream
  }

  private func removeReadStream(id: Int) -> IosReadFileStream? {
    streamLock.lock()
    defer { streamLock.unlock() }
    return readStreams.removeValue(forKey: id)
  }

  private func removeWriteStream(id: Int) -> IosWriteFileStream? {
    streamLock.lock()
    defer { streamLock.unlock() }
    return writeStreams.removeValue(forKey: id)
  }

  private func removeAllStreams() -> [IosClosableFileStream] {
    streamLock.lock()
    defer { streamLock.unlock() }
    let streams: [IosClosableFileStream] = Array(readStreams.values) + Array(writeStreams.values)
    readStreams.removeAll()
    writeStreams.removeAll()
    return streams
  }

  private func countStreams() -> Int {
    streamLock.lock()
    defer { streamLock.unlock() }
    return readStreams.count + writeStreams.count
  }

  private func resolve(_ input: IosFsUriOrString) throws -> (url: URL, uri: IosFsUri?) {
    switch input {
    case .string(let value):
      let url = URL(string: value) ?? URL(fileURLWithPath: value)
      guard isAppLocalFileURL(url) else {
        throw FsError("raw iOS file paths are limited to the app container; use a picker IosFsUri or security-scoped bookmark for external files")
      }
      return (url, nil)
    case .uri(let uri):
      if let id = uri.bookmarkId, let data = store.data(for: id) {
        var stale = false
        let url = try URL(resolvingBookmarkData: data, options: [], relativeTo: nil, bookmarkDataIsStale: &stale)
        if stale {
          _ = persist(url: url, bookmarkId: id)
        }
        return (url, uri)
      }
      guard let url = URL(string: uri.uri) else {
        throw FsError("invalid URL")
      }
      guard isAppLocalFileURL(url) else {
        throw FsError("external iOS URLs require a security-scoped bookmark")
      }
      return (url, uri)
    }
  }

  private func resolveBookmark(id: String) throws -> (url: URL, uri: IosFsUri) {
    guard let data = store.data(for: id) else {
      throw FsError("bookmark not found")
    }
    var stale = false
    let url = try URL(resolvingBookmarkData: data, options: [], relativeTo: nil, bookmarkDataIsStale: &stale)
    let uri = stale ? persist(url: url, bookmarkId: id) : IosFsUri(uri: url.absoluteString, bookmarkId: id, isDirectory: url.hasDirectoryPath)
    return (url, uri)
  }

  private func persist(url: URL, bookmarkId: String? = nil) -> IosFsUri {
    do {
      let accessed = url.startAccessingSecurityScopedResource()
      defer { if accessed { url.stopAccessingSecurityScopedResource() } }
      let data = try url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
      if let bookmarkId {
        return store.save(url: url, bookmarkData: data, id: bookmarkId)
      }
      return store.save(url: url, bookmarkData: data)
    } catch {
      return IosFsUri(uri: url.absoluteString, bookmarkId: nil, isDirectory: url.hasDirectoryPath)
    }
  }

  private func withAccess<T>(_ url: URL, _ body: () throws -> T) throws -> T {
    let accessed = url.startAccessingSecurityScopedResource()
    defer { if accessed { url.stopAccessingSecurityScopedResource() } }
    return try body()
  }

  private func isAppLocalFileURL(_ url: URL) -> Bool {
    guard url.isFileURL else { return false }
    let candidate = url.standardizedFileURL.path
    let roots = [
      NSHomeDirectory(),
      FileManager.default.temporaryDirectory.path
    ].map { URL(fileURLWithPath: $0).standardizedFileURL.path }

    return roots.contains { root in
      candidate == root || candidate.hasPrefix(root.hasSuffix("/") ? root : "\(root)/")
    }
  }

  private func childUrl(base: IosFsUri, relativePath: String) throws -> URL {
    let resolved = try resolve(.uri(base))
    return try childURL(baseURL: resolved.url, relativePath: relativePath)
  }

  private func encodeEntry(url: URL) throws -> IosFsEntry {
    var metadata = try encodeMetadata(url: url)
    metadata.uri = persist(url: url)
    return metadata
  }

  private func encodeMetadata(url: URL) throws -> IosFsEntry {
    let values = try url.resourceValues(forKeys: [.isDirectoryKey, .contentModificationDateKey, .fileSizeKey, .typeIdentifierKey])
    let lastModified = (values.contentModificationDate ?? Date()).timeIntervalSince1970 * 1000
    if values.isDirectory == true {
      return IosFsEntry(type: "Dir", name: url.lastPathComponent, lastModified: lastModified)
    }
    return IosFsEntry(
      type: "File",
      name: url.lastPathComponent,
      lastModified: lastModified,
      byteLength: UInt64(values.fileSize ?? 0),
      mimeType: VnidropFsCore.mimeType(for: url)
    )
  }

  private func stringEncoding(_ label: String?) -> String.Encoding {
    switch label?.lowercased() {
    case "utf-16", "utf16": return .utf16
    case "ascii": return .ascii
    default: return .utf8
    }
  }

  private func presentPicker<T>(
    invoke: Invoke,
    mode: UIDocumentPickerMode,
    documentTypes: [String],
    allowsMultipleSelection: Bool,
    cancelValue: T,
    mapper: @escaping ([URL]) -> T
  ) where T: Encodable {
    DispatchQueue.main.async {
      guard let presenter = topViewController() else {
        invoke.reject("unable to present document picker")
        return
      }
      let picker = UIDocumentPickerViewController(documentTypes: documentTypes, in: mode)
      picker.allowsMultipleSelection = allowsMultipleSelection
      var delegate: DocumentPickerDelegate!
      delegate = DocumentPickerDelegate(
        onResolve: { urls in
          self.retainedDelegates.removeAll { $0 === delegate }
          guard let urls = urls else {
            invoke.resolve(cancelValue)
            return
          }
          invoke.resolve(mapper(urls))
        },
        onReject: { message in invoke.reject(message) }
      )
      picker.delegate = delegate
      self.retainedDelegates.append(delegate)
      presenter.present(picker, animated: true)
    }
  }

  private func presentExportPicker<T>(
    invoke: Invoke,
    url: URL,
    cancelValue: T,
    mapper: @escaping ([URL]) -> T
  ) where T: Encodable {
    DispatchQueue.main.async {
      guard let presenter = topViewController() else {
        invoke.reject("unable to present document picker")
        return
      }
      let picker = UIDocumentPickerViewController(url: url, in: .exportToService)
      var delegate: DocumentPickerDelegate!
      delegate = DocumentPickerDelegate(
        onResolve: { urls in
          self.retainedDelegates.removeAll { $0 === delegate }
          guard let urls = urls else {
            invoke.resolve(cancelValue)
            return
          }
          invoke.resolve(mapper(urls))
        },
        onReject: { message in invoke.reject(message) }
      )
      picker.delegate = delegate
      self.retainedDelegates.append(delegate)
      presenter.present(picker, animated: true)
    }
  }
}

private struct IosFsEntry: Encodable {
  let type: String
  let name: String
  let lastModified: Double
  var uri: IosFsUri?
  var byteLength: UInt64?
  var mimeType: String?

  init(type: String, name: String, lastModified: Double, uri: IosFsUri? = nil, byteLength: UInt64? = nil, mimeType: String? = nil) {
    self.type = type
    self.name = name
    self.lastModified = lastModified
    self.uri = uri
    self.byteLength = byteLength
    self.mimeType = mimeType
  }
}

private protocol IosClosableFileStream {
  func close() throws
}

private final class IosReadFileStream: IosClosableFileStream {
  private let url: URL
  private let handle: FileHandle
  private let accessed: Bool
  private let lock = NSLock()
  private var closed = false

  init(url: URL, handle: FileHandle, accessed: Bool) {
    self.url = url
    self.handle = handle
    self.accessed = accessed
  }

  func read(maxLength: Int) throws -> Data {
    lock.lock()
    defer { lock.unlock() }
    try assertOpen()
    return handle.readData(ofLength: maxLength)
  }

  func close() throws {
    lock.lock()
    defer { lock.unlock() }
    guard !closed else { return }
    closed = true
    defer {
      if accessed {
        url.stopAccessingSecurityScopedResource()
      }
    }
    try handle.close()
  }

  deinit {
    try? close()
  }

  private func assertOpen() throws {
    if closed {
      throw FsError("stream is closed")
    }
  }
}

private final class IosWriteFileStream: IosClosableFileStream {
  private let url: URL
  private let handle: FileHandle
  private let accessed: Bool
  private let lock = NSLock()
  private var closed = false

  init(url: URL, handle: FileHandle, accessed: Bool) {
    self.url = url
    self.handle = handle
    self.accessed = accessed
  }

  func write(_ data: Data) throws {
    lock.lock()
    defer { lock.unlock() }
    try assertOpen()
    handle.write(data)
  }

  func flush() throws {
    lock.lock()
    defer { lock.unlock() }
    try assertOpen()
    try handle.synchronize()
  }

  func close() throws {
    lock.lock()
    defer { lock.unlock() }
    guard !closed else { return }
    closed = true
    defer {
      if accessed {
        url.stopAccessingSecurityScopedResource()
      }
    }
    try handle.synchronize()
    try handle.close()
  }

  deinit {
    try? close()
  }

  private func assertOpen() throws {
    if closed {
      throw FsError("stream is closed")
    }
  }
}

private struct FsError: LocalizedError {
  let message: String

  init(_ message: String) {
    self.message = message
  }

  var errorDescription: String? {
    message
  }
}

private func topViewController(base: UIViewController? = UIApplication.shared.windows.first { $0.isKeyWindow }?.rootViewController) -> UIViewController? {
  if let nav = base as? UINavigationController {
    return topViewController(base: nav.visibleViewController)
  }
  if let tab = base as? UITabBarController {
    return topViewController(base: tab.selectedViewController)
  }
  if let presented = base?.presentedViewController {
    return topViewController(base: presented)
  }
  return base
}

@_cdecl("init_plugin_vnidrop_fs")
func initPlugin() -> Plugin {
  return VnidropFsPlugin()
}
#else
final class VnidropFsPlugin: Plugin {}

@_cdecl("init_plugin_vnidrop_fs")
func initPlugin() -> Plugin {
  return VnidropFsPlugin()
}
#endif
