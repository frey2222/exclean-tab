# Exclean Tab

A Chrome new tab page with a plain search box, color themes and optional shortcuts.
The page runs entirely inside the extension; there is no server, no analytics and no
network access other than the search request you submit.

## Features

- Search box that sends queries to Google. It never shows suggestions or history.
- The same fourteen color options as Chrome's own picker. Colors are not stored as a table: each option is Chrome's seed color and scheme variant, expanded at runtime into HCT tonal palettes with Google's material-color-utilities and mapped to the same UI tokens Chrome uses (see `js/themes.js`). Light and dark variants follow the system by default.
- A decorative shape above the search box that changes daily, or can be pinned or hidden.
- User-managed shortcuts (up to 10) with a switch to hide them completely.
- Gmail and Gemini links in the top-right corner.
- Optional in-page bookmarks bar that mirrors Chrome's: bookmarks bar folder on the left with overflow into a menu, folders as drop-down menus, and "All bookmarks" on the right. Shown by default; can be hidden from the customize panel.

## Permissions

- `storage` – saves theme, shape and shortcut settings via `chrome.storage.sync`.
- `favicon` – lets the page show site icons for bookmarks through Chrome's local favicon cache.
- `bookmarks` – read-only, to render the bookmarks bar. The extension never creates, edits or deletes bookmarks.

No other permissions are requested. The extension cannot read, modify or delete browsing history.

## Install locally

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this folder.
4. Open a new tab. Chrome shows a one-time prompt asking whether to keep the new tab page.

## Renaming

The extension name and description live in `_locales/<lang>/messages.json` under
`extensionName` and `extensionDescription`. Update every locale you ship.

## Project layout

```
manifest.json          Extension manifest (Manifest V3)
newtab.html            Page markup
newtab.css             Styles
js/main.js             Entry point: wires UI, settings and rendering
js/settings.js         Load/save settings with defaults
js/themes.js           Theme engine: Chrome seeds → tonal palettes → UI tokens
js/vendor/             material-color-utilities (Apache-2.0), bundled subset
js/marks.js            Decorative shape definitions and daily rotation
js/shortcuts.js        Shortcut list rendering and URL validation
js/bookmarks.js        Bookmarks bar: permission, layout with overflow, folder menus
js/theme-boot.js       Applies the cached theme before first paint
js/i18n.js             Localization helper for data-i18n attributes
_locales/              UI strings (en, zh_CN, zh_TW)
icons/                 Extension icons
```

## License

MIT (see `LICENSE`). Third-party components and attributions are listed in `THIRD_PARTY_NOTICES.md`.
