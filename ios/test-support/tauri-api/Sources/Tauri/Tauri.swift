import Foundation

open class Plugin: NSObject {
  public required override init() {
    super.init()
  }
}

open class Invoke: NSObject {
  open func parseArgs<T: Decodable>(_ type: T.Type) throws -> T {
    throw NSError(domain: "TauriTestSupport", code: 1)
  }

  open func resolve(_ value: Any? = nil) {}

  open func reject(_ message: String) {}
}
