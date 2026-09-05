const ATTRIBUTE_BINDINGS = [
  ['data-i18n-placeholder', 'placeholder'],
  ['data-i18n-aria-label', 'aria-label'],
  ['data-i18n-title', 'title'],
];

export function t(key) {
  return chrome.i18n.getMessage(key) || key;
}

export function localizeDocument(root = document) {
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const [dataAttribute, targetAttribute] of ATTRIBUTE_BINDINGS) {
    for (const element of root.querySelectorAll(`[${dataAttribute}]`)) {
      element.setAttribute(targetAttribute, t(element.getAttribute(dataAttribute)));
    }
  }
  document.documentElement.lang = chrome.i18n.getUILanguage();
}
