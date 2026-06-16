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
}
