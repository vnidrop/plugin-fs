package app.tauri.plugin

import android.app.Activity
import android.content.Intent
import app.tauri.PermissionState

open class Plugin(activity: Activity) {
    @Suppress("UNUSED_PARAMETER")
    fun getPermissionState(alias: String): PermissionState = PermissionState.DENIED

    @Suppress("UNUSED_PARAMETER")
    fun requestPermissionForAliases(aliases: Array<String>, invoke: Invoke, callbackName: String) {}

    @Suppress("UNUSED_PARAMETER")
    fun startActivityForResult(invoke: Invoke, intent: Intent, callbackName: String) {}
}
