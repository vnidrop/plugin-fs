use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::VnidropFs;
#[cfg(mobile)]
use mobile::VnidropFs;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the vnidrop-fs APIs.
pub trait VnidropFsExt<R: Runtime> {
  fn vnidrop_fs(&self) -> &VnidropFs<R>;
}

impl<R: Runtime, T: Manager<R>> crate::VnidropFsExt<R> for T {
  fn vnidrop_fs(&self) -> &VnidropFs<R> {
    self.state::<VnidropFs<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("vnidrop-fs")
    .invoke_handler(tauri::generate_handler![commands::ping])
    .setup(|app, api| {
      #[cfg(mobile)]
      let vnidrop_fs = mobile::init(app, api)?;
      #[cfg(desktop)]
      let vnidrop_fs = desktop::init(app, api)?;
      app.manage(vnidrop_fs);
      Ok(())
    })
    .build()
}
