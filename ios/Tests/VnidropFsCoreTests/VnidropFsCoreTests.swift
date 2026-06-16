import XCTest
@testable import VnidropFsCore

final class VnidropFsCoreTests: XCTestCase {
  func testUniqueCandidateAddsSuffixBeforeExtension() {
    let base = URL(fileURLWithPath: "/tmp/report.txt")
    let taken = Set([
      "/tmp/report.txt",
      "/tmp/report (1).txt"
    ])

    let candidate = uniqueCandidateURL(baseURL: base) { taken.contains($0.path) }

    XCTAssertEqual(candidate.path, "/tmp/report (2).txt")
  }

  func testChildURLRejectsUnsafeRelativePath() {
    XCTAssertThrowsError(try childURL(baseURL: URL(fileURLWithPath: "/tmp"), relativePath: "../secret.txt"))
    XCTAssertThrowsError(try childURL(baseURL: URL(fileURLWithPath: "/tmp"), relativePath: "/secret.txt"))
    XCTAssertThrowsError(try childURL(baseURL: URL(fileURLWithPath: "/tmp"), relativePath: "safe/../secret.txt"))
    XCTAssertThrowsError(try childURL(baseURL: URL(fileURLWithPath: "/tmp"), relativePath: "safe\\secret.txt"))
  }

  func testValidateFileNameRejectsPathComponents() {
    XCTAssertEqual(try validateFileName("report.txt"), "report.txt")
    XCTAssertThrowsError(try validateFileName(""))
    XCTAssertThrowsError(try validateFileName("."))
    XCTAssertThrowsError(try validateFileName(".."))
    XCTAssertThrowsError(try validateFileName("../report.txt"))
    XCTAssertThrowsError(try validateFileName("nested/report.txt"))
  }

  func testBookmarkStorePersistsBase64Data() {
    let suite = "plugin.vnidrop.fs.tests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suite)!
    defer { defaults.removePersistentDomain(forName: suite) }
    let store = SecurityScopedBookmarkStore(defaults: defaults)
    let url = URL(fileURLWithPath: "/tmp/report.txt")

    let uri = store.save(url: url, bookmarkData: Data([1, 2, 3]))

    XCTAssertEqual(store.bookmarkIds(), [uri.bookmarkId!])
    XCTAssertEqual(store.data(for: uri.bookmarkId!), Data([1, 2, 3]))
    XCTAssertTrue(store.remove(id: uri.bookmarkId!))
    XCTAssertEqual(store.bookmarkIds(), [])
  }

  func testBookmarkStoreUsesRandomIdsByDefault() {
    let suite = "plugin.vnidrop.fs.tests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suite)!
    defer { defaults.removePersistentDomain(forName: suite) }
    let store = SecurityScopedBookmarkStore(defaults: defaults)
    let url = URL(fileURLWithPath: "/tmp/report.txt")

    let first = store.save(url: url, bookmarkData: Data([1]))
    let second = store.save(url: url, bookmarkData: Data([2]))

    XCTAssertNotEqual(first.bookmarkId, second.bookmarkId)
  }

  func testMimeTypeMappingFallsBackToOctetStream() {
    XCTAssertEqual(mimeType(for: URL(fileURLWithPath: "/tmp/photo.JPG")), "image/jpeg")
    XCTAssertEqual(mimeType(for: URL(fileURLWithPath: "/tmp/report.pdf")), "application/pdf")
    XCTAssertEqual(mimeType(for: URL(fileURLWithPath: "/tmp/archive.unknown")), "application/octet-stream")
  }

  func testDocumentTypeMappingFallsBackToPublicData() {
    XCTAssertEqual(documentTypes(for: []), ["public.data"])
    XCTAssertEqual(documentTypes(for: ["image/*", "application/pdf", "application/x-custom"]), [
      "public.image",
      "com.adobe.pdf",
      "public.data"
    ])
  }
}
