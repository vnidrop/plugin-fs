package plugin.vnidrop.fs

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class RawFileInstrumentedTest {
    @Test
    fun rawAppFileCreateReadWriteDeleteSmoke() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val file = File(context.filesDir, "vnidrop-fs-smoke.txt")

        file.delete()
        assertFalse(file.exists())

        file.writeText("hello")
        assertTrue(file.exists())
        assertEquals("hello", file.readText())

        file.writeText("updated")
        assertEquals("updated", file.readText())

        assertTrue(file.delete())
        assertFalse(file.exists())
    }
}
