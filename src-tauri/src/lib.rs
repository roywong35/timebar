use tauri::{Emitter, Manager, PhysicalPosition};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct WindowPosition {
    x: i32,
    y: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct PresetTime {
    seconds: i32,
    label: String,
}

// Get screen dimensions and calculate position ON TOP of taskbar
#[tauri::command]
async fn get_default_position(window: tauri::WebviewWindow) -> Result<WindowPosition, String> {
    // Get primary monitor
    let monitor = window.primary_monitor()
        .map_err(|e| format!("Failed to get monitor: {}", e))?
        .ok_or("No monitor found")?;
    
    let size = monitor.size();
    let position = monitor.position();
    
    let window_width = 400;
    let window_height = 48;
    
    // Simple: position at the bottom of screen
    // Center horizontally, at the very bottom
    let x = position.x + ((size.width as i32 - window_width) / 2);
    let y = position.y + size.height as i32 - window_height;
    
    println!("Screen size: {}x{}, position: ({}, {})", size.width, size.height, position.x, position.y);
    println!("Calculated window position: ({}, {})", x, y);
    
    Ok(WindowPosition { x, y })
}

// Set window position
#[tauri::command]
async fn set_window_position(window: tauri::WebviewWindow, x: i32, y: i32) -> Result<(), String> {
    window.set_position(PhysicalPosition::new(x, y))
        .map_err(|e| format!("Failed to set position: {}", e))?;
    Ok(())
}

// Get window position
#[tauri::command]
async fn get_window_position(window: tauri::WebviewWindow) -> Result<WindowPosition, String> {
    let position = window.outer_position()
        .map_err(|e| format!("Failed to get position: {}", e))?;
    
    Ok(WindowPosition {
        x: position.x,
        y: position.y,
    })
}

// Register global shortcut
#[tauri::command]
async fn register_shortcut(_app: tauri::AppHandle, _shortcut: String, _action: String) -> Result<(), String> {
    // This will be handled by the global shortcut plugin on the frontend side
    Ok(())
}

// Open preset settings window
#[tauri::command]
async fn open_preset_settings(app: tauri::AppHandle) -> Result<(), String> {
    println!("Opening preset settings window");
    
    // Check if settings window already exists
    if let Some(window) = app.get_webview_window("preset-settings") {
        println!("Settings window already exists, focusing it");
        window.set_focus().map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
        return Ok(());
    }
    
    // Create new settings window
    println!("Creating new settings window");
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        "preset-settings",
        tauri::WebviewUrl::App("settings.html".into())
    )
    .title("Customize Presets")
    .inner_size(500.0, 620.0)
    .resizable(false)
    .center()
    .always_on_top(true)
    .build()
    .map_err(|e| format!("Failed to create settings window: {}", e))?;
    
    println!("Settings window created successfully");
    window.show().map_err(|e| e.to_string())?;
    
    Ok(())
}

// Rebuild tray menu with dynamic presets
#[tauri::command]
async fn rebuild_tray_menu(app: tauri::AppHandle, presets: Vec<PresetTime>) -> Result<(), String> {
    println!("Rebuilding tray menu with {} presets", presets.len());
    
    // Get the tray instance
    let tray = app.tray_by_id("main-tray").ok_or("Tray not found")?;
    
    // Create theme submenu (same as before)
    let theme_submenu = tauri::menu::SubmenuBuilder::new(&app, "Themes")
        .text("theme_blue", "Ocean Blue")
        .text("theme_green", "Forest Green")
        .text("theme_purple", "Sunset Purple")
        .text("theme_orange", "Fire Orange")
        .text("theme_red", "Cherry Red")
        .text("theme_dark", "Dark Matter")
        .text("theme_light", "Sky Light")
        .separator()
        .text("theme_dynamic", "Dynamic (10 Colors)")
        .text("theme_transparent", "Crystal Clear")
        .build()
        .map_err(|e| e.to_string())?;
    
    // Build menu with dynamic presets
    let mut menu_builder = tauri::menu::MenuBuilder::new(&app)
        .text("show", "Show Timer")
        .separator();
    
    // Add preset menu items dynamically
    for (index, preset) in presets.iter().enumerate() {
        let menu_id = format!("preset_{}", index);
        let menu_label = format!("{} - {}", index + 1, preset.label);
        menu_builder = menu_builder.text(menu_id, menu_label);
    }
    
    // Add the rest of the menu
    let new_menu = menu_builder
        .separator()
        .text("toggle_mode", "Switch Mode (Countdown ↔ Stopwatch)")
        .text("settings", "Custom Time (MM:SS or HH:MM:SS)")
        .text("customize_presets", "Customize Presets...")
        .separator()
        .item(&theme_submenu)
        .separator()
        .text("quit", "Exit")
        .build()
        .map_err(|e| e.to_string())?;
    
    // Update the tray menu
    tray.set_menu(Some(new_menu)).map_err(|e| e.to_string())?;
    
    println!("Tray menu rebuilt successfully");
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Create theme submenu
            let theme_submenu = tauri::menu::SubmenuBuilder::new(app, "Themes")
                .text("theme_blue", "Ocean Blue")
                .text("theme_green", "Forest Green")
                .text("theme_purple", "Sunset Purple")
                .text("theme_orange", "Fire Orange")
                .text("theme_red", "Cherry Red")
                .text("theme_dark", "Dark Matter")
                .text("theme_light", "Sky Light")
                .separator()
                .text("theme_dynamic", "Dynamic (10 Colors)")
                .text("theme_transparent", "Crystal Clear")
                .build()?;

            // Create system tray with expanded menu
            // Note: Menu labels are static, but they trigger preset indices
            // Users can customize what each preset does via the settings window
            let tray_menu = tauri::menu::MenuBuilder::new(app)
                .text("show", "Show Timer")
                .separator()
                .text("set_3min", "Preset 1 (3 min)")
                .text("set_5min", "Preset 2 (5 min)")
                .text("set_25min", "Preset 3 (25 min)")
                .separator()
                .text("toggle_mode", "Switch Mode (Countdown ↔ Stopwatch)")
                .text("settings", "Custom Time (MM:SS or HH:MM:SS)")
                .text("customize_presets", "Customize Presets...")
                .separator()
                .item(&theme_submenu)
                .separator()
                .text("quit", "Exit")
                .build()?;

            let _tray = tauri::tray::TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .on_menu_event(move |app, event| {
                    println!("Tray menu event: {}", event.id().as_ref());
                    let event_id = event.id().as_ref();
                    
                    // Handle dynamic preset events
                    if event_id.starts_with("preset_") {
                        if let Ok(index) = event_id.strip_prefix("preset_").unwrap().parse::<usize>() {
                            println!("Preset {} clicked", index);
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("preset-selected", index) {
                                    println!("Failed to emit preset-selected: {:?}", e);
                                }
                            }
                            return;
                        }
                    }
                    
                    match event_id {
                        "show" => {
                            println!("Show clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                                let _ = window.set_always_on_top(true);
                            }
                        }
                        "set_3min" => {
                            println!("Preset 1 clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("preset-selected", 0) {
                                    println!("Failed to emit preset-selected: {:?}", e);
                                }
                            }
                        }
                        "set_5min" => {
                            println!("Preset 2 clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("preset-selected", 1) {
                                    println!("Failed to emit preset-selected: {:?}", e);
                                }
                            }
                        }
                        "set_25min" => {
                            println!("Preset 3 clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("preset-selected", 2) {
                                    println!("Failed to emit preset-selected: {:?}", e);
                                }
                            }
                        }
                        "toggle_mode" => {
                            println!("Toggle mode clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                println!("Emitting toggle-mode event");
                                if let Err(e) = window.emit("toggle-mode", ()) {
                                    println!("Failed to emit toggle-mode: {:?}", e);
                                }
                            } else {
                                println!("Window 'main' not found!");
                            }
                        }
                        "settings" => {
                            println!("Settings clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                println!("Emitting open-settings event");
                                if let Err(e) = window.emit("open-settings", ()) {
                                    println!("Failed to emit open-settings: {:?}", e);
                                }
                            } else {
                                println!("Window 'main' not found!");
                            }
                        }
                        "theme_blue" => {
                            println!("Theme blue clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("change-theme", "blue") {
                                    println!("Failed to emit change-theme: {:?}", e);
                                }
                            }
                        }
                        "theme_green" => {
                            println!("Theme green clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("change-theme", "green") {
                                    println!("Failed to emit change-theme: {:?}", e);
                                }
                            }
                        }
                        "theme_purple" => {
                            println!("Theme purple clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("change-theme", "purple") {
                                    println!("Failed to emit change-theme: {:?}", e);
                                }
                            }
                        }
                        "theme_orange" => {
                            println!("Theme orange clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("change-theme", "orange") {
                                    println!("Failed to emit change-theme: {:?}", e);
                                }
                            }
                        }
                        "theme_red" => {
                            println!("Theme red clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("change-theme", "red") {
                                    println!("Failed to emit change-theme: {:?}", e);
                                }
                            }
                        }
                        "theme_dark" => {
                            println!("Theme dark clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("change-theme", "dark") {
                                    println!("Failed to emit change-theme: {:?}", e);
                                }
                            }
                        }
                        "theme_light" => {
                            println!("Theme light clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("change-theme", "light") {
                                    println!("Failed to emit change-theme: {:?}", e);
                                }
                            }
                        }
                        "theme_dynamic" => {
                            println!("Theme dynamic clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("change-theme", "dynamic") {
                                    println!("Failed to emit change-theme: {:?}", e);
                                }
                            }
                        }
                        "theme_transparent" => {
                            println!("Theme transparent clicked");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.emit("change-theme", "transparent") {
                                    println!("Failed to emit change-theme: {:?}", e);
                                }
                            }
                        }
                        "customize_presets" => {
                            println!("Customize presets clicked");
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = open_preset_settings(app_handle).await {
                                    eprintln!("Failed to open preset settings: {}", e);
                                }
                            });
                        }
                        "quit" => {
                            println!("Quit clicked");
                            app.exit(0);
                        }
                        _ => {
                            println!("Unknown menu item: {}", event.id().as_ref());
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_default_position,
            set_window_position,
            get_window_position,
            register_shortcut,
            open_preset_settings,
            rebuild_tray_menu
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
