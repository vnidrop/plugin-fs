package app.tauri.annotation

@Target()
@Retention(AnnotationRetention.RUNTIME)
annotation class Permission(
    val strings: Array<String>,
    val alias: String = ""
)
