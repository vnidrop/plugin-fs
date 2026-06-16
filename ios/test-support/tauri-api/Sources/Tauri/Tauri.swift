import Foundation

public typealias JsonObject = [String: Any?]

public enum JsonValue {
  case dictionary(JsonObject)
}

open class Plugin: NSObject {
  public required override init() {
    super.init()
  }
}

open class Invoke: NSObject {
  open func parseArgs<T: Decodable>(_ type: T.Type) throws -> T {
    throw NSError(domain: "TauriTestSupport", code: 1)
  }

  open func resolve() {}

  open func resolve(_ value: JsonObject) {}

  open func resolve(_ value: JsonValue) {}

  open func resolve<T: Encodable>(_ value: T) {}

  open func reject(_ message: String) {}
}
