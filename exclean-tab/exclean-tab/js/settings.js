const STORAGE_KEY = 'settings';

export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'default',
  scheme: 'system',
  mark: { mode: 'daily', id: null },
  shortcuts: { visible: true, items: [] },
  bookmarks: { visible: true },
  focusSearch: false,
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeDefaults(defaults, stored) {
  if (!isPlainObject(stored)) {
    return structuredClone(defaults);
  }
  const result = {};
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const storedValue = stored[key];
    if (isPlainObject(defaultValue)) {
      result[key] = mergeDefaults(defaultValue, storedValue);
    } else if (storedValue === undefined) {
      result[key] = structuredClone(defaultValue);
    } else {
      result[key] = storedValue;
    }
  }
  return result;
}

export async function loadSettings() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  return mergeDefaults(DEFAULT_SETTINGS, stored[STORAGE_KEY]);
}

export function saveSettings(settings) {
  return chrome.storage.sync.set({ [STORAGE_KEY]: settings });
}

export function onSettingsChanged(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEY]) {
      callback(mergeDefaults(DEFAULT_SETTINGS, changes[STORAGE_KEY].newValue));
    }
  });
}
