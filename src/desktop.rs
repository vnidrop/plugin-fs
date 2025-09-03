use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<VnidropFs<R>> {
  Ok(VnidropFs(app.clone()))
}

/// Access to the vnidrop-fs APIs.
pub struct VnidropFs<R: Runtime>(AppHandle<R>);

impl<R: Runtime> VnidropFs<R> {
  pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
    Ok(PingResponse {
      value: payload.value,
    })
  }
}
