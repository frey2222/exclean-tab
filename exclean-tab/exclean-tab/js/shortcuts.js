import { t } from './i18n.js';

export const MAX_SHORTCUTS = 10;

const ADD_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/>' +
  '</svg>';

export function normalizeUrl(input) {
  const value = input.trim();
  if (!value) {
    return null;
  }
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  const candidate = hasScheme ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export function createShortcutId() {
  return crypto.randomUUID();
}

function initialFor(shortcut) {
  const source = shortcut.name || new URL(shortcut.url).hostname.replace(/^www\./, '');
  return source.trim().charAt(0).toUpperCase();
}

export function renderShortcuts(listElement, template, shortcuts, handlers) {
  listElement.replaceChildren();

  for (const shortcut of shortcuts) {
    const item = template.content.firstElementChild.cloneNode(true);
    const link = item.querySelector('.shortcut-link');
    const menu = item.querySelector('.shortcut-menu');

    link.href = shortcut.url;
    link.title = shortcut.url;
    item.querySelector('.shortcut-icon').textContent = initialFor(shortcut);
    item.querySelector('.shortcut-label').textContent = shortcut.name;

    menu.setAttribute('aria-label', t('shortcutMenu'));
    menu.addEventListener('click', () => handlers.onEdit(shortcut));

    listElement.append(item);
  }

  if (shortcuts.length < MAX_SHORTCUTS) {
    const item = template.content.firstElementChild.cloneNode(true);
    const link = item.querySelector('.shortcut-link');

    item.classList.add('shortcut-add');
    item.querySelector('.shortcut-menu').remove();
    link.removeAttribute('href');
    link.setAttribute('role', 'button');
    link.tabIndex = 0;
    item.querySelector('.shortcut-icon').innerHTML = ADD_ICON;
    item.querySelector('.shortcut-label').textContent = t('addShortcut');

    link.addEventListener('click', handlers.onAdd);
    link.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handlers.onAdd();
      }
    });

    listElement.append(item);
  }
}
