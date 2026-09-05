/*
 * Applies the last used theme before the first paint. Runs as a classic
 * script in <head> because chrome.storage is asynchronous and would leave a
 * frame rendered in the default colors on every new tab.
 */
(() => {
  const CACHE_KEY = 'themeCache';
  const VARIABLE_PATTERN = /^--[a-z-]+$/;
  const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (!cached || typeof cached.variables !== 'object') {
      return;
    }
    const root = document.documentElement;
    for (const [name, value] of Object.entries(cached.variables)) {
      if (VARIABLE_PATTERN.test(name) && COLOR_PATTERN.test(value)) {
        root.style.setProperty(name, value);
      }
    }
    if (cached.colorScheme === 'light' || cached.colorScheme === 'dark') {
      root.style.colorScheme = cached.colorScheme;
      root.dataset.scheme = cached.colorScheme;
    }
  } catch {
    // A corrupt cache only costs the pre-paint theme; main.js re-applies it.
  }
})();
