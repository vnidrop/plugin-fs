package app.tauri.plugin

class Invoke {
    @Suppress("UNUSED_PARAMETER")
    fun <T> parseArgs(clazz: Class<T>): T {
        return clazz.getDeclaredConstructor().newInstance()
    }

    fun resolve() {}

    @Suppress("UNUSED_PARAMETER")
    fun resolve(value: Any?) {}

    @Suppress("UNUSED_PARAMETER")
    fun reject(message: String) {}
}
