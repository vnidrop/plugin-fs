package plugin.vnidrop.fs

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AFUtilsUnitTest {
    @Test
    fun emptyExtensionFallsBackToOctetStream() {
        assertEquals("application/octet-stream", AFUtils.getMimeTypeFromExtension(""))
        assertEquals("application/octet-stream", AFUtils.getMimeTypeFromName("README"))
    }

    @Test
    fun uriJsonObjectPreservesDocumentTreeShape() {
        val obj = AFJSObject.createFileUri(
            "content://com.example.provider/document/root%2Ffile.txt",
            "content://com.example.provider/tree/root"
        )

        assertEquals("content://com.example.provider/document/root%2Ffile.txt", obj.getString("uri"))
        assertEquals("content://com.example.provider/tree/root", obj.getString("documentTopTreeUri"))
    }

    @Test
    fun uriJsonObjectAllowsMissingDocumentTopTreeUri() {
        val obj = AFJSObject.createFileUri("file:///data/user/0/app/files/local.txt", null as String?)

        assertEquals("file:///data/user/0/app/files/local.txt", obj.getString("uri"))
        assertTrue(obj.isNull("documentTopTreeUri"))
    }

    @Test
    fun relativePathValidationRejectsTraversalAndSeparators() {
        assertEquals("safe/report.txt", AFUtils.validateRelativePath("safe/report.txt"))

        listOf("../secret.txt", "safe/../secret.txt", "/secret.txt", "safe\\secret.txt", "./secret.txt").forEach {
            try {
                AFUtils.validateRelativePath(it)
                throw AssertionError("expected invalid relative path: $it")
            } catch (_: Exception) {
            }
        }
    }

    @Test
    fun fileNameValidationRejectsPathComponents() {
        assertEquals("report.txt", AFUtils.validateFileName("report.txt"))

        listOf("", ".", "..", "../report.txt", "nested/report.txt", "nested\\report.txt").forEach {
            try {
                AFUtils.validateFileName(it)
                throw AssertionError("expected invalid file name: $it")
            } catch (_: Exception) {
            }
        }
    }
}
