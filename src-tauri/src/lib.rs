use cases::commands::{self, CasesState};
use tauri::{LogicalSize, Manager};

mod cases;

const DEFAULT_WINDOW_WIDTH: f64 = 1800.0;
const WINDOW_ASPECT_RATIO: f64 = 16.0 / 9.0;
const WINDOW_MARGIN: f64 = 32.0;

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
  if !url.starts_with("http://") && !url.starts_with("https://") {
    return Err("仅支持打开 http/https 链接".into());
  }

  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .arg(&url)
      .spawn()
      .map_err(|e| format!("打开链接失败: {e}"))?;
  }

  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("cmd")
      .args(["/c", "start", "", &url])
      .spawn()
      .map_err(|e| format!("打开链接失败: {e}"))?;
  }

  #[cfg(target_os = "linux")]
  {
    std::process::Command::new("xdg-open")
      .arg(&url)
      .spawn()
      .map_err(|e| format!("打开链接失败: {e}"))?;
  }

  Ok(())
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
  let target = std::path::PathBuf::from(&path);
  if let Some(parent) = target.parent() {
    if !parent.as_os_str().is_empty() && !parent.exists() {
      std::fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {e}"))?;
    }
  }
  std::fs::write(&target, content).map_err(|e| format!("写入文件失败: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_dialog::init())
    .manage(CasesState::default())
    .invoke_handler(tauri::generate_handler![
      commands::get_machine_id,
      commands::get_cases_status,
      commands::activate_cases,
      commands::activate_with_master_password,
      commands::get_case_list,
      commands::get_case_content,
      commands::get_author_profile,
      commands::sign_activation_code,
      commands::is_signing_available,
      open_external_url,
      write_text_file
    ])
    .setup(|app| {
      let window = app
        .get_webview_window("main")
        .expect("main window must exist");

      if let Some(monitor) = window.current_monitor()? {
        let work_area = monitor
          .work_area()
          .size
          .to_logical::<f64>(monitor.scale_factor());
        let max_width = (work_area.width - WINDOW_MARGIN).max(640.0);
        let max_height = (work_area.height - WINDOW_MARGIN).max(360.0);
        let mut width = DEFAULT_WINDOW_WIDTH.min(max_width);
        let mut height = width / WINDOW_ASPECT_RATIO;

        if height > max_height {
          height = max_height;
          width = height * WINDOW_ASPECT_RATIO;
        }

        window.set_size(LogicalSize::new(width, height))?;
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
