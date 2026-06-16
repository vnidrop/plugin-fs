import Foundation

public struct IosFsUri: Codable, Equatable {
  public let uri: String
  public let bookmarkId: String?
  public let isDirectory: Bool?

  public init(uri: String, bookmarkId: String?, isDirectory: Bool? = nil) {
    self.uri = uri
    self.bookmarkId = bookmarkId
    self.isDirectory = isDirectory
  }
}

public final class SecurityScopedBookmarkStore {
  private let defaults: UserDefaults
  private let key = "plugin.vnidrop.fs.ios.securityScopedBookmarks"

  public init(defaults: UserDefaults) {
    self.defaults = defaults
  }

  public func bookmarkIds() -> [String] {
    Array(bookmarks().keys).sorted()
  }

  public func data(for id: String) -> Data? {
    bookmarks()[id]
  }

  @discardableResult
  public func save(url: URL, bookmarkData: Data) -> IosFsUri {
    let id = stableBookmarkId(for: url)
    var values = bookmarks()
    values[id] = bookmarkData
    defaults.set(values.mapValues { $0.base64EncodedString() }, forKey: key)
    return IosFsUri(uri: url.absoluteString, bookmarkId: id, isDirectory: url.hasDirectoryPath)
  }

  @discardableResult
  public func remove(id: String) -> Bool {
    var values = bookmarks()
    let existed = values.removeValue(forKey: id) != nil
    defaults.set(values.mapValues { $0.base64EncodedString() }, forKey: key)
    return existed
  }

  private func bookmarks() -> [String: Data] {
    let raw = defaults.dictionary(forKey: key) as? [String: String] ?? [:]
    return raw.compactMapValues { Data(base64Encoded: $0) }
  }
}

public func stableBookmarkId(for url: URL) -> String {
  var hash: UInt64 = 0xcbf29ce484222325
  for byte in Data(url.absoluteString.utf8) {
    hash ^= UInt64(byte)
    hash &*= 0x100000001b3
  }
  return String(format: "%016llx", hash)
}

public func uniqueCandidateURL(baseURL: URL, exists: (URL) -> Bool) -> URL {
  if !exists(baseURL) {
    return baseURL
  }

  let directory = baseURL.deletingLastPathComponent()
  let ext = baseURL.pathExtension
  let stem = baseURL.deletingPathExtension().lastPathComponent

  for index in 1..<Int.max {
    let name = ext.isEmpty ? "\(stem) (\(index))" : "\(stem) (\(index)).\(ext)"
    let candidate = directory.appendingPathComponent(name)
    if !exists(candidate) {
      return candidate
    }
  }

  return baseURL
}

public func childURL(baseURL: URL, relativePath: String) throws -> URL {
  let parts = relativePath
    .split(separator: "/", omittingEmptySubsequences: true)
    .map(String.init)

  if parts.contains("..") || relativePath.hasPrefix("/") {
    throw IosFsCoreError.invalidRelativePath
  }

  return parts.reduce(baseURL) { url, part in
    url.appendingPathComponent(part)
  }
}

public func mimeType(for url: URL) -> String {
  switch url.pathExtension.lowercased() {
  case "txt", "md", "json", "csv": return "text/plain"
  case "jpg", "jpeg": return "image/jpeg"
  case "png": return "image/png"
  case "gif": return "image/gif"
  case "pdf": return "application/pdf"
  case "mp4": return "video/mp4"
  case "mp3": return "audio/mpeg"
  default: return "application/octet-stream"
  }
}

public func documentTypes(for mimeTypes: [String]) -> [String] {
  if mimeTypes.isEmpty {
    return ["public.data"]
  }
  return mimeTypes.map { mime in
    switch mime {
    case "image/*": return "public.image"
    case "video/*": return "public.movie"
    case "audio/*": return "public.audio"
    case "text/*", "text/plain": return "public.text"
    case "application/pdf": return "com.adobe.pdf"
    default: return "public.data"
    }
  }
}

public enum IosFsCoreError: Error, Equatable {
  case invalidRelativePath
}
