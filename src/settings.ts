import { Store } from "@tauri-apps/plugin-store";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";

interface PresetTime {
  seconds: number;
  label: string;
}

interface Settings {
  presets: PresetTime[];
  theme?: string;
  barColor?: string;
  backgroundColor?: string;
  textColor?: string;
  startPauseKey?: string;
  resetKey?: string;
}

let store: Store;
let presets: PresetTime[] = [];

// Default presets (3 minutes, 5 minutes, 25 minutes)
const DEFAULT_PRESETS: PresetTime[] = [
  { seconds: 180, label: "3 minutes" },
  { seconds: 300, label: "5 minutes" },
  { seconds: 1500, label: "25 minutes (Pomodoro)" },
];

// Initialize
async function init() {
  try {
    store = await Store.load("settings.json");
    await loadPresets();
    renderPresets();
    setupEventListeners();
  } catch (error) {
    console.error("Failed to initialize settings:", error);
  }
}

// Load presets from store
async function loadPresets() {
  try {
    const settings = await store.get<Settings>("settings");
    presets = settings?.presets || DEFAULT_PRESETS;
    console.log("Loaded presets:", presets);
  } catch (error) {
    console.error("Failed to load presets:", error);
    presets = DEFAULT_PRESETS;
  }
}

// Render presets list
function renderPresets() {
  const container = document.getElementById("presets-list");
  if (!container) return;

  container.innerHTML = "";

  if (presets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No presets yet. Click "Add New Preset" to create one!</p>
      </div>
    `;
    return;
  }

  presets.forEach((preset, index) => {
    const presetItem = createPresetItem(preset, index);
    container.appendChild(presetItem);
  });
}

// Create a preset item element
function createPresetItem(preset: PresetTime, index: number): HTMLElement {
  const div = document.createElement("div");
  div.className = "preset-item";
  div.dataset.index = index.toString();

  div.innerHTML = `
    <div>
      <div class="preset-label">Preset ${index + 1}</div>
      <input 
        type="text" 
        class="preset-input" 
        value="${formatSecondsToHHMMSS(preset.seconds)}"
        placeholder="HH:MM:SS"
        maxlength="8"
        data-index="${index}"
      >
    </div>
    <button class="delete-btn" data-index="${index}" title="Delete this preset">🗑️</button>
  `;

  // Add event listeners
  const input = div.querySelector(".preset-input") as HTMLInputElement;
  const deleteBtn = div.querySelector(".delete-btn") as HTMLButtonElement;

  input.addEventListener("blur", () => validateInput(input));
  input.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    target.value = target.value.replace(/[^0-9:]/g, "");
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") savePresets();
    else if (e.key === "Escape") closeWindow();
  });

  deleteBtn.addEventListener("click", () => deletePreset(index));

  return div;
}

// Add new preset
function addPreset() {
  // Add a default 10-minute preset
  presets.push({
    seconds: 600,
    label: "10 min",
  });
  renderPresets();
  
  // Focus the new input
  setTimeout(() => {
    const inputs = document.querySelectorAll(".preset-input");
    const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
    if (lastInput) {
      lastInput.focus();
      lastInput.select();
    }
  }, 50);
}

// Delete preset
function deletePreset(index: number) {
  if (presets.length === 1) {
    alert("You must have at least one preset!");
    return;
  }

  if (confirm(`Delete preset "${presets[index].label}"?`)) {
    presets.splice(index, 1);
    renderPresets();
  }
}

// Format seconds to HH:MM:SS
function formatSecondsToHHMMSS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Parse HH:MM:SS to seconds
function parseHHMMSS(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);

  if (minutes >= 60 || seconds >= 60 || hours < 0 || minutes < 0 || seconds < 0) {
    return null;
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return totalSeconds === 0 ? null : totalSeconds;
}

// Generate label from seconds
function generateLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  
  if (hours > 0) {
    parts.push(hours === 1 ? "1 hour" : `${hours} hours`);
  }
  
  if (minutes > 0) {
    parts.push(minutes === 1 ? "1 minute" : `${minutes} minutes`);
  }
  
  if (secs > 0 || parts.length === 0) {
    parts.push(secs === 1 ? "1 second" : `${secs} seconds`);
  }

  return parts.join(", ");
}

// Setup event listeners
function setupEventListeners() {
  // Save button
  document.getElementById("save-btn")?.addEventListener("click", savePresets);

  // Cancel button
  document.getElementById("cancel-btn")?.addEventListener("click", closeWindow);

  // Add preset button
  document.getElementById("add-preset-btn")?.addEventListener("click", addPreset);
}

// Validate input field
function validateInput(input: HTMLInputElement): boolean {
  const value = input.value.trim();
  
  if (!value) {
    input.classList.add("error");
    input.classList.remove("success");
    return false;
  }

  const seconds = parseHHMMSS(value);
  if (seconds === null) {
    input.classList.add("error");
    input.classList.remove("success");
    return false;
  }

  input.classList.add("success");
  input.classList.remove("error");
  return true;
}

// Save presets
async function savePresets() {
  const inputs = document.querySelectorAll(".preset-input") as NodeListOf<HTMLInputElement>;
  const newPresets: PresetTime[] = [];
  let hasError = false;

  inputs.forEach((input) => {
    const value = input.value.trim();
    
    if (!value) {
      hasError = true;
      input.classList.add("error");
      return;
    }

    if (!validateInput(input)) {
      hasError = true;
      return;
    }

    const seconds = parseHHMMSS(value);
    if (seconds !== null) {
      newPresets.push({
        seconds,
        label: generateLabel(seconds),
      });
    }
  });

  if (hasError) {
    alert("Please fix invalid time formats before saving.");
    return;
  }

  if (newPresets.length === 0) {
    alert("Please add at least one preset time.");
    return;
  }

  try {
    // Get existing settings
    const existingSettings = await store.get<Settings>("settings");
    const settings: Settings = existingSettings || {
      presets: [],
      barColor: "",
      backgroundColor: "",
      textColor: "",
      startPauseKey: "PageUp",
      resetKey: "PageDown",
    };
    
    // Update presets
    settings.presets = newPresets;
    
    // Save to store
    await store.set("settings", settings);
    await store.save();

    console.log("Presets saved:", newPresets);

    // Emit event to rebuild tray menu
    await emit("presets-updated", newPresets);

    // Close window
    closeWindow();
  } catch (error) {
    console.error("Failed to save presets:", error);
    alert("Failed to save presets. Please try again.");
  }
}

// Close window
async function closeWindow() {
  try {
    const window = getCurrentWindow();
    await window.close();
  } catch (error) {
    console.error("Failed to close window:", error);
  }
}

// Start initialization when DOM is ready
document.addEventListener("DOMContentLoaded", init);
