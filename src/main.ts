import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import { register, isRegistered } from "@tauri-apps/plugin-global-shortcut";

// Timer state
enum TimerMode {
  COUNTDOWN = "countdown",
  STOPWATCH = "stopwatch"
}

interface TimerState {
  mode: TimerMode;
  isRunning: boolean;
  currentTime: number; // in seconds
  totalTime: number; // for countdown mode
  isEditMode: boolean; // for custom time input
}

interface PresetTime {
  seconds: number;
  label: string;
}

interface Settings {
  barColor: string;
  backgroundColor: string;
  textColor: string;
  position?: { x: number; y: number };
  startPauseKey: string;
  resetKey: string;
  theme?: string; // Theme name
  presets?: PresetTime[]; // Custom preset times
}

// Theme definitions
interface Theme {
  name: string;
  barColor: string;
  backgroundColor: string;
  textColor: string;
}

const themes: Record<string, Theme> = {
  blue: {
    name: "Ocean Blue",
    barColor: "linear-gradient(90deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%)",
    backgroundColor: "transparent",
    textColor: "#ffffff",
  },
  green: {
    name: "Forest Green",
    barColor: "linear-gradient(90deg, #134e4a 0%, #16a34a 50%, #84cc16 100%)",
    backgroundColor: "transparent",
    textColor: "#ffffff",
  },
  purple: {
    name: "Sunset Purple",
    barColor: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
    backgroundColor: "transparent",
    textColor: "#ffffff",
  },
  orange: {
    name: "Fire Orange",
    barColor: "linear-gradient(90deg, #dc2626 0%, #f97316 50%, #fbbf24 100%)",
    backgroundColor: "transparent",
    textColor: "#ffffff",
  },
  red: {
    name: "Cherry Red",
    barColor: "linear-gradient(90deg, #7f1d1d 0%, #dc2626 50%, #f87171 100%)",
    backgroundColor: "transparent",
    textColor: "#ffffff",
  },
  dark: {
    name: "Dark Matter",
    barColor: "linear-gradient(90deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
    backgroundColor: "transparent",
    textColor: "#e2e8f0",
  },
  light: {
    name: "Sky Light",
    barColor: "linear-gradient(90deg, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)",
    backgroundColor: "transparent",
    textColor: "#ffffff",
  },
  dynamic: {
    name: "Dynamic (10 Colors)",
    barColor: "dynamic",
    backgroundColor: "transparent",
    textColor: "#ffffff",
  },
  transparent: {
    name: "Crystal Clear",
    barColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "transparent",
    textColor: "#ffffff",
  },
};

const state: TimerState = {
  mode: TimerMode.COUNTDOWN,
  isRunning: false,
  currentTime: 180, // default 3 minutes
  totalTime: 180, // default 3 minutes
  isEditMode: false,
};

let intervalId: number | null = null;
let store: Store;

// DOM elements (will be initialized after DOMContentLoaded)
let timerContainer: HTMLElement;
let progressBar: HTMLElement;
let timerDisplay: HTMLElement;
let startPauseBtn: HTMLButtonElement;
let resetBtn: HTMLButtonElement;

// Initialize app
async function init() {
  console.log("Init started");
  
  // Initialize DOM elements
  timerContainer = document.getElementById("timer-container")!;
  progressBar = document.getElementById("progress-bar")!;
  timerDisplay = document.getElementById("timer-display")!;
  startPauseBtn = document.getElementById("start-pause") as HTMLButtonElement;
  resetBtn = document.getElementById("reset") as HTMLButtonElement;
  
  console.log("DOM elements found:", {
    timerContainer: !!timerContainer,
    startPauseBtn: !!startPauseBtn,
    resetBtn: !!resetBtn
  });
  
  // Setup event listeners FIRST
  setupEventListeners();
  console.log("Event listeners set up");
  
  // Setup tray event listeners immediately (before async operations that might fail)
  console.log("Setting up tray event listeners...");
  
  listen("open-settings", () => {
    console.log("Received open-settings event (Custom Time)");
    enterEditMode();
    showTimerWindow();
  });
  
  listen("set-time", (event: any) => {
    console.log("Received set-time event:", event.payload);
    setTime(event.payload as number);
  });
  
  listen("preset-selected", async (event: any) => {
    console.log("Received preset-selected event:", event.payload);
    const presetIndex = event.payload as number;
    
    try {
      const settings = await store.get<Settings>("settings");
      const presets = settings?.presets || [
        { seconds: 180, label: "3 minutes" },
        { seconds: 300, label: "5 minutes" },
        { seconds: 1500, label: "25 minutes" },
      ];
      
      if (presetIndex >= 0 && presetIndex < presets.length) {
        console.log("Setting time to preset:", presets[presetIndex]);
        setTime(presets[presetIndex].seconds);
      } else {
        console.error("Invalid preset index:", presetIndex);
      }
    } catch (error) {
      console.error("Failed to load preset:", error);
      // Fallback to hardcoded defaults
      const defaults = [180, 300, 1500];
      if (presetIndex >= 0 && presetIndex < defaults.length) {
        setTime(defaults[presetIndex]);
      }
    }
  });
  
  listen("toggle-mode", () => {
    console.log("Received toggle-mode event");
    toggleMode();
  });
  
  listen("change-theme", (event: any) => {
    console.log("Received change-theme event:", event.payload);
    applyTheme(event.payload as string);
  });
  
  listen("presets-updated", async (event: any) => {
    console.log("Received presets-updated event:", event.payload);
    const presets = event.payload as PresetTime[];
    
    try {
      // Rebuild tray menu with new presets
      await invoke("rebuild_tray_menu", { presets });
      console.log("Tray menu rebuilt with new presets");
    } catch (error) {
      console.error("Failed to rebuild tray menu:", error);
    }
  });
  
  console.log("Tray event listeners set up");
  
  try {
    store = await Store.load("settings.json");
    console.log("Store loaded");
    
    // Load settings
    await loadSettings();
    
    // Register global shortcuts
    await registerShortcuts();
    console.log("Shortcuts registered");
    
    // Update display
    updateDisplay();
    
    // Set initial position
    await positionWindow();
    
    console.log("Init completed");
  } catch (error) {
    console.error("Init error:", error);
  }
}

// Position window above taskbar (always use default - center of taskbar)
async function positionWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const window = getCurrentWindow();
  
  try {
    const defaultPos = await invoke<{ x: number; y: number }>("get_default_position");
    console.log("Positioning window at:", defaultPos);
    await invoke("set_window_position", {
      x: defaultPos.x,
      y: defaultPos.y,
    });
    console.log("Position set successfully");
  } catch (error) {
    console.error("Error positioning window:", error);
  }
  
  // Always show window, even if positioning failed
  try {
    await window.show();
    console.log("Window shown");
  } catch (error) {
    console.error("Error showing window:", error);
  }
}

// Apply theme
function applyTheme(themeName: string) {
  const theme = themes[themeName];
  if (!theme) {
    console.error("Theme not found:", themeName);
    return;
  }
  
  console.log("Applying theme:", theme.name);
  document.documentElement.style.setProperty("--bar-color", theme.barColor);
  document.documentElement.style.setProperty("--background-color", theme.backgroundColor);
  document.documentElement.style.setProperty("--text-color", theme.textColor);
  
  // Add/remove theme class for special styling
  const timerContainer = document.getElementById("timer-container");
  if (timerContainer) {
    // Remove all theme classes first
    timerContainer.classList.remove("theme-transparent");
    
    // Add specific theme class if needed
    if (themeName === "transparent") {
      timerContainer.classList.add("theme-transparent");
    }
  }
  
  // Save theme to settings
  store.set("settings", {
    theme: themeName,
    barColor: theme.barColor,
    backgroundColor: theme.backgroundColor,
    textColor: theme.textColor,
    startPauseKey: "PageUp",
    resetKey: "PageDown",
  });
  store.save();
  
  // Show and focus the timer window to see the theme change
  showTimerWindow();
}

// Load settings
async function loadSettings() {
  try {
    const settings = await store.get<Settings>("settings");
    if (settings) {
      // If theme is specified, apply it
      if (settings.theme && themes[settings.theme]) {
        applyTheme(settings.theme);
      } else {
        // Apply individual colors if no theme (legacy support)
        if (settings.barColor) {
          document.documentElement.style.setProperty("--bar-color", settings.barColor);
        }
        if (settings.backgroundColor) {
          document.documentElement.style.setProperty("--background-color", settings.backgroundColor);
        }
        if (settings.textColor) {
          document.documentElement.style.setProperty("--text-color", settings.textColor);
        }
      }
      
      // Load presets and rebuild tray menu
      const presets = settings.presets || [
        { seconds: 180, label: "3 minutes" },
        { seconds: 300, label: "5 minutes" },
        { seconds: 1500, label: "25 minutes (Pomodoro)" },
      ];
      await invoke("rebuild_tray_menu", { presets });
    } else {
      // No settings, apply default theme
      applyTheme("blue");
      
      // Use default presets
      const defaultPresets = [
        { seconds: 180, label: "3 minutes" },
        { seconds: 300, label: "5 minutes" },
        { seconds: 1500, label: "25 minutes (Pomodoro)" },
      ];
      await invoke("rebuild_tray_menu", { presets: defaultPresets });
    }
  } catch (error) {
    console.error("Error loading settings:", error);
    applyTheme("blue"); // Fallback to default theme
  }
}

// Register keyboard shortcuts (both global and local)
async function registerShortcuts() {
  try {
    console.log("Attempting to register global shortcuts...");
    
    // Check and register PageUp for start/pause
    try {
      const pageUpRegistered = await isRegistered("PageUp");
      console.log("PageUp already registered?", pageUpRegistered);
      
      if (!pageUpRegistered) {
        await register("PageUp", (event) => {
          console.log("PageUp GLOBAL shortcut triggered!", event);
          // Only trigger on key press, not release
          if (event.state === "Pressed") {
            toggleTimer();
          }
        });
        console.log("✓ PageUp global shortcut registered successfully");
        
        // Verify it was registered
        const verifyPageUp = await isRegistered("PageUp");
        console.log("PageUp registration verified:", verifyPageUp);
      } else {
        console.log("PageUp already registered (skipping)");
      }
    } catch (err) {
      console.error("Failed to register PageUp:", err);
    }
    
    // Check and register PageDown for reset
    try {
      const pageDownRegistered = await isRegistered("PageDown");
      console.log("PageDown already registered?", pageDownRegistered);
      
      if (!pageDownRegistered) {
        await register("PageDown", (event) => {
          console.log("PageDown GLOBAL shortcut triggered!", event);
          // Only trigger on key press, not release
          if (event.state === "Pressed") {
            resetTimer();
          }
        });
        console.log("✓ PageDown global shortcut registered successfully");
        
        // Verify it was registered
        const verifyPageDown = await isRegistered("PageDown");
        console.log("PageDown registration verified:", verifyPageDown);
      } else {
        console.log("PageDown already registered (skipping)");
      }
    } catch (err) {
      console.error("Failed to register PageDown:", err);
    }
    
    // Check and register End for show timer
    try {
      const endRegistered = await isRegistered("End");
      console.log("End already registered?", endRegistered);
      
      if (!endRegistered) {
        await register("End", (event) => {
          console.log("End GLOBAL shortcut triggered!", event);
          // Only trigger on key press, not release
          if (event.state === "Pressed") {
            showTimerWindow();
          }
        });
        console.log("✓ End global shortcut registered successfully");
        
        // Verify it was registered
        const verifyEnd = await isRegistered("End");
        console.log("End registration verified:", verifyEnd);
      } else {
        console.log("End already registered (skipping)");
      }
    } catch (err) {
      console.error("Failed to register End:", err);
    }
    
    console.log("Global shortcuts setup complete");
  } catch (error) {
    console.error("Error in registerShortcuts:", error);
    console.log("Will use local keyboard events as fallback");
  }
}

// Setup event listeners
function setupEventListeners() {
  console.log("Setting up event listeners...");
  
  // Start/Pause button
  startPauseBtn.addEventListener("click", (e) => {
    console.log("Start/Pause button clicked");
    e.stopPropagation();
    toggleTimer();
  });
  
  // Reset button
  resetBtn.addEventListener("click", (e) => {
    console.log("Reset button clicked");
    e.stopPropagation();
    resetTimer();
  });
  
  // Keyboard shortcuts (local)
  document.addEventListener("keydown", (e) => {
    console.log("Key pressed:", e.code, "key:", e.key);
    if (e.code === "PageUp") {
      e.preventDefault();
      console.log("PageUp pressed - toggling timer");
      toggleTimer();
    } else if (e.code === "PageDown") {
      e.preventDefault();
      console.log("PageDown pressed - resetting timer");
      resetTimer();
    } else if (e.code === "End") {
      e.preventDefault();
      console.log("End pressed - showing timer window");
      showTimerWindow();
    }
  });
  
  // Add focus debugging
  window.addEventListener("focus", () => {
    console.log("Window gained focus");
  });
  
  window.addEventListener("blur", () => {
    console.log("Window lost focus");
  });
  
  console.log("Event listeners attached");
}

// Toggle timer mode (will be called from context menu later)
function toggleMode() {
  // Exit edit mode if active
  if (state.isEditMode) {
    exitEditMode(false); // Don't save, just exit
  }
  
  stopTimer();
  state.mode = state.mode === TimerMode.COUNTDOWN ? TimerMode.STOPWATCH : TimerMode.COUNTDOWN;
  state.currentTime = state.mode === TimerMode.COUNTDOWN ? state.totalTime : 0;
  updateDisplay();
}

// Toggle timer start/pause
function toggleTimer() {
  console.log("toggleTimer() called, isRunning:", state.isRunning);
  if (state.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

// Start timer
function startTimer() {
  console.log("startTimer() called, isRunning:", state.isRunning);
  if (state.isRunning) return;
  
  state.isRunning = true;
  timerContainer.classList.add("timer-running");
  startPauseBtn.textContent = "⏸";
  startPauseBtn.title = "Pause (PageUp)";
  
  console.log("Starting interval, currentTime:", state.currentTime, "mode:", state.mode);
  
  intervalId = window.setInterval(() => {
    if (state.mode === TimerMode.COUNTDOWN) {
      state.currentTime = Math.max(0, state.currentTime - 1);
      if (state.currentTime === 0) {
        onTimerComplete();
      }
    } else {
      state.currentTime++;
    }
    updateDisplay();
  }, 1000);
  
  console.log("Timer started, intervalId:", intervalId);
}

// Pause timer
function pauseTimer() {
  if (!state.isRunning) return;
  
  state.isRunning = false;
  timerContainer.classList.remove("timer-running");
  startPauseBtn.textContent = "▶";
  startPauseBtn.title = "Start (PageUp)";
  
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// Stop timer
function stopTimer() {
  pauseTimer();
}

// Reset timer
function resetTimer() {
  stopTimer();
  timerContainer.classList.remove("timer-complete");
  state.currentTime = state.mode === TimerMode.COUNTDOWN ? state.totalTime : 0;
  updateDisplay();
}

// Parse time input in MM:SS format
function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  
  // Try HH:MM:SS format first
  let match = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    
    // Validate ranges
    if (minutes >= 60 || seconds >= 60) {
      console.error("Minutes and seconds must be less than 60");
      return null;
    }
    
    if (hours < 0 || minutes < 0 || seconds < 0) {
      console.error("Time values cannot be negative");
      return null;
    }
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    if (totalSeconds === 0) {
      console.error("Total time cannot be zero");
      return null;
    }
    
    return totalSeconds;
  }
  
  // Try MM:SS format (backward compatible)
  match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    
    // Validate ranges
    if (seconds >= 60) {
      console.error("Seconds must be less than 60");
      return null;
    }
    
    if (minutes < 0 || seconds < 0) {
      console.error("Time values cannot be negative");
      return null;
    }
    
    const totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds === 0) {
      console.error("Total time cannot be zero");
      return null;
    }
    
    return totalSeconds;
  }
  
  console.error("Invalid time format. Expected MM:SS or HH:MM:SS (e.g., 05:30 or 01:30:00)");
  return null;
}

// Enter edit mode for custom time input
function enterEditMode() {
  console.log("Entering edit mode");
  
  // Stop timer if running
  if (state.isRunning) {
    pauseTimer();
  }
  
  state.isEditMode = true;
  
  // Hide the timer display div
  timerDisplay.style.display = "none";
  
  // Create input element
  const input = document.createElement("input");
  input.type = "text";
  input.id = "time-input";
  input.className = "time-input";
  
  // Pre-fill with current time always in HH:MM:SS format for consistency
  const hours = Math.floor(state.currentTime / 3600);
  const minutes = Math.floor((state.currentTime % 3600) / 60);
  const seconds = state.currentTime % 60;
  
  input.value = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  
  // Insert input in place of timer display
  timerDisplay.parentElement!.insertBefore(input, timerDisplay);
  
  // Focus and select all text
  input.focus();
  input.select();
  
  // Add container class for styling
  timerContainer.classList.add("edit-mode");
  
  // Handle keyboard events
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      exitEditMode(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      exitEditMode(false);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      // Don't prevent default - let global shortcuts handle it
      // But exit edit mode first so shortcuts work properly
      e.preventDefault();
      exitEditMode(false);
      // Let the shortcut handlers run after a tiny delay
      setTimeout(() => {
        if (e.key === "PageUp") {
          toggleTimer();
        } else if (e.key === "PageDown") {
          resetTimer();
        }
      }, 10);
    }
  });
  
  // Input validation: only allow digits and colon
  input.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    target.value = target.value.replace(/[^0-9:]/g, "");
  });
  
  console.log("Edit mode active, input focused");
}

// Exit edit mode
function exitEditMode(save: boolean) {
  console.log("Exiting edit mode, save:", save);
  
  const input = document.getElementById("time-input") as HTMLInputElement;
  
  if (save && input) {
    const inputValue = input.value;
    const parsedTime = parseTimeInput(inputValue);
    
    if (parsedTime !== null) {
      // Valid time, update state
      state.currentTime = parsedTime;
      state.totalTime = parsedTime;
      console.log(`Time set to ${parsedTime} seconds`);
    } else {
      console.error("Invalid time input, discarding changes");
    }
  }
  
  // Remove input element
  if (input) {
    input.remove();
  }
  
  // Show timer display again
  timerDisplay.style.display = "";
  
  // Remove edit mode class
  timerContainer.classList.remove("edit-mode");
  
  state.isEditMode = false;
  
  // Update display with new or unchanged time
  updateDisplay();
  
  console.log("Edit mode exited");
}

// Play notification sound
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant beep tone
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // Fade in and out for smooth sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + startTime + duration);
      
      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    };
    
    // Play 6 pleasant beeps in a melodic pattern (like a notification ringtone)
    // Pattern: C-E-G-C-E-G (major chord ascending twice)
    const beepDuration = 0.20;
    const beepGap = 0.01;
    
    playTone(523.25, 0, beepDuration);                                    // C5 - beep 1
    playTone(659.25, beepDuration + beepGap, beepDuration);               // E5 - beep 2
    playTone(783.99, (beepDuration + beepGap) * 2, beepDuration);        // G5 - beep 3
    playTone(523.25, (beepDuration + beepGap) * 3, beepDuration);        // C5 - beep 4
    playTone(659.25, (beepDuration + beepGap) * 4, beepDuration);        // E5 - beep 5
    playTone(783.99, (beepDuration + beepGap) * 5, beepDuration * 1.5); // G5 - beep 6 (longer)
    
    console.log("Notification sound played (6 beeps)");
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
}

// Timer complete handler
function onTimerComplete() {
  stopTimer();
  playNotificationSound();
  timerContainer.classList.add("timer-complete");
  
  // Flash the window or play a sound here if desired
  setTimeout(() => {
    timerContainer.classList.remove("timer-complete");
  }, 3000);
}

// Update display
function updateDisplay() {
  // Update time display
  const hours = Math.floor(state.currentTime / 3600);
  const minutes = Math.floor((state.currentTime % 3600) / 60);
  const seconds = state.currentTime % 60;
  
  // Show HH:MM:SS if >= 1 hour, otherwise MM:SS
  if (hours > 0) {
    timerDisplay.textContent = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  
  // Update progress bar
  if (state.mode === TimerMode.COUNTDOWN) {
    const progress = state.totalTime > 0 ? state.currentTime / state.totalTime : 0;
    progressBar.style.transform = `scaleX(${progress})`;
    
    // Update dynamic color if using dynamic theme
    updateDynamicColor(progress);
  } else {
    // For stopwatch, show full bar
    progressBar.style.transform = `scaleX(1)`;
  }
}

// Update dynamic color based on progress
async function updateDynamicColor(progress: number) {
  try {
    const settings = await store.get<Settings>("settings");
    if (settings?.theme === "dynamic") {
      let gradient: string;
      
      // 10 color stages for smooth transitions
      if (progress > 0.9) {
        // 100-90%: Deep Green
        gradient = "linear-gradient(90deg, #065f46 0%, #10b981 100%)";
      } else if (progress > 0.8) {
        // 90-80%: Bright Green
        gradient = "linear-gradient(90deg, #16a34a 0%, #4ade80 100%)";
      } else if (progress > 0.7) {
        // 80-70%: Light Green
        gradient = "linear-gradient(90deg, #22c55e 0%, #86efac 100%)";
      } else if (progress > 0.6) {
        // 70-60%: Yellow-Green
        gradient = "linear-gradient(90deg, #65a30d 0%, #a3e635 100%)";
      } else if (progress > 0.5) {
        // 60-50%: Yellow
        gradient = "linear-gradient(90deg, #ca8a04 0%, #fbbf24 100%)";
      } else if (progress > 0.4) {
        // 50-40%: Light Orange
        gradient = "linear-gradient(90deg, #ea580c 0%, #fb923c 100%)";
      } else if (progress > 0.3) {
        // 40-30%: Orange
        gradient = "linear-gradient(90deg, #dc2626 0%, #f97316 100%)";
      } else if (progress > 0.2) {
        // 30-20%: Orange-Red
        gradient = "linear-gradient(90deg, #b91c1c 0%, #ef4444 100%)";
      } else if (progress > 0.1) {
        // 20-10%: Red
        gradient = "linear-gradient(90deg, #991b1b 0%, #dc2626 100%)";
      } else {
        // 10-0%: Deep Red (Critical!)
        gradient = "linear-gradient(90deg, #7f1d1d 0%, #b91c1c 100%)";
      }
      
      document.documentElement.style.setProperty("--bar-color", gradient);
    }
  } catch (error) {
    // Silently fail if store is not ready
  }
}

// Set timer to specific time (in seconds)
function setTime(seconds: number) {
  console.log("Setting timer to", seconds, "seconds");
  
  // Exit edit mode if active
  if (state.isEditMode) {
    exitEditMode(false); // Don't save, just exit
  }
  
  stopTimer();
  state.currentTime = seconds;
  state.totalTime = seconds;
  updateDisplay();
  
  // Show the timer window after setting time
  showTimerWindow();
}

// Show timer window
async function showTimerWindow() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const window = getCurrentWindow();
    await window.show();
    await window.unminimize(); // Ensure it's not minimized
    await window.setFocus();
    await window.setAlwaysOnTop(true); // Re-assert always on top
    console.log("Timer window shown and focused");
  } catch (error) {
    console.error("Error showing timer window:", error);
  }
}

// Initialize when DOM is loaded
window.addEventListener("DOMContentLoaded", init);
