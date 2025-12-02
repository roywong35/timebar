# Timebar ⏱️

A sleek, minimalist timer application that lives on your Windows taskbar. Built with Tauri, TypeScript, and Rust.

![Timebar Preview](https://img.shields.io/badge/Tauri-2.x-blue?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square) ![Rust](https://img.shields.io/badge/Rust-Latest-orange?style=flat-square)

## ✨ Features

### 🎯 Core Functionality
- **Dual Timer Modes**:
  - **Countdown Timer**: Set a duration and count down to zero with audio notification
  - **Stopwatch**: Count up from zero indefinitely
- **Dynamic Time Display**: Shows MM:SS for times under 1 hour, HH:MM:SS for longer durations
- **Visual Progress Bar**: Animated gradient progress bar as background
- **Audio Notifications**: Pleasant 6-beep melodic sound when countdown completes

### 🎨 Themes & Appearance
- **8 Beautiful Themes**:
  - Ocean Blue
  - Forest Green
  - Sunset Purple
  - Fire Orange
  - Cherry Red
  - Dark Matter
  - Sky Light
  - **Dynamic Theme**: Changes color based on time remaining (10 color stages from green to red)
  - **Crystal Clear**: Ultra-minimalist transparent theme with outline-only text
- **Frameless Design**: Clean 400x48px window that blends with your taskbar
- **Transparent Background**: See through to your taskbar
- **Always-on-Top**: Stays visible above other windows

### ⚡ Quick Access
- **Customizable Presets**: Create unlimited quick-access timer presets
  - Default: 3 minutes, 5 minutes, 25 minutes (Pomodoro)
  - Add/edit/delete presets via settings window
  - Automatically displayed in system tray menu
- **Global Keyboard Shortcuts**:
  - `PageUp`: Start/Pause timer (works even when window is not focused)
  - `PageDown`: Reset timer
  - `End`: Show timer window (brings timer to front when taskbar covers it)
- **Custom Time Input**: Enter any time in HH:MM:SS format inline

### 🎛️ Smart UI
- **System Tray Integration**: 
  - Quick access to all presets
  - Switch between countdown/stopwatch modes
  - Theme selector
  - Settings
- **Auto-Positioning**: Perfectly centered at the bottom of your screen, overlaying the taskbar
- **Minimal Controls**: Start/pause and reset buttons (visible when needed)
- **Edit Mode**: Click custom time to enter MM:SS or HH:MM:SS format directly

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **Rust** (latest stable via [rustup](https://rustup.rs/))
- **npm** or **yarn**

### Installation

```bash
cd Timebar
npm install
```

### Development

```bash
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

The installer will be created at:
- **MSI Installer**: `src-tauri/target/release/bundle/msi/Timebar_0.1.0_x64_en-US.msi`
- **Portable EXE**: `src-tauri/target/release/Timebar.exe`

## 📖 Usage Guide

### Basic Controls

1. **Start/Pause**: Click the ▶️/⏸ button or press `PageUp`
2. **Reset**: Click the 🔄 button or press `PageDown`
3. **Show Timer**: Press `End` to bring timer window to front (useful when taskbar covers it)
4. **Custom Time**: Right-click tray → "Custom Time" → Enter HH:MM:SS format
5. **Switch Modes**: Right-click tray → "Switch Mode"

### Setting Up Presets

1. Right-click the system tray icon
2. Click "Customize Presets..."
3. Edit existing presets or click "+ Add New Preset"
4. Enter time in HH:MM:SS format (e.g., `01:30:00` for 1.5 hours)
5. Click "Save & Close"
6. Presets appear in tray menu as "1 - 3 minutes", "2 - 5 minutes", etc.

### Changing Themes

1. Right-click the system tray icon
2. Hover over "Themes"
3. Select your preferred theme
4. Try the **Dynamic** theme to see color change as time runs out!

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `PageUp` | Start/Pause timer (global - works anywhere) |
| `PageDown` | Reset timer (global - works anywhere) |
| `End` | Show timer window (global - brings timer to front) |
| `Enter` | Save when in custom time edit mode |
| `Escape` | Cancel when in custom time edit mode |

## 🎨 Theme Showcase

- **Ocean Blue**: Deep blue to royal blue gradient
- **Forest Green**: Dark emerald to lime gradient
- **Sunset Purple**: Purple/violet gradient
- **Fire Orange**: Red to orange to yellow gradient
- **Cherry Red**: Dark red to light red gradient
- **Dark Matter**: Almost black slate gradient (subtle and professional)
- **Sky Light**: Cyan to light blue gradient
- **Dynamic**: Automatically transitions through 10 colors:
  - 100-90%: Deep Green
  - 90-80%: Bright Green
  - 80-70%: Light Green
  - 70-60%: Yellow-Green
  - 60-50%: Yellow
  - 50-40%: Light Orange
  - 40-30%: Orange
  - 30-20%: Orange-Red
  - 20-10%: Red
  - 10-0%: Deep Red (Critical!)
- **Crystal Clear**: Transparent with thin outline text - ultra minimalist

## 🗂️ Project Structure

```
Timebar/
├── src/
│   ├── main.ts           # Main timer logic, state management, event handling
│   ├── settings.ts       # Preset customization window logic
│   ├── styles.css        # Main timer styling with theme support
│   └── settings.css      # Settings window styling
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs        # Rust backend: tray menu, window positioning, commands
│   │   └── main.rs       # Entry point
│   ├── capabilities/
│   │   └── default.json  # Permission configuration
│   ├── icons/            # Auto-generated app icons
│   └── tauri.conf.json   # Tauri configuration
├── index.html            # Main timer window
├── settings.html         # Preset customization window
└── vite.config.ts        # Multi-page Vite build config
```

## 🔧 Technical Details

### Tech Stack
- **Frontend**: TypeScript, HTML5, CSS3
- **Backend**: Rust (Tauri 2.x)
- **Build Tool**: Vite 6.x
- **UI Framework**: Vanilla (no framework - pure web tech)

### Tauri Plugins Used
- `tauri-plugin-store`: Persistent JSON-based settings storage
- `tauri-plugin-global-shortcut`: System-wide keyboard shortcuts
- `tauri-plugin-system-tray`: System tray icon and menu

### Key Features Implementation
- **Dynamic Tray Menu**: Menu rebuilds automatically when presets change
- **Transparent Window**: Uses Windows DWM for true transparency
- **Audio Synthesis**: Web Audio API for notification sounds
- **Inline Editing**: Custom time input without dialog boxes
- **Event-Driven**: Rust ↔ TypeScript communication via Tauri events

### Storage
Settings are stored as JSON at:
- **Windows**: `%APPDATA%/com.wroy1.timebar/settings.json`
- **macOS**: `~/Library/Application Support/com.wroy1.timebar/settings.json`
- **Linux**: `~/.config/com.wroy1.timebar/settings.json`

## 📦 Bundle Size

- **Installer**: ~3-5 MB
- **Installed Size**: ~8-10 MB
- **Memory Usage**: ~30-50 MB RAM

*(Compare to Electron: ~150 MB installer, ~200+ MB installed)*

## 🛠️ Development Tips

### Running in Dev Mode
```bash
npm run tauri dev
```
- Hot reload enabled for frontend changes
- Rust changes require restart
- Window appears in default position (not overlaying taskbar in dev mode)

### Building for Production
```bash
npm run tauri build
```
- Creates optimized release build
- Generates MSI installer and portable EXE
- Icons must be set before building (see below)

### Custom Icons
1. Place your 1024x1024 PNG icon as `app-icon.png` in the project root
2. Run: `npx @tauri-apps/cli icon`
3. All icon sizes will be auto-generated

## 🎯 Future Ideas

- [ ] Multiple timer slots
- [ ] Auto-restart intervals
- [ ] Timer history/statistics
- [ ] Custom notification sounds
- [ ] Pomodoro mode with auto-breaks
- [ ] Multi-monitor support
- [ ] Export/import presets

## 📝 License

MIT License - feel free to use and modify!

## 🙏 Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Amazing desktop framework
- [Vite](https://vitejs.dev/) - Lightning-fast build tool
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Rust](https://www.rust-lang.org/) - Safe, fast systems programming

---

Made with ⏱️ by a developer who needed a simple timer that doesn't take up screen space!
