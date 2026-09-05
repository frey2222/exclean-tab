import { t } from './i18n.js';

const FAVICON_SIZE = 16;

const FOLDER_ICON =
  '<svg class="bookmark-folder-icon" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path fill="currentColor" d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z"/>' +
  '</svg>';

const SUBMENU_ARROW =
  '<svg class="bookmark-menu-arrow" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path fill="currentColor" d="M9.4 6 8 7.4l4.6 4.6L8 16.6 9.4 18l6-6z"/>' +
  '</svg>';

/**
 * Asks Chrome's favicon cache for the icon at the display's scale factor so it
 * is not upscaled from a 1x bitmap on high-DPI screens.
 */
function faviconUrl(pageUrl) {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', String(FAVICON_SIZE));
  url.searchParams.set('scaleFactor', `${window.devicePixelRatio}x`);
  return url.href;
}

function isFolder(node) {
  return !node.url;
}

/** Returns the "Bookmarks bar" and "Other bookmarks" root folders. */
async function getRootFolders() {
  const [root] = await chrome.bookmarks.getTree();
  const children = root.children ?? [];
  const bar =
    children.find((node) => node.folderType === 'bookmarks-bar') ??
    children.find((node) => node.id === '1');
  const other =
    children.find((node) => node.folderType === 'other') ??
    children.find((node) => node.id === '2');
  return { bar, other };
}

export class BookmarkBar {
  constructor(elements) {
    this.bar = elements.bar;
    this.items = elements.items;
    this.overflowButton = elements.overflowButton;
    this.divider = elements.divider;
    this.allButton = elements.allButton;

    this.barNodes = [];
    this.otherNode = null;
    this.openMenus = [];
    this.listening = false;

    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(this.bar);

    this.overflowButton.addEventListener('click', () => {
      const hiddenNodes = this.barNodes.filter((_, index) => this.itemElements[index].hidden);
      this.toggleMenu(this.overflowButton, hiddenNodes);
    });
    this.allButton.addEventListener('click', () => {
      this.toggleMenu(this.allButton, this.otherNode?.children ?? []);
    });

    document.addEventListener('pointerdown', (event) => {
      const inMenu = this.openMenus.some((entry) => entry?.menu.contains(event.target));
      if (!inMenu && !this.bar.contains(event.target)) {
        this.closeMenus();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeMenus();
      }
    });
  }

  async show() {
    await this.refresh();
    this.bar.hidden = false;
    this.layout();
    this.listen();
  }

  hide() {
    this.closeMenus();
    this.bar.hidden = true;
  }

  listen() {
    if (this.listening || !chrome.bookmarks) {
      return;
    }
    this.listening = true;
    const refresh = () => this.refresh().then(() => this.layout());
    chrome.bookmarks.onCreated.addListener(refresh);
    chrome.bookmarks.onRemoved.addListener(refresh);
    chrome.bookmarks.onChanged.addListener(refresh);
    chrome.bookmarks.onMoved.addListener(refresh);
    chrome.bookmarks.onChildrenReordered.addListener(refresh);
  }

  async refresh() {
    const { bar, other } = await getRootFolders();
    this.barNodes = bar?.children ?? [];
    this.otherNode = other ?? null;
    this.closeMenus();
    this.renderItems();
  }

  renderItems() {
    this.items.replaceChildren();
    this.itemElements = this.barNodes.map((node) => {
      const element = this.createBarItem(node);
      this.items.append(element);
      return element;
    });
    const hasOther = (this.otherNode?.children?.length ?? 0) > 0;
    this.allButton.hidden = !hasOther;
  }

  createBarItem(node) {
    if (isFolder(node)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'bookmark-item bookmark-folder';
      button.innerHTML = FOLDER_ICON;
      button.append(this.createLabel(node.title));
      button.title = node.title;
      button.addEventListener('click', () => this.toggleMenu(button, node.children ?? []));
      return button;
    }
    const link = document.createElement('a');
    link.className = 'bookmark-item';
    link.href = node.url;
    link.title = node.title || node.url;
    link.append(this.createFavicon(node.url), this.createLabel(node.title || node.url));
    return link;
  }

  createFavicon(pageUrl) {
    const image = document.createElement('img');
    image.className = 'bookmark-favicon';
    image.src = faviconUrl(pageUrl);
    image.alt = '';
    image.width = FAVICON_SIZE;
    image.height = FAVICON_SIZE;
    return image;
  }

  createLabel(text) {
    const label = document.createElement('span');
    label.className = 'bookmark-label';
    label.textContent = text;
    return label;
  }

  /**
   * Hides items that do not fit and reveals the overflow button. Widths are
   * measured once per layout pass to avoid interleaving reads and writes.
   */
  layout() {
    if (this.bar.hidden || !this.itemElements) {
      return;
    }
    for (const element of this.itemElements) {
      element.hidden = false;
    }
    this.overflowButton.hidden = true;

    const available = this.items.clientWidth;
    const widths = this.itemElements.map((element) => element.offsetWidth + 4);
    const total = widths.reduce((sum, width) => sum + width, 0);
    if (total <= available) {
      this.divider.hidden = this.allButton.hidden;
      return;
    }

    this.overflowButton.hidden = false;
    const reserve = this.overflowButton.offsetWidth + 4;
    let used = 0;
    let visibleCount = 0;
    for (const width of widths) {
      if (used + width + reserve > available) {
        break;
      }
      used += width;
      visibleCount += 1;
    }
    this.itemElements.forEach((element, index) => {
      element.hidden = index >= visibleCount;
    });
    this.divider.hidden = this.allButton.hidden;
  }

  /* Menus */

  toggleMenu(anchor, nodes) {
    const alreadyOpen = this.openMenus[0]?.anchor === anchor;
    this.closeMenus();
    if (!alreadyOpen) {
      this.openMenu(anchor, nodes, 0);
    }
  }

  openMenu(anchor, nodes, depth) {
    this.closeMenus(depth);

    const menu = document.createElement('div');
    menu.className = 'bookmark-menu';
    menu.setAttribute('role', 'menu');

    if (nodes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'bookmark-menu-empty';
      empty.textContent = t('emptyFolder');
      menu.append(empty);
    }
    for (const node of nodes) {
      menu.append(this.createMenuItem(node, depth));
    }

    document.body.append(menu);
    this.positionMenu(menu, anchor, depth);
    anchor.setAttribute('aria-expanded', 'true');
    this.openMenus[depth] = { menu, anchor };
  }

  createMenuItem(node, depth) {
    if (isFolder(node)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'bookmark-menu-item';
      button.setAttribute('role', 'menuitem');
      button.innerHTML = FOLDER_ICON;
      button.append(this.createLabel(node.title));
      button.insertAdjacentHTML('beforeend', SUBMENU_ARROW);
      button.addEventListener('click', () => {
        if (button.getAttribute('aria-expanded') === 'true') {
          this.closeMenus(depth + 1);
        } else {
          this.openMenu(button, node.children ?? [], depth + 1);
        }
      });
      return button;
    }
    const link = document.createElement('a');
    link.className = 'bookmark-menu-item';
    link.setAttribute('role', 'menuitem');
    link.href = node.url;
    link.title = node.url;
    link.append(this.createFavicon(node.url), this.createLabel(node.title || node.url));
    return link;
  }

  positionMenu(menu, anchor, depth) {
    const anchorRect = anchor.getBoundingClientRect();
    const margin = 8;
    let left;
    let top;
    if (depth === 0) {
      left = anchorRect.left;
      top = anchorRect.bottom + 4;
    } else {
      left = anchorRect.right;
      top = anchorRect.top - 6;
    }
    menu.style.left = '0px';
    menu.style.top = '0px';
    const menuRect = menu.getBoundingClientRect();
    if (left + menuRect.width > window.innerWidth - margin) {
      left = depth === 0 ? window.innerWidth - margin - menuRect.width : anchorRect.left - menuRect.width;
    }
    if (top + menuRect.height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - margin - menuRect.height);
    }
    // Integer positions keep text on whole device pixels; fractional offsets
    // from getBoundingClientRect() render visibly soft on Windows.
    menu.style.left = `${Math.round(Math.max(margin, left))}px`;
    menu.style.top = `${Math.round(top)}px`;
  }

  closeMenus(fromDepth = 0) {
    for (let depth = this.openMenus.length - 1; depth >= fromDepth; depth -= 1) {
      const entry = this.openMenus[depth];
      if (entry) {
        entry.menu.remove();
        entry.anchor.removeAttribute('aria-expanded');
      }
    }
    this.openMenus.length = fromDepth;
  }
}
