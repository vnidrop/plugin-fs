use serde::{Deserialize, Serialize};

/// iOS file or directory reference returned by Vnidrop FS picker and bookmark APIs.
///
/// External document-provider files should keep the `bookmark_id` value that
/// came from the picker or bookmark resolver. The Rust backend API uses it to
/// ask the native iOS plugin to open a security-scoped stream.
#[derive(Debug, Clone, Hash, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IosFsUri {
    /// File URL string for the selected entry.
    pub uri: String,

    /// Persisted security-scoped bookmark identifier, or `None` for app-local files.
    pub bookmark_id: Option<String>,

    /// Indicates whether the referenced entry is a directory when known.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_directory: Option<bool>,
}
