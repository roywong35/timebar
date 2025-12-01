# Timebar - Toolbar Timer App

A sleek, frameless timer application that sits above your Windows taskbar. Built with Tauri, TypeScript, and Rust.

## Features

- **Frameless Design**: Minimalist, wide rectangular window (400x60px)
- **Always-on-Top**: Stays visible while you work
- **Auto-Positioning**: Automatically positions itself above the Windows taskbar
- **Dual Timer Modes**:
  - **Countdown Timer**: Set a duration and count down to zero
  - **Stopwatch**: Count up from zero
- **Visual Progress Bar**: Animated progress bar as background with time overlaid on top
- **Quick Time Controls**: 
  - +1s button: Add 1 second
  - +1m button: Add 1 minute
  - +10m button: Add 10 minutes
- **Keyboard Shortcuts**:
  - `Space`: Start/Pause timer
  - `R`: Reset timer
- **System Tray**: Access settings and controls from the system tray
- **Customizable Colors**: Configure bar color, background, and text (saved in settings)
- **Position Memory**: Remembers last position across app restarts
- **Draggable**: Click and drag anywhere to reposition

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Rust (latest stable)
- npm or yarn

### Installation

```bash
cd Timebar
npm install
```

### Development

```bash
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## Usage

1. **Starting the Timer**: Press `Space` or click the timer to start
2. **Pausing**: Press `Space` again to pause
3. **Resetting**: Press `R` to reset the timer
4. **Adding Time**: Hover over the timer to reveal control buttons (+1s, +1m, +10m)
5. **Switching Modes**: Click the ⏱/⏲ button to toggle between countdown and stopwatch
6. **Moving**: Click and drag anywhere on the timer to reposition it
7. **Settings**: Right-click the system tray icon to access settings

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start/Pause timer |
| `R` | Reset timer |

## Customization

Settings are stored in `settings.json` and include:
- Bar color (progress bar gradient)
- Background color
- Text color
- Last window position
- Keyboard shortcuts (configurable)

## Technical Details

- **Frontend**: Vanilla TypeScript, HTML, CSS
- **Backend**: Rust with Tauri 2.x
- **Plugins Used**:
  - `tauri-plugin-store`: Settings persistence
  - `tauri-plugin-global-shortcut`: Global keyboard shortcuts
  - System tray integration

## Architecture

- `src/main.ts`: Timer logic, UI controls, and state management
- `src/styles.css`: Modern styling with animations
- `index.html`: Minimal HTML structure
- `src-tauri/src/lib.rs`: Rust backend for window positioning, system tray, and settings
- `src-tauri/tauri.conf.json`: Tauri configuration (frameless, transparent, always-on-top)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
