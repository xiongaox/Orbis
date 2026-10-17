use cases::commands::{self, CasesState};
use tauri::Manager;

mod cases;

/// 窗口尺寸的唯一来源是 `tauri.conf.json`，setup 阶段不做任何尺寸干预：
/// - `maximized: true` 让首次启动铺满显示器工作区；
/// - `minWidth: 390` / `minHeight: 810` 是可拖拽下界，即"缩到最小时是竖屏手机态"。
///   该尺寸由截图实测换算得出（截图 3362px 宽对应 1680 逻辑点，系数≈0.5，
///   实测小窗为 386×806），取整为 390×810。
///   关键：minHeight 必须小于屏幕工作区高度（本机 1050），否则 macOS 会判定约束
///   不可满足并静默取消整个最小尺寸防护（曾因 minHeight=1365 踩过此坑）。
///
/// 历史教训（勿重蹈）：
/// - 不要在此处调用 `set_size()`：会绕过 `preventOverflow`，把窗口推到屏幕外（见提交 2c3257d）。
/// - 不要在此处调用 `maximize()`：macOS 上返回 Ok 但 `is_maximized()` 仍为 false，实测无效。
/// - 不要为开发态引入 `-c` 覆盖配置：Tauri 对 windows 数组是整体替换而非合并，
///   覆盖文件会把 minWidth 等字段全部吃掉，导致最小尺寸约束静默失效。

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

  // 移动端没有可 fork 的桌面进程：安卓由 WebView 注入的原生桥处理（见 MainActivity.kt）。
  // 必须显式报错——返回 Ok 会让前端的 window.open 兜底永远不执行。
  #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
  {
    return Err("当前平台不支持通过桌面进程打开链接".into());
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
      commands::remove_activation,
      commands::get_case_list,
      commands::get_case_content,
      commands::get_author_profile,
      commands::sign_activation_code,
      commands::is_signing_available,
      open_external_url,
      write_text_file
    ])
    .setup(|app| {
      // 日志插件在正式包也要注册：此前用 cfg!(debug_assertions) 包裹，导致 release 构建
      // 里 log::warn!（硬件指纹回退、激活状态读取失败等安全层告警）无 logger 承接而静默
      // 丢弃，出问题时无从排查。落盘位置沿用插件默认的平台日志目录：
      //   macOS ~/Library/Logs/<bundle-id>/、Windows %LOCALAPPDATA%\<bundle-id>\logs、
      //   Android /data/data/<pkg>/logs。
      //
      // 轮转策略必须显式指定：插件默认 KeepAll + 单文件 40KB，正式包装在用户机器上长期
      // 运行会无限堆积日志文件。保留最近 5 个（约 200KB 上限）足够定位问题。
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log::LevelFilter::Info)
          .max_file_size(200_000)
          .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(5))
          .build(),
      )?;

      // 窗口尺寸与"启动铺满"声明在 tauri.conf.json：
      // - minWidth/minHeight 是可拖拽下界（缩到最小时是竖屏手机态）；
      // - maximized=true 本应负责启动铺满，但实测在 macOS 上不生效
      //   （窗口会停在 minWidth×minHeight，即最小尺寸），故此处补一次最大化。
      //
      // 约束：
      // - 用 maximize() 而非 set_size()，避免绕过 preventOverflow 把窗口推到屏幕外（见提交 2c3257d）；
      // - 必须在窗口就绪后调用，且校验 is_maximized()，失败时明确告警而不是静默。
      if let Some(window) = app.get_webview_window("main") {
        // 开发态开放 DevTools（正式包不开放）。
        #[cfg(debug_assertions)]
        window.open_devtools();

        // maximize/is_maximized 在 Tauri 中是 desktop-only API；移动端窗口天然全屏，无需干预。
        #[cfg(desktop)]
        {
          let win = window.clone();
          std::thread::spawn(move || {
            // 等待窗口完成首帧布局；过早调用会被 wry 忽略。
            std::thread::sleep(std::time::Duration::from_millis(400));
            let target = win.clone();
            if let Err(e) = win.run_on_main_thread(move || {
              if let Err(e) = target.maximize() {
                log::warn!("启动最大化失败: {e}");
                return;
              }
              match target.is_maximized() {
                Ok(true) => log::info!("启动已铺满工作区"),
                // 部分 macOS 环境下 maximize() 返回 Ok 但窗口未真正进入最大化态。
                Ok(false) => log::warn!("maximize() 未生效，窗口保留在最小尺寸"),
                Err(e) => log::warn!("读取最大化状态失败: {e}"),
              }
            }) {
              log::warn!("调度启动最大化任务失败: {e}");
            }
          });
        }
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
