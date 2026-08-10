import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { useHotkeyStore, type HotkeyDefinition } from '../stores/hotkeyStore';
import { formatKeyDisplay, CATEGORY_ORDER, getHotkeyCategoryLabel } from '../utils/hotkeyUtils';
import { Kbd } from './ui/Kbd';
import { useI18n } from '../I18nContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type ListItem =
  | { type: 'header'; category: string }
  | { type: 'command'; hotkey: HotkeyDefinition; flatIndex: number };

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const getAll = useHotkeyStore((s) => s.getAll);
  const search = useHotkeyStore((s) => s.search);

  const results = (searchTerm
    ? search(searchTerm, { paletteOnly: true })
    : getAll({ paletteOnly: true })
  ).filter((h) => h.id !== 'open-command-palette' && (!h.enabled || h.enabled()));

  const { listItems, commandCount } = buildListItems(results);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    const selectedEl = listRef.current?.querySelector('[data-selected="true"]');
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const executeSelected = useCallback(() => {
    const commandItems = listItems.filter(
      (item): item is Extract<ListItem, { type: 'command' }> => item.type === 'command',
    );
    const selected = commandItems[selectedIndex];
    if (selected) {
      onClose();
      setTimeout(() => selected.hotkey.action(), 50);
    }
  }, [listItems, selectedIndex, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % commandCount);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + commandCount) % commandCount);
        break;
      case 'Enter':
        e.preventDefault();
        executeSelected();
        break;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      className="!max-h-[min(500px,80vh)]"
    >
      <div className="p-3 border-b border-border-primary">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-text-muted" />
          </div>
          <Input
            ref={inputRef}
            type="text"
            placeholder={t('commandPalette.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 border-none focus:ring-0 bg-transparent"
          />
        </div>
      </div>

      <div ref={listRef} className="overflow-y-auto py-2" style={{ maxHeight: '380px' }}>
        {commandCount === 0 ? (
          <div className="px-4 py-8 text-center text-text-tertiary text-sm">
            {t('commandPalette.noCommandsFound')}
          </div>
        ) : (
          listItems.map((item) => {
            if (item.type === 'header') {
              return (
                <div
                  key={`header-${item.category}`}
                  className="px-4 pt-3 pb-1 text-xs font-medium text-text-tertiary uppercase tracking-wider"
                >
                  {getHotkeyCategoryLabel(item.category as HotkeyDefinition['category'], t)}
                </div>
              );
            }

            const isSelected = item.flatIndex === selectedIndex;
            return (
              <button
                key={item.hotkey.id}
                data-selected={isSelected}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-interactive/15 text-text-primary'
                    : 'text-text-secondary hover:bg-surface-hover'
                }`}
                onClick={() => {
                  setSelectedIndex(item.flatIndex);
                  onClose();
                  setTimeout(() => item.hotkey.action(), 50);
                }}
                onMouseEnter={() => setSelectedIndex(item.flatIndex)}
              >
                <span>{item.hotkey.label}</span>
                {item.hotkey.keys && (
                  <Kbd variant="muted" className="ml-4 shrink-0">
                    {formatKeyDisplay(item.hotkey.keys)}
                  </Kbd>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="px-4 py-2 border-t border-border-primary flex items-center gap-4 text-xs text-text-muted">
        <span><Kbd size="xs">Up/Down</Kbd> {t('commandPalette.footer.navigate')}</span>
        <span><Kbd size="xs">Enter</Kbd> {t('commandPalette.footer.execute')}</span>
        <span><Kbd size="xs">Esc</Kbd> {t('commandPalette.footer.close')}</span>
      </div>
    </Modal>
  );
}

function buildListItems(results: HotkeyDefinition[]) {
  const grouped: Record<string, HotkeyDefinition[]> = {};
  for (const def of results) {
    if (!grouped[def.category]) grouped[def.category] = [];
    grouped[def.category].push(def);
  }

  const listItems: ListItem[] = [];
  let flatIndex = 0;
  for (const category of CATEGORY_ORDER) {
    const hotkeys = grouped[category];
    if (!hotkeys) continue;
    listItems.push({ type: 'header', category });
    for (const hotkey of hotkeys) {
      listItems.push({ type: 'command', hotkey, flatIndex });
      flatIndex++;
    }
  }

  return { listItems, commandCount: flatIndex };
}
