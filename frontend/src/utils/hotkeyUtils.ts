/**
 * Utility functions for displaying and organizing keyboard shortcuts.
 *
 * Provides:
 * - Platform-aware key display formatting (⌘ on Mac, Ctrl on Windows)
 * - Category ordering for consistent Help dialog presentation
 * - Human-readable labels for hotkey categories
 *
 * Used by CommandPalette and Help components to present shortcuts to users.
 *
 * @module hotkeyUtils
 */
import type { HotkeyDefinition } from '../stores/hotkeyStore';
import { isMac } from './platformUtils';
import type { TranslationKey } from '../../../UpdateWuruize/frontend/i18n';

/** Canonical display order for hotkey categories */
export const CATEGORY_ORDER: HotkeyDefinition['category'][] = [
  'navigation',
  'session',
  'tabs',
  'view',
  'tools',
  'shortcuts',
  'debug',
];

export const CATEGORY_LABELS: Record<HotkeyDefinition['category'], string> = {
  navigation: 'Navigation',
  session: 'Projects',
  tabs: 'Tabs',
  view: 'View',
  tools: 'Add Tool',
  shortcuts: 'Shortcuts',
  debug: 'Debug',
};

export const CATEGORY_LABEL_KEYS: Record<HotkeyDefinition['category'], TranslationKey> = {
  navigation: 'hotkeys.category.navigation',
  session: 'hotkeys.category.projects',
  tabs: 'hotkeys.category.tabs',
  view: 'hotkeys.category.view',
  tools: 'hotkeys.category.addTool',
  shortcuts: 'hotkeys.category.shortcuts',
  debug: 'hotkeys.category.debug',
};

export function getHotkeyCategoryLabel(
  category: HotkeyDefinition['category'],
  t: (key: TranslationKey) => string,
): string {
  return t(CATEGORY_LABEL_KEYS[category]);
}

export function formatKeyDisplay(keys: string): string {
  const isMacPlatform = isMac();
  const parts = keys.split('+');
  const formatted = parts.map((part) => {
    switch (part.toLowerCase()) {
      case 'mod': return isMacPlatform ? '⌘' : 'Ctrl';
      case 'alt': return isMacPlatform ? '⌥' : 'Alt';
      case 'shift': return isMacPlatform ? '⇧' : 'Shift';
      case 'arrowleft': return '←';
      case 'arrowright': return '→';
      case 'arrowup': return '↑';
      case 'arrowdown': return '↓';
      case 'tab': return 'Tab';
      default: return part.length === 1 ? part.toUpperCase() : part;
    }
  });
  return formatted.join(' + ');
}
