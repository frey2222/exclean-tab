import { loadSettings, saveSettings, onSettingsChanged } from './settings.js';
import { THEMES, applyTheme, getThemeTokens, onSystemSchemeChange } from './themes.js';
import { MARKS, resolveMark } from './marks.js';
import { localizeDocument, t } from './i18n.js';
import { renderShortcuts, normalizeUrl, createShortcutId } from './shortcuts.js';
import { BookmarkBar } from './bookmarks.js';

const SEARCH_URL = 'https://www.google.com/search';

const ui = {
  mark: document.getElementById('mark'),
  searchInput: document.getElementById('search-input'),
  shortcuts: document.getElementById('shortcuts'),
  shortcutList: document.getElementById('shortcut-list'),
  shortcutTemplate: document.getElementById('shortcut-template'),
  customizeButton: document.getElementById('customize-button'),
  panel: document.getElementById('panel'),
  panelClose: document.getElementById('panel-close'),
  themeGrid: document.getElementById('theme-grid'),
  schemeInputs: document.querySelectorAll('input[name="scheme"]'),
  markGrid: document.getElementById('mark-grid'),
  markModeInputs: document.querySelectorAll('input[name="mark-mode"]'),
  shortcutsVisible: document.getElementById('shortcuts-visible'),
  bookmarksVisible: document.getElementById('bookmarks-visible'),
  focusSearch: document.getElementById('focus-search'),
  dialog: document.getElementById('shortcut-dialog'),
  dialogTitle: document.getElementById('shortcut-dialog-title'),
  dialogForm: document.getElementById('shortcut-form'),
  dialogName: document.getElementById('shortcut-name'),
  dialogUrl: document.getElementById('shortcut-url'),
  dialogUrlError: document.getElementById('shortcut-url-error'),
  dialogRemove: document.getElementById('shortcut-remove'),
  dialogCancel: document.getElementById('shortcut-cancel'),
};

let settings;
let editingShortcutId = null;

const bookmarkBar = new BookmarkBar({
  bar: document.getElementById('bookmark-bar'),
  items: document.getElementById('bookmark-items'),
  overflowButton: document.getElementById('bookmark-overflow'),
  divider: document.getElementById('bookmark-divider'),
  allButton: document.getElementById('bookmark-all'),
});

function persist() {
  saveSettings(settings).catch((error) => {
    console.error('Failed to save settings', error);
  });
}

function update(mutate) {
  mutate(settings);
  render();
  persist();
}

/* Rendering */

function render() {
  applyTheme(settings.theme, settings.scheme);
  renderMark();
  renderShortcutSection();
  renderBookmarkBar();
  renderPanelState();
}

async function renderBookmarkBar() {
  if (!settings.bookmarks.visible) {
    bookmarkBar.hide();
    return;
  }
  try {
    await bookmarkBar.show();
  } catch (error) {
    console.error('Failed to load bookmarks', error);
    bookmarkBar.hide();
  }
}

function renderMark() {
  const mark = resolveMark(settings.mark);
  ui.mark.hidden = mark === null;
  ui.mark.innerHTML = mark ? mark.svg : '';
}

function renderShortcutSection() {
  ui.shortcuts.hidden = !settings.shortcuts.visible;
  if (settings.shortcuts.visible) {
    renderShortcuts(ui.shortcutList, ui.shortcutTemplate, settings.shortcuts.items, {
      onAdd: () => openShortcutDialog(null),
      onEdit: (shortcut) => openShortcutDialog(shortcut),
    });
  }
}

function renderPanelState() {
  for (const chip of ui.themeGrid.children) {
    chip.setAttribute('aria-checked', String(chip.dataset.theme === settings.theme));
  }
  for (const input of ui.schemeInputs) {
    input.checked = input.value === settings.scheme;
  }
  for (const option of ui.markGrid.children) {
    const selected = settings.mark.mode === 'fixed' && option.dataset.mark === settings.mark.id;
    option.setAttribute('aria-checked', String(selected));
  }
  for (const input of ui.markModeInputs) {
    input.checked = input.value === settings.mark.mode;
  }
  ui.shortcutsVisible.checked = settings.shortcuts.visible;
  ui.bookmarksVisible.checked = settings.bookmarks.visible;
  ui.focusSearch.checked = settings.focusSearch;
}

function buildThemeGrid() {
  for (const theme of THEMES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'theme-chip';
    chip.dataset.theme = theme.id;
    chip.setAttribute('role', 'radio');
    chip.setAttribute('aria-label', t(theme.nameKey));
    chip.title = t(theme.nameKey);
    const tokens = getThemeTokens(theme.id, 'dark');
    chip.style.setProperty('--chip-background', tokens['--background']);
    chip.style.setProperty('--chip-accent', tokens['--accent']);
    chip.addEventListener('click', () => {
      update((current) => {
        current.theme = theme.id;
      });
    });
    ui.themeGrid.append(chip);
  }
}

function buildMarkGrid() {
  for (const mark of MARKS) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'mark-option';
    option.dataset.mark = mark.id;
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-label', t(mark.nameKey));
    option.title = t(mark.nameKey);
    option.innerHTML = mark.svg;
    option.addEventListener('click', () => {
      update((current) => {
        current.mark = { mode: 'fixed', id: mark.id };
      });
    });
    ui.markGrid.append(option);
  }
}

/* Search */

function submitSearch() {
  const query = ui.searchInput.value.trim();
  if (!query) {
    return;
  }
  const url = new URL(SEARCH_URL);
  url.searchParams.set('q', query);
  window.location.assign(url.href);
}

/* Panel */

function setPanelOpen(open) {
  ui.panel.hidden = !open;
  ui.customizeButton.setAttribute('aria-expanded', String(open));
  if (open) {
    ui.panelClose.focus();
  } else {
    ui.customizeButton.focus();
  }
}

/* Shortcut dialog */

function openShortcutDialog(shortcut) {
  editingShortcutId = shortcut ? shortcut.id : null;
  ui.dialogTitle.textContent = t(shortcut ? 'editShortcut' : 'addShortcut');
  ui.dialogName.value = shortcut ? shortcut.name : '';
  ui.dialogUrl.value = shortcut ? shortcut.url : '';
  ui.dialogRemove.hidden = !shortcut;
  setUrlError(false);
  ui.dialog.showModal();
  ui.dialogName.focus();
}

function setUrlError(visible) {
  ui.dialogUrlError.hidden = !visible;
  ui.dialogUrl.setAttribute('aria-invalid', String(visible));
}

function saveShortcutFromDialog() {
  const url = normalizeUrl(ui.dialogUrl.value);
  if (!url) {
    setUrlError(true);
    ui.dialogUrl.focus();
    return;
  }
  const name = ui.dialogName.value.trim() || new URL(url).hostname.replace(/^www\./, '');

  update((current) => {
    const items = current.shortcuts.items;
    const index = items.findIndex((item) => item.id === editingShortcutId);
    if (index === -1) {
      items.push({ id: createShortcutId(), name, url });
    } else {
      items[index] = { ...items[index], name, url };
    }
  });
  ui.dialog.close();
}

function removeShortcutFromDialog() {
  update((current) => {
    current.shortcuts.items = current.shortcuts.items.filter(
      (item) => item.id !== editingShortcutId,
    );
  });
  ui.dialog.close();
}

/* Event wiring */

function bindEvents() {
  ui.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      submitSearch();
    }
  });

  ui.customizeButton.addEventListener('click', () => setPanelOpen(ui.panel.hidden));
  ui.panelClose.addEventListener('click', () => setPanelOpen(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !ui.panel.hidden && !ui.dialog.open) {
      setPanelOpen(false);
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (ui.panel.hidden || ui.dialog.open) {
      return;
    }
    if (!ui.panel.contains(event.target) && !ui.customizeButton.contains(event.target)) {
      setPanelOpen(false);
    }
  });

  for (const input of ui.schemeInputs) {
    input.addEventListener('change', () => {
      update((current) => {
        current.scheme = input.value;
      });
    });
  }

  for (const input of ui.markModeInputs) {
    input.addEventListener('change', () => {
      update((current) => {
        current.mark = { mode: input.value, id: null };
      });
    });
  }

  ui.shortcutsVisible.addEventListener('change', () => {
    update((current) => {
      current.shortcuts.visible = ui.shortcutsVisible.checked;
    });
  });

  ui.bookmarksVisible.addEventListener('change', () => {
    update((current) => {
      current.bookmarks.visible = ui.bookmarksVisible.checked;
    });
  });

  ui.focusSearch.addEventListener('change', () => {
    update((current) => {
      current.focusSearch = ui.focusSearch.checked;
    });
  });

  ui.dialogForm.addEventListener('submit', (event) => {
    event.preventDefault();
    saveShortcutFromDialog();
  });
  ui.dialogUrl.addEventListener('input', () => setUrlError(false));
  ui.dialogCancel.addEventListener('click', () => ui.dialog.close());
  ui.dialogRemove.addEventListener('click', removeShortcutFromDialog);

  onSystemSchemeChange(() => {
    if (settings.scheme === 'system') {
      applyTheme(settings.theme, settings.scheme);
    }
  });

  onSettingsChanged((nextSettings) => {
    settings = nextSettings;
    render();
  });
}

/* Startup */

async function init() {
  localizeDocument();
  buildThemeGrid();
  buildMarkGrid();
  settings = await loadSettings();
  render();
  bindEvents();
  if (settings.focusSearch) {
    ui.searchInput.focus();
  }
}

init().catch((error) => {
  console.error('Failed to initialize new tab page', error);
});
