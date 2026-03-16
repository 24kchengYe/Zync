import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { ChevronRight, ChevronDown, File, Folder, RefreshCw, Plus, Trash2, FolderPlus, Search, X, Eye, Code, Copy, FolderOpen, Play, Loader2, Pencil, ClipboardCopy, FilePlus } from 'lucide-react';
import { useTree } from '@headless-tree/react';
import { asyncDataLoaderFeature, selectionFeature, hotkeysCoreFeature, expandAllFeature } from '@headless-tree/core';
import type { ItemInstance } from '@headless-tree/core';
import { MonacoErrorBoundary } from '../../MonacoErrorBoundary';
import { useTheme } from '../../../contexts/ThemeContext';
import { debounce } from '../../../utils/debounce';
import { MarkdownPreview } from '../../MarkdownPreview';
import { NotebookPreview } from './NotebookPreview';
import { useResizablePanel } from '../../../hooks/useResizablePanel';
import { ExplorerPanelState } from '../../../../../shared/types/panels';
import { isMac, isWindows } from '../../../utils/platformUtils';
// TerminalPopover no longer used — replaced by FileTreeContextMenu

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
}

const ROOT_ID = '\0root';

// Common file extensions for the "New File" submenu
const NEW_FILE_EXTENSIONS = [
  { ext: '.py', label: 'Python (.py)' },
  { ext: '.js', label: 'JavaScript (.js)' },
  { ext: '.ts', label: 'TypeScript (.ts)' },
  { ext: '.txt', label: 'Text (.txt)' },
  { ext: '.md', label: 'Markdown (.md)' },
  { ext: '.tex', label: 'LaTeX (.tex)' },
  { ext: '.json', label: 'JSON (.json)' },
  { ext: '.csv', label: 'CSV (.csv)' },
  { ext: '.html', label: 'HTML (.html)' },
  { ext: '.css', label: 'CSS (.css)' },
];

interface FileTreeContextMenuProps {
  x: number;
  y: number;
  file: FileItem | null;
  revealLabel: string;
  showNewFileSubmenu: boolean;
  onClose: () => void;
  onRename: () => void;
  onDelete: (file: FileItem) => void;
  onCopyPath: () => void;
  onCopyAbsolutePath: () => void;
  onReveal: () => void;
  onNewFile: (ext?: string) => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onToggleSubmenu: (show: boolean) => void;
}

function FileTreeContextMenu({
  x,
  y,
  file,
  revealLabel,
  showNewFileSubmenu,
  onClose,
  onRename,
  onDelete,
  onCopyPath,
  onCopyAbsolutePath,
  onReveal,
  onNewFile,
  onNewFolder,
  onRefresh,
  onToggleSubmenu,
}: FileTreeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [submenuPosition, setSubmenuPosition] = useState<{ top: number; left: number } | null>(null);
  const submenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Position the main menu
  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vH = window.innerHeight;
    const vW = window.innerWidth;

    let top = y;
    let left = x;

    if (top + rect.height > vH - 10) top = y - rect.height;
    if (left + rect.width > vW - 10) left = vW - rect.width - 10;
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    setPosition({ top, left });
  }, [x, y]);

  // Close on click outside, escape, or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        (!submenuRef.current || !submenuRef.current.contains(e.target as Node))
      ) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleScroll = () => onClose();

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('scroll', handleScroll, true);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  // Calculate submenu position when it opens
  useLayoutEffect(() => {
    if (!showNewFileSubmenu || !ref.current) {
      setSubmenuPosition(null);
      return;
    }
    const menuRect = ref.current.getBoundingClientRect();
    const vW = window.innerWidth;
    const vH = window.innerHeight;
    // Find the "New File" item to anchor the submenu
    const newFileItem = ref.current.querySelector('[data-menu-item="new-file"]');
    const itemRect = newFileItem?.getBoundingClientRect();
    const itemTop = itemRect?.top ?? menuRect.top;

    // Estimate submenu height
    const submenuHeight = NEW_FILE_EXTENSIONS.length * 32 + 40; // items + custom option
    let left = menuRect.right + 2;
    let top = itemTop;

    // Flip left if not enough space on right
    if (left + 200 > vW - 10) {
      left = menuRect.left - 202;
    }
    // Flip up if not enough space below
    if (top + submenuHeight > vH - 10) {
      top = vH - submenuHeight - 10;
    }
    if (top < 10) top = 10;

    setSubmenuPosition({ top, left });
  }, [showNewFileSubmenu]);

  const handleNewFileHover = (entering: boolean) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
    if (entering) {
      submenuTimeoutRef.current = setTimeout(() => onToggleSubmenu(true), 150);
    } else {
      submenuTimeoutRef.current = setTimeout(() => onToggleSubmenu(false), 300);
    }
  };

  const isFolder = file?.isDirectory ?? false;
  const isEmptyArea = file === null;

  const menuItemClass = 'w-full px-3 py-1.5 text-left text-sm transition-colors duration-75 flex items-center gap-2 hover:bg-surface-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed';
  const separatorClass = 'border-t border-border-secondary my-1';

  return (
    <>
      <div
        ref={ref}
        className="fixed z-[10001] bg-surface-primary border border-border-secondary rounded-lg shadow-dropdown-elevated py-1 min-w-[200px]"
        style={{ left: position.left, top: position.top }}
      >
        {/* New File — shown for folders and empty area */}
        {(isFolder || isEmptyArea) && (
          <button
            data-menu-item="new-file"
            className={menuItemClass}
            onMouseEnter={() => handleNewFileHover(true)}
            onMouseLeave={() => handleNewFileHover(false)}
            onClick={() => onNewFile()}
          >
            <FilePlus className="w-4 h-4 text-text-tertiary" />
            New File
            <ChevronRight className="w-3 h-3 text-text-tertiary ml-auto" />
          </button>
        )}

        {/* New Folder — shown for folders and empty area */}
        {(isFolder || isEmptyArea) && (
          <button className={menuItemClass} onClick={onNewFolder}>
            <FolderPlus className="w-4 h-4 text-text-tertiary" />
            New Folder
          </button>
        )}

        {(isFolder || isEmptyArea) && !isEmptyArea && <div className={separatorClass} />}

        {/* Rename — shown for files and folders */}
        {!isEmptyArea && (
          <button className={menuItemClass} onClick={onRename}>
            <Pencil className="w-4 h-4 text-text-tertiary" />
            Rename
          </button>
        )}

        {/* Delete — shown for files and folders */}
        {!isEmptyArea && (
          <button className={`${menuItemClass} hover:!text-status-error`} onClick={() => file && onDelete(file)}>
            <Trash2 className="w-4 h-4 text-status-error" />
            Delete
          </button>
        )}

        {!isEmptyArea && <div className={separatorClass} />}

        {/* Copy Path — shown for files and folders */}
        {!isEmptyArea && (
          <button className={menuItemClass} onClick={onCopyPath}>
            <Copy className="w-4 h-4 text-text-tertiary" />
            Copy Path
          </button>
        )}

        {/* Copy Absolute Path — shown for files and folders */}
        {!isEmptyArea && (
          <button className={menuItemClass} onClick={onCopyAbsolutePath}>
            <ClipboardCopy className="w-4 h-4 text-text-tertiary" />
            Copy Absolute Path
          </button>
        )}

        {/* Reveal in file manager — shown for files and folders */}
        {!isEmptyArea && (
          <button className={menuItemClass} onClick={onReveal}>
            <FolderOpen className="w-4 h-4 text-text-tertiary" />
            {revealLabel}
          </button>
        )}

        {/* Refresh — shown for empty area */}
        {isEmptyArea && (
          <>
            <div className={separatorClass} />
            <button className={menuItemClass} onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 text-text-tertiary" />
              Refresh
            </button>
          </>
        )}
      </div>

      {/* Submenu for New File types */}
      {showNewFileSubmenu && submenuPosition && (
        <div
          ref={submenuRef}
          className="fixed z-[10002] bg-surface-primary border border-border-secondary rounded-lg shadow-dropdown-elevated py-1 min-w-[180px]"
          style={{ left: submenuPosition.left, top: submenuPosition.top }}
          onMouseEnter={() => handleNewFileHover(true)}
          onMouseLeave={() => handleNewFileHover(false)}
        >
          {NEW_FILE_EXTENSIONS.map(({ ext, label }) => (
            <button
              key={ext}
              className={menuItemClass}
              onClick={() => onNewFile(ext)}
            >
              <File className="w-4 h-4 text-text-tertiary" />
              {label}
            </button>
          ))}
          <div className={separatorClass} />
          <button className={menuItemClass} onClick={() => onNewFile()}>
            <Plus className="w-4 h-4 text-text-tertiary" />
            Custom name...
          </button>
        </div>
      )}
    </>
  );
}

interface HeadlessFileTreeProps {
  sessionId: string;
  onFileSelect: (file: FileItem | null) => void;
  selectedPath: string | null;
  initialExpandedDirs?: string[];
  initialSearchQuery?: string;
  initialShowSearch?: boolean;
  onTreeStateChange?: (state: { expandedDirs: string[]; searchQuery: string; showSearch: boolean }) => void;
}

function HeadlessFileTree({
  sessionId,
  onFileSelect,
  selectedPath,
  initialExpandedDirs,
  initialSearchQuery,
  initialShowSearch,
  onTreeStateChange,
}: HeadlessFileTreeProps) {
  // Cache stores loaded directory contents. Key = dirPath, Value = FileItem[].
  const filesCacheRef = useRef(new Map<string, FileItem[]>());

  // Refs for values used in dataLoader (avoids stale closures)
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const [error, setError] = useState<string | null>(null);
  const setErrorRef = useRef(setError);
  setErrorRef.current = setError;
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [showSearch, setShowSearch] = useState(initialShowSearch || false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showNewItemDialog, setShowNewItemDialog] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemParentPath, setNewItemParentPath] = useState('');
  const newItemInputRef = useRef<HTMLInputElement>(null);

  // Context menu state — file is null when right-clicking empty area
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: FileItem | null;
  } | null>(null);
  const [showNewFileSubmenu, setShowNewFileSubmenu] = useState(false);

  // Inline rename state
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Platform-adaptive label
  const revealLabel = isMac() ? 'Reveal in Finder' : isWindows() ? 'Show in Explorer' : 'Show in File Manager';

  // Initialize expanded state from persisted state or default to root expanded.
  // Normalize legacy '' root to ROOT_ID so saved state from the old FileTree still works.
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    if (!initialExpandedDirs?.length) return [ROOT_ID];
    const normalized = initialExpandedDirs.map(d => d === '' ? ROOT_ID : d);
    if (!normalized.includes(ROOT_ID)) normalized.unshift(ROOT_ID);
    return normalized;
  });

  // Data loader using getChildrenWithData for efficient loading
  const dataLoader = useMemo(() => ({
    getItem: (itemId: string): FileItem => {
      if (itemId === ROOT_ID) {
        return { name: '', path: '', isDirectory: true };
      }
      // Look up item in cache by checking its parent directory
      const parentPath = itemId.includes('/')
        ? itemId.substring(0, itemId.lastIndexOf('/'))
        : '';
      const siblings = filesCacheRef.current.get(parentPath);
      const found = siblings?.find(f => f.path === itemId);
      if (found) return found;

      // Fallback: return a placeholder that will be replaced when parent loads
      return { name: itemId.split('/').pop() || '', path: itemId, isDirectory: false };
    },

    getChildrenWithData: async (itemId: string): Promise<Array<{ id: string; data: FileItem }>> => {
      const dirPath = itemId === ROOT_ID ? '' : itemId;

      // If not root, check if this is actually a directory
      if (itemId !== ROOT_ID) {
        const parentPath = itemId.includes('/')
          ? itemId.substring(0, itemId.lastIndexOf('/'))
          : '';
        const parentItems = filesCacheRef.current.get(parentPath);
        const item = parentItems?.find(f => f.path === itemId);
        if (item && !item.isDirectory) return [];
      }

      try {
        const result = await window.electronAPI.invoke('file:list', {
          sessionId: sessionIdRef.current,
          path: dirPath,
        });
        if (result.success) {
          filesCacheRef.current.set(dirPath, result.files);
          return result.files.map((f: FileItem) => ({ id: f.path, data: f }));
        }
        setErrorRef.current(result.error ?? 'Failed to load directory');
      } catch (err) {
        console.error('Failed to load directory:', dirPath, err);
        setErrorRef.current(err instanceof Error ? err.message : 'Failed to load directory');
      }
      return [];
    },
  }), []); // Empty deps — uses refs internally

  const tree = useTree<FileItem>({
    rootItemId: ROOT_ID,
    getItemName: (item: ItemInstance<FileItem>) => item.getItemData()?.name ?? '',
    isItemFolder: (item: ItemInstance<FileItem>) => item.getItemData()?.isDirectory ?? false,
    dataLoader,
    createLoadingItemData: () => ({ name: 'Loading...', path: '', isDirectory: false }),
    features: [asyncDataLoaderFeature, selectionFeature, hotkeysCoreFeature, expandAllFeature],
    state: { expandedItems },
    setExpandedItems,
  });

  // Session switch: clear cache and invalidate root
  const prevSessionIdRef = useRef(sessionId);
  useEffect(() => {
    if (prevSessionIdRef.current !== sessionId) {
      filesCacheRef.current.clear();
      tree.getItemInstance(ROOT_ID)?.invalidateChildrenIds();
      prevSessionIdRef.current = sessionId;
    }
  }, [sessionId, tree]);

  // Highlight matching text in search results
  const highlightText = useCallback((text: string, query: string) => {
    if (!query) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={index} className="bg-status-warning text-text-primary">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  }, []);

  // Search: flat filtered results from cache
  const getFilteredFiles = useCallback((): FileItem[] => {
    if (!searchQuery) return [];
    const results: FileItem[] = [];
    const query = searchQuery.toLowerCase();
    filesCacheRef.current.forEach((items) => {
      for (const item of items) {
        if (item.name.toLowerCase().includes(query) || item.path.toLowerCase().includes(query)) {
          results.push(item);
        }
      }
    });
    return results;
  }, [searchQuery]);

  // Context menu handlers
  const handleCopyRelativePath = useCallback(async () => {
    if (!contextMenu?.file) return;
    try {
      await navigator.clipboard.writeText(contextMenu.file.path);
    } catch (err) {
      console.error('Failed to copy relative path:', err);
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleCopyAbsolutePath = useCallback(async () => {
    if (!contextMenu?.file) return;
    try {
      const result = await window.electronAPI.invoke('file:resolveAbsolutePath', {
        sessionId,
        path: contextMenu.file.path,
      });
      if (result.success && result.path) {
        await navigator.clipboard.writeText(result.path);
      }
    } catch (err) {
      console.error('Failed to copy absolute path:', err);
    }
    setContextMenu(null);
  }, [contextMenu, sessionId]);

  const handleRevealInFileManager = useCallback(async () => {
    if (!contextMenu?.file) return;
    try {
      await window.electronAPI.invoke('file:showInFolder', {
        sessionId,
        path: contextMenu.file.path,
      });
    } catch (err) {
      console.error('Failed to reveal in file manager:', err);
    }
    setContextMenu(null);
  }, [contextMenu, sessionId]);

  // Start inline rename
  const handleStartRename = useCallback(() => {
    if (!contextMenu?.file) return;
    const file = contextMenu.file;
    setRenamingPath(file.path);
    setRenameValue(file.name);
    setContextMenu(null);
    // Focus will be handled by the effect below
  }, [contextMenu]);

  // Commit rename
  const handleCommitRename = useCallback(async () => {
    if (!renamingPath || !renameValue.trim()) {
      setRenamingPath(null);
      setRenameValue('');
      return;
    }

    const oldName = renamingPath.split('/').pop() || '';
    if (renameValue.trim() === oldName) {
      setRenamingPath(null);
      setRenameValue('');
      return;
    }

    const parentPath = renamingPath.includes('/')
      ? renamingPath.substring(0, renamingPath.lastIndexOf('/'))
      : '';
    const newPath = parentPath ? `${parentPath}/${renameValue.trim()}` : renameValue.trim();

    try {
      const result = await window.electronAPI.invoke('file:rename', {
        sessionId,
        oldPath: renamingPath,
        newPath,
      });

      if (result.success) {
        // Invalidate parent cache
        filesCacheRef.current.delete(parentPath);
        const parentItemId = parentPath || ROOT_ID;
        tree.getItemInstance(parentItemId)?.invalidateChildrenIds();

        // If the renamed file was selected, update selection
        if (selectedPath === renamingPath) {
          onFileSelect({
            name: renameValue.trim(),
            path: newPath,
            isDirectory: false,
          });
        }
      } else {
        setError(`Failed to rename: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to rename:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename');
    }

    setRenamingPath(null);
    setRenameValue('');
  }, [renamingPath, renameValue, sessionId, selectedPath, onFileSelect, tree]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      const input = renameInputRef.current;
      input.focus();
      // Select just the name part (not extension) for files
      const dotIndex = renameValue.lastIndexOf('.');
      if (dotIndex > 0) {
        input.setSelectionRange(0, dotIndex);
      } else {
        input.select();
      }
    }
  }, [renamingPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Context menu: new file with specific extension
  const handleContextNewFile = useCallback((ext?: string) => {
    const parentPath = contextMenu?.file
      ? (contextMenu.file.isDirectory ? contextMenu.file.path : (contextMenu.file.path.includes('/') ? contextMenu.file.path.substring(0, contextMenu.file.path.lastIndexOf('/')) : ''))
      : '';
    setNewItemParentPath(parentPath);
    setNewItemName(ext ? `untitled${ext}` : '');
    setShowNewItemDialog('file');
    setContextMenu(null);
    setShowNewFileSubmenu(false);
  }, [contextMenu]);

  // Context menu: new folder
  const handleContextNewFolder = useCallback(() => {
    const parentPath = contextMenu?.file
      ? (contextMenu.file.isDirectory ? contextMenu.file.path : (contextMenu.file.path.includes('/') ? contextMenu.file.path.substring(0, contextMenu.file.path.lastIndexOf('/')) : ''))
      : '';
    setNewItemParentPath(parentPath);
    setNewItemName('');
    setShowNewItemDialog('folder');
    setContextMenu(null);
  }, [contextMenu]);

  // Delete handler
  const handleDelete = useCallback(async (file: FileItem) => {
    const confirmMessage = file.isDirectory
      ? `Are you sure you want to delete the folder "${file.name}" and all its contents?`
      : `Are you sure you want to delete the file "${file.name}"?`;
    if (!confirm(confirmMessage)) return;

    try {
      const result = await window.electronAPI.invoke('file:delete', {
        sessionId,
        filePath: file.path,
      });

      if (result.success) {
        const parentPath = file.path.includes('/')
          ? file.path.substring(0, file.path.lastIndexOf('/'))
          : '';
        filesCacheRef.current.delete(parentPath);

        // Purge deleted directory's subtree from cache so stale entries
        // don't appear in search results
        if (file.isDirectory) {
          const prefix = file.path + '/';
          for (const key of filesCacheRef.current.keys()) {
            if (key === file.path || key.startsWith(prefix)) {
              filesCacheRef.current.delete(key);
            }
          }
        }

        const parentItemId = parentPath || ROOT_ID;
        tree.getItemInstance(parentItemId)?.invalidateChildrenIds();

        if (selectedPath === file.path) {
          onFileSelect(null);
        }
      } else {
        setError(`Failed to delete: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  }, [sessionId, selectedPath, onFileSelect, tree]);

  // New file/folder creation with auto-open (the .md bug fix)
  const handleCreateNewItem = useCallback(async () => {
    if (!newItemName.trim()) return;

    try {
      const isFolder = showNewItemDialog === 'folder';
      const relativePath = newItemParentPath
        ? `${newItemParentPath}/${newItemName}`
        : newItemName;

      const result = isFolder
        ? await window.electronAPI.invoke('file:create-folder', {
            sessionId,
            folderPath: relativePath,
          })
        : await window.electronAPI.invoke('file:write', {
            sessionId,
            filePath: relativePath,
            content: '',
          });

      if (result.success) {
        filesCacheRef.current.delete(newItemParentPath);
        const parentItemId = newItemParentPath || ROOT_ID;
        tree.getItemInstance(parentItemId)?.invalidateChildrenIds();

        // AUTO-OPEN: Select and open the new file in editor — this is the bug fix
        if (!isFolder) {
          const newFile: FileItem = {
            name: newItemName,
            path: relativePath,
            isDirectory: false,
          };
          onFileSelect(newFile);
        }

        setShowNewItemDialog(null);
        setNewItemName('');
        setNewItemParentPath('');
      } else {
        setError(`Failed to create ${isFolder ? 'folder' : 'file'}: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to create item:', err);
      setError(err instanceof Error ? err.message : 'Failed to create item');
    }
  }, [sessionId, newItemName, newItemParentPath, showNewItemDialog, onFileSelect, tree]);

  // Refresh all
  const handleRefreshAll = useCallback(() => {
    filesCacheRef.current.clear();
    tree.getItemInstance(ROOT_ID)?.invalidateChildrenIds();
    for (const item of tree.getItems()) {
      if (item.getItemData()?.isDirectory) {
        item.invalidateChildrenIds();
      }
    }
  }, [tree]);

  // Auto-refresh when files change (delete, create, etc.)
  useEffect(() => {
    const handler = (_event: unknown, data: { sessionId: string }) => {
      if (data.sessionId === sessionId) {
        handleRefreshAll();
      }
    };
    window.electronAPI?.on?.('file:changed', handler);
    return () => {
      window.electronAPI?.off?.('file:changed', handler);
    };
  }, [sessionId, handleRefreshAll]);

  // Focus input when dialog is shown
  useEffect(() => {
    if (showNewItemDialog && newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [showNewItemDialog]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // State persistence: notify parent about tree state changes
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (onTreeStateChange) {
      onTreeStateChange({
        expandedDirs: expandedItems,
        searchQuery,
        showSearch,
      });
    }
  }, [expandedItems, searchQuery, showSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
      if (e.key === 'Escape') {
        if (renamingPath) {
          setRenamingPath(null);
          setRenameValue('');
          return;
        }
        if (contextMenu) {
          setContextMenu(null);
          setShowNewFileSubmenu(false);
          return;
        }
        if (showNewItemDialog) {
          setShowNewItemDialog(null);
          setNewItemName('');
          return;
        }
        if (searchQuery) {
          setSearchQuery('');
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, showNewItemDialog, contextMenu, renamingPath]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border-primary">
        <span className="text-sm font-medium text-text-primary">Files</span>
        <div className="flex gap-1">
          <button
            onClick={() => setShowSearch(prev => !prev)}
            className={`p-1 rounded text-text-tertiary hover:text-text-primary ${showSearch ? 'bg-surface-tertiary' : 'hover:bg-surface-hover'}`}
            title="Search files (Cmd/Ctrl+F)"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setShowNewItemDialog('file'); setNewItemName(''); setNewItemParentPath(''); }}
            className="p-1 hover:bg-surface-hover rounded text-text-tertiary hover:text-text-primary"
            title="New file"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setShowNewItemDialog('folder'); setNewItemName(''); setNewItemParentPath(''); }}
            className="p-1 hover:bg-surface-hover rounded text-text-tertiary hover:text-text-primary"
            title="New folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefreshAll}
            className="p-1 hover:bg-surface-hover rounded text-text-tertiary hover:text-text-primary"
            title="Refresh all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showSearch && (
        <div className="p-2 border-b border-border-primary">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-8 pr-8 py-1 bg-surface-primary border border-border-primary rounded text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-interactive focus:ring-1 focus:ring-interactive"
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 hover:bg-surface-hover rounded"
              >
                <X className="w-3 h-3 text-text-tertiary" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-1 text-xs text-text-tertiary">
              Press ESC to clear • Cmd/Ctrl+F to toggle search
            </div>
          )}
        </div>
      )}
      {showNewItemDialog && (
        <div className="p-2 border-b border-border-primary bg-surface-secondary">
          <form onSubmit={(e) => { e.preventDefault(); handleCreateNewItem(); }}>
            <input
              ref={newItemInputRef}
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Enter ${showNewItemDialog} name${newItemParentPath ? ` in ${newItemParentPath}` : ''}...`}
              className="w-full px-2 py-1 mb-2 bg-surface-primary border border-border-primary rounded text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-interactive focus:ring-1 focus:ring-interactive"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newItemName.trim()}
                className="flex-1 px-3 py-1 bg-interactive hover:bg-interactive-hover disabled:bg-surface-tertiary disabled:text-text-tertiary text-white rounded text-sm transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => { setShowNewItemDialog(null); setNewItemName(''); setNewItemParentPath(''); }}
                className="flex-1 px-3 py-1 bg-surface-tertiary hover:bg-surface-hover text-text-secondary rounded text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {error && (
        <div className="px-3 py-2 bg-status-error/20 text-status-error text-sm border-b border-status-error/30">
          {error}
        </div>
      )}
      {/* Search mode: flat filtered results overlay */}
      {searchQuery && (
        <div className="flex-1 overflow-auto">
          {getFilteredFiles().map(file => (
            <div
              key={file.path}
              className={`flex items-center px-2 py-1 hover:bg-surface-hover cursor-pointer group ${
                selectedPath === file.path ? 'bg-interactive' : ''
              }`}
              style={{ paddingLeft: '8px' }}
              onClick={() => {
                if (!file.isDirectory) onFileSelect(file);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, file });
              }}
            >
              {file.isDirectory ? (
                <Folder className="w-4 h-4 mr-2 text-interactive flex-shrink-0" />
              ) : (
                <File className="w-4 h-4 mr-2 text-text-tertiary flex-shrink-0" />
              )}
              <span className="flex-1 text-sm truncate text-text-primary">
                {highlightText(file.name, searchQuery)}
              </span>
              <span className="text-xs text-text-tertiary ml-2 truncate max-w-[120px]">
                {file.path}
              </span>
            </div>
          ))}
          {getFilteredFiles().length === 0 && (
            <div className="p-4 text-text-secondary text-sm">No matching files</div>
          )}
        </div>
      )}
      {/* Tree view: always rendered so the async data loader stays active and
          populates the cache. Hidden (not unmounted) when search is active. */}
      <div
        {...tree.getContainerProps()}
        className={`overflow-auto outline-none ${searchQuery ? 'hidden' : 'flex-1'}`}
        onContextMenu={(e) => {
          // Only fire for empty area (not bubbled from items)
          if (e.target === e.currentTarget) {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, file: null });
          }
        }}
      >
        {tree.getItems().map((item: ItemInstance<FileItem>) => {
          const data = item.getItemData();
          if (!data || item.getId() === ROOT_ID) return null;

          const isFolder = data.isDirectory;
          const level = item.getItemMeta().level;
          const isExpanded = item.isExpanded();
          const isSelected = selectedPath === data.path;
          const isRenaming = renamingPath === data.path;

          return (
            <div
              key={item.getId()}
              {...item.getProps()}
              className={`flex items-center px-2 py-1 hover:bg-surface-hover cursor-pointer group ${
                isSelected ? 'bg-interactive' : ''
              }`}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={(e) => {
                e.stopPropagation();
                if (isRenaming) return;
                if (isFolder) {
                  if (isExpanded) item.collapse();
                  else item.expand();
                } else {
                  onFileSelect(data);
                }
              }}
              onKeyDown={(e) => {
                if (isRenaming) return;
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (isFolder) {
                    if (isExpanded) item.collapse();
                    else item.expand();
                  } else {
                    onFileSelect(data);
                  }
                }
                // F2 to rename
                if (e.key === 'F2') {
                  e.preventDefault();
                  setRenamingPath(data.path);
                  setRenameValue(data.name);
                }
              }}
              onDoubleClick={(e) => e.preventDefault()}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, file: data });
              }}
            >
              {isFolder ? (
                <>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 mr-1 text-text-tertiary" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-1 text-text-tertiary" />
                  )}
                  <Folder className="w-4 h-4 mr-2 text-interactive" />
                </>
              ) : (
                <>
                  <div className="w-4 h-4 mr-1" />
                  <File className="w-4 h-4 mr-2 text-text-tertiary" />
                </>
              )}
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCommitRename();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setRenamingPath(null);
                      setRenameValue('');
                    }
                  }}
                  onBlur={handleCommitRename}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-sm bg-surface-primary border border-interactive rounded px-1 py-0 text-text-primary outline-none min-w-0"
                />
              ) : (
                <span className="flex-1 text-sm truncate text-text-primary">{data.name}</span>
              )}
              {!isRenaming && isFolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    filesCacheRef.current.delete(data.path);
                    item.invalidateChildrenIds();
                  }}
                  className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 p-1 hover:bg-surface-hover rounded text-text-tertiary hover:text-text-primary"
                  title="Refresh folder"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
              {!isRenaming && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(data);
                  }}
                  className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 p-1 hover:bg-surface-hover rounded ml-1"
                  title={`Delete ${isFolder ? 'folder' : 'file'}`}
                >
                  <Trash2 className="w-3 h-3 text-status-error" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {/* Custom context menu rendered via portal */}
      {contextMenu && createPortal(
        <FileTreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          revealLabel={revealLabel}
          showNewFileSubmenu={showNewFileSubmenu}
          onClose={() => { setContextMenu(null); setShowNewFileSubmenu(false); }}
          onRename={handleStartRename}
          onDelete={(file) => { handleDelete(file); setContextMenu(null); }}
          onCopyPath={handleCopyRelativePath}
          onCopyAbsolutePath={handleCopyAbsolutePath}
          onReveal={handleRevealInFileManager}
          onNewFile={handleContextNewFile}
          onNewFolder={handleContextNewFolder}
          onRefresh={() => { handleRefreshAll(); setContextMenu(null); }}
          onToggleSubmenu={setShowNewFileSubmenu}
        />,
        document.body
      )}
    </div>
  );
}

interface FileEditorProps {
  sessionId: string;
  initialFilePath?: string;
  initialState?: ExplorerPanelState;
  onFileChange?: (filePath: string | undefined, isDirty: boolean) => void;
  onStateChange?: (state: Partial<ExplorerPanelState>) => void;
}

// Per-file cached state for multi-tab support
interface FileTabState {
  filePath: string;
  content: string;
  originalContent: string;
  viewMode: 'edit' | 'preview';
  gitStatus: 'clean' | 'modified' | 'untracked';
  cursorPosition?: { line: number; column: number };
  scrollPosition?: number;
  mediaDataUrl?: string | null;
  mediaFileType?: 'image' | 'pdf' | 'video' | 'audio' | null;
}

export function FileEditor({
  sessionId,
  initialFilePath,
  initialState,
  onFileChange,
  onStateChange
}: FileEditorProps) {
  console.log('[FileEditor] Mounting with:', {
    sessionId,
    initialFilePath,
    initialState,
    hasOnStateChange: !!onStateChange
  });

  // Multi-file tabs state
  const [openFiles, setOpenFiles] = useState<string[]>(() => {
    if (initialState?.openFiles?.length) return initialState.openFiles;
    if (initialFilePath) return [initialFilePath];
    return [];
  });
  const [activeFilePath, setActiveFilePath] = useState<string | null>(() => {
    return initialState?.filePath || initialFilePath || null;
  });

  // Cache for per-file state (content, cursor, scroll, etc.)
  const fileTabStatesRef = useRef<Map<string, FileTabState>>(new Map());

  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [gitStatus, setGitStatus] = useState<'clean' | 'modified' | 'untracked'>('clean');
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);

  // LaTeX compilation state
  const [latexCompiling, setLatexCompiling] = useState(false);
  const [latexError, setLatexError] = useState<string | null>(null);
  const [latexPdfDataUrl, setLatexPdfDataUrl] = useState<string | null>(null);
  const [showLatexPreview, setShowLatexPreview] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Script run state
  const [scriptRunning, setScriptRunning] = useState(false);
  const [scriptOutput, setScriptOutput] = useState<string | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [showScriptOutput, setShowScriptOutput] = useState(false);

  const { theme } = useTheme();
  const isDarkMode = theme !== 'light';
  const hasUnsavedChanges = fileContent !== originalContent;
  
  // Wrap onResize callback to avoid recreating
  const handleTreeResize = useCallback((width: number) => {
    console.log('[FileEditor] Tree resized to:', width);
    if (onStateChange) {
      onStateChange({ fileTreeWidth: width });
    }
  }, [onStateChange]);
  
  // Add resizable hook for file tree column
  const { width: fileTreeWidth, startResize } = useResizablePanel({
    defaultWidth: initialState?.fileTreeWidth || 256,  // Use saved width or default
    minWidth: 200,
    maxWidth: 400,
    storageKey: 'pane-file-tree-width',
    onResize: handleTreeResize
  });
  
  // Data URL for media file preview
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Save current file's state into the cache before switching
  const saveCurrentFileState = useCallback(() => {
    if (selectedFile && activeFilePath) {
      const editor = editorRef.current;
      const position = editor?.getPosition?.();
      const scrollTop = editor?.getScrollTop?.();
      // Compute media file type inline to avoid dependency ordering issues
      const ext = activeFilePath.split('.').pop()?.toLowerCase() || '';
      let mft: 'image' | 'pdf' | 'video' | 'audio' | null = null;
      if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) mft = 'image';
      else if (ext === 'pdf') mft = 'pdf';
      else if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) mft = 'video';
      else if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext)) mft = 'audio';

      fileTabStatesRef.current.set(activeFilePath, {
        filePath: activeFilePath,
        content: fileContent,
        originalContent,
        viewMode,
        gitStatus,
        cursorPosition: position ? { line: position.lineNumber, column: position.column } : undefined,
        scrollPosition: scrollTop,
        mediaDataUrl,
        mediaFileType: mft,
      });
    }
  }, [selectedFile, activeFilePath, fileContent, originalContent, viewMode, gitStatus, mediaDataUrl]);

  // Persist openFiles to panel state
  useEffect(() => {
    if (onStateChange) {
      onStateChange({ openFiles });
    }
  }, [openFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle closing a tab
  const handleCloseTab = useCallback((filePath: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setOpenFiles(prev => {
      const newFiles = prev.filter(f => f !== filePath);
      // If we're closing the active file, switch to another tab
      if (filePath === activeFilePath) {
        const closedIndex = prev.indexOf(filePath);
        const nextActive = newFiles.length > 0
          ? newFiles[Math.min(closedIndex, newFiles.length - 1)]
          : null;
        setActiveFilePath(nextActive);
        if (!nextActive) {
          setSelectedFile(null);
          setFileContent('');
          setOriginalContent('');
          setMediaDataUrl(null);
          setLatexPdfDataUrl(null);
          setShowLatexPreview(false);
        }
      }
      return newFiles;
    });
    // Remove from cache
    fileTabStatesRef.current.delete(filePath);
  }, [activeFilePath]);

  // Handle switching to a tab
  const handleSwitchTab = useCallback((filePath: string) => {
    if (filePath === activeFilePath) return;
    // Save current state
    saveCurrentFileState();
    setActiveFilePath(filePath);
    // Reset LaTeX preview when switching tabs
    setLatexPdfDataUrl(null);
    setShowLatexPreview(false);
    setLatexError(null);
    // Reset script output when switching tabs
    setShowScriptOutput(false);
    setScriptOutput(null);
    setScriptError(null);
  }, [activeFilePath, saveCurrentFileState]);

  // Track whether loadFile is driving the active file change (to avoid double-loading)
  const loadingFromDiskRef = useRef(false);

  // When activeFilePath changes (tab click), restore cached state
  useEffect(() => {
    if (!activeFilePath) return;
    // If loadFile is handling the loading, skip this effect
    if (loadingFromDiskRef.current) {
      loadingFromDiskRef.current = false;
      return;
    }

    const cached = fileTabStatesRef.current.get(activeFilePath);
    if (cached) {
      // Restore from cache
      const file: FileItem = {
        name: activeFilePath.split('/').pop() || '',
        path: activeFilePath,
        isDirectory: false
      };
      setSelectedFile(file);
      setFileContent(cached.content);
      setOriginalContent(cached.originalContent);
      setViewMode(cached.viewMode);
      setGitStatus(cached.gitStatus);
      setMediaDataUrl(cached.mediaDataUrl || null);
      setError(null);

      // Restore cursor and scroll position after editor renders
      if (cached.cursorPosition || cached.scrollPosition !== undefined) {
        setTimeout(() => {
          const editor = editorRef.current;
          if (editor) {
            if (cached.cursorPosition) {
              editor.setPosition({
                lineNumber: cached.cursorPosition.line,
                column: cached.cursorPosition.column
              });
              editor.revealPositionInCenter({
                lineNumber: cached.cursorPosition.line,
                column: cached.cursorPosition.column
              });
            }
            if (cached.scrollPosition !== undefined) {
              editor.setScrollTop(cached.scrollPosition);
            }
          }
        }, 50);
      }

      if (onStateChange) {
        onStateChange({ filePath: activeFilePath, isDirty: cached.content !== cached.originalContent });
      }
    }
    // If not cached and not from loadFile, it means we have a stale activeFilePath (e.g. from initial state)
    // which loadFile will handle via the initial file load effect below
  }, [activeFilePath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if this is a LaTeX file
  const isLatexFile = useMemo(() => {
    if (!selectedFile) return false;
    const ext = selectedFile.path.split('.').pop()?.toLowerCase();
    return ext === 'tex' || ext === 'latex';
  }, [selectedFile]);

  // Check if this is a markdown file
  const isMarkdownFile = useMemo(() => {
    if (!selectedFile) return false;
    const ext = selectedFile.path.split('.').pop()?.toLowerCase();
    return ext === 'md' || ext === 'markdown';
  }, [selectedFile]);

  // Check if this is a notebook file
  const isNotebookFile = useMemo(() => {
    if (!selectedFile) return false;
    const ext = selectedFile.path.split('.').pop()?.toLowerCase();
    return ext === 'ipynb';
  }, [selectedFile]);

  // Check if this is a runnable script file
  const isRunnableFile = useMemo(() => {
    if (!selectedFile) return false;
    const ext = selectedFile.path.split('.').pop()?.toLowerCase();
    return ['py', 'js', 'ts', 'sh', 'bat', 'ps1'].includes(ext || '');
  }, [selectedFile]);

  // Detect media file types for preview
  const mediaFileType = useMemo((): 'image' | 'pdf' | 'video' | 'audio' | null => {
    if (!selectedFile) return null;
    const ext = selectedFile.path.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio';
    return null;
  }, [selectedFile]);

  const loadFile = useCallback(async (file: FileItem | null) => {
    if (!file || file.isDirectory) return;

    // Save current tab state before switching
    saveCurrentFileState();

    // Add to open files if not already there
    setOpenFiles(prev => {
      if (!prev.includes(file.path)) {
        return [...prev, file.path];
      }
      return prev;
    });

    // Reset LaTeX preview when opening a new file
    setLatexPdfDataUrl(null);
    setShowLatexPreview(false);
    setLatexError(null);
    // Reset script output when opening a new file
    setShowScriptOutput(false);
    setScriptOutput(null);
    setScriptError(null);

    // If we have cached state for this file, let the useEffect handle restoring
    if (fileTabStatesRef.current.has(file.path)) {
      setActiveFilePath(file.path);
      setLoading(false);
      return;
    }

    // Mark that loadFile is driving this change so the effect doesn't double-load
    loadingFromDiskRef.current = true;
    setActiveFilePath(file.path);

    setLoading(true);
    setError(null);
    setGitStatus('clean');
    setMediaDataUrl(null);

    // Check if this is a media file that needs binary loading
    const ext = file.path.split('.').pop()?.toLowerCase() || '';
    const isMediaExt = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico',
      'pdf', 'mp4', 'webm', 'ogg', 'mov', 'avi',
      'mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext);

    if (isMediaExt) {
      // Load binary file as base64 for media preview
      setMediaLoading(true);
      try {
        const mimeMap: Record<string, string> = {
          png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
          svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp', ico: 'image/x-icon',
          pdf: 'application/pdf',
          mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', mov: 'video/quicktime', avi: 'video/x-msvideo',
          mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', aac: 'audio/aac', m4a: 'audio/mp4',
        };
        const mime = mimeMap[ext] || 'application/octet-stream';

        const result = await window.electronAPI.invoke('file:readBinary', {
          sessionId,
          filePath: file.path
        });

        if (result.success) {
          setMediaDataUrl(`data:${mime};base64,${result.base64}`);
          setFileContent('');
          setOriginalContent('');
          setSelectedFile(file);
          setViewMode('preview');

          if (onStateChange) {
            onStateChange({ filePath: file.path, isDirty: false });
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load media file');
      } finally {
        setMediaLoading(false);
        setLoading(false);
      }
      return;
    }

    try {
      const result = await window.electronAPI.invoke('file:read', {
        sessionId,
        filePath: file.path
      });

      if (result.success) {
        setFileContent(result.content);
        setOriginalContent(result.content);
        setSelectedFile(file);
        setViewMode('edit'); // Reset to edit mode when opening a new file
        
        // Notify parent about file change
        if (onFileChange) {
          onFileChange(file.path, false);
        }
        
        // After loading new file, we need to restore its position
        // This happens in handleEditorMount when editor re-renders
        // But we also need to tell parent the file path changed
        if (onStateChange) {
          onStateChange({ 
            filePath: file.path,
            isDirty: false 
          });
        }
        
        // If we have saved position for this file, restore it
        // The actual restoration happens in handleEditorMount
        // but we need to trigger a re-render with the right state
        if (editorRef.current && initialState?.filePath === file.path) {
          const monacoEditor = editorRef.current;
          
          // Restore cursor position
          if (initialState.cursorPosition && monacoEditor.setPosition) {
            const { line, column } = initialState.cursorPosition;
            setTimeout(() => {
              monacoEditor.setPosition({
                lineNumber: line,
                column: column
              });
              monacoEditor.revealPositionInCenter({
                lineNumber: line,
                column: column
              });
            }, 50);
          }
          
          // Restore scroll position
          if (initialState.scrollPosition !== undefined && monacoEditor.setScrollTop) {
            const scrollPos = initialState.scrollPosition;
            setTimeout(() => {
              monacoEditor.setScrollTop(scrollPos);
            }, 100);
          }
        }

        // Check git status for this file
        window.electronAPI.invoke('git:file-status', sessionId, file.path).then((statusResult: { success: boolean; data?: { status: 'clean' | 'modified' | 'untracked' } }) => {
          if (statusResult.success && statusResult.data) {
            setGitStatus(statusResult.data.status);
          }
        });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }, [sessionId, onFileChange, onStateChange, initialState, saveCurrentFileState]);


  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    
    // Now we have properly typed Monaco editor
    const monacoEditor = editor;
    
    // Track cursor position changes with debouncing
    const saveCursorPosition = debounce((position: { lineNumber: number; column: number }) => {
      if (onStateChange) {
        onStateChange({
          cursorPosition: {
            line: position.lineNumber,
            column: position.column
          }
        });
      }
    }, 500); // Debounce cursor position saves
    
    // Track scroll position changes with debouncing
    const saveScrollPosition = debounce((scrollTop: number) => {
      if (onStateChange) {
        onStateChange({
          scrollPosition: scrollTop
        });
      }
    }, 500); // Debounce scroll position saves
    
    // Listen for cursor position changes
    monacoEditor.onDidChangeCursorPosition?.((e: monaco.editor.ICursorPositionChangedEvent) => {
      saveCursorPosition(e.position);
    });
    
    // Listen for scroll position changes
    monacoEditor.onDidScrollChange?.((e: { scrollTop?: number; scrollLeft?: number }) => {
      if (e.scrollTop !== undefined) {
        saveScrollPosition(e.scrollTop);
      }
    });
    
    // Restore cursor and scroll position if available
    if (initialState?.cursorPosition && monacoEditor.setPosition) {
      const { line, column } = initialState.cursorPosition;
      setTimeout(() => {
        monacoEditor.setPosition({
          lineNumber: line,
          column: column
        });
        monacoEditor.revealPositionInCenter({
          lineNumber: line,
          column: column
        });
      }, 50); // Small delay to ensure editor is ready
    }
    
    if (initialState?.scrollPosition !== undefined && monacoEditor.setScrollTop) {
      // Delay to ensure editor is fully rendered and content is loaded
      const scrollPos = initialState.scrollPosition;
      setTimeout(() => {
        monacoEditor.setScrollTop(scrollPos);
      }, 100);
    }

    // Ctrl+S / Cmd+S: save file and auto-compile LaTeX
    monacoEditor.addAction({
      id: 'zync-save-and-compile',
      label: 'Save and Compile',
      keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS],
      run: () => {
        console.log('[LaTeX] Ctrl+S triggered, isLatex:', !!handleLatexCompileRef.current);
        if (handleLatexCompileRef.current) {
          handleLatexCompileRef.current();
        }
      }
    });

    // Also prevent browser default Ctrl+S
    editor.getDomNode()?.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    setFileContent(value || '');
    
    // Notify parent about dirty state
    if (onFileChange && selectedFile) {
      const isDirty = (value || '') !== originalContent;
      onFileChange(selectedFile.path, isDirty);
    }
  };

  // Auto-save functionality
  const autoSave = useCallback(
    debounce(async () => {
      if (!selectedFile || selectedFile.isDirectory || fileContent === originalContent) return;
      
      try {
        const result = await window.electronAPI.invoke('file:write', {
          sessionId,
          filePath: selectedFile.path,
          content: fileContent
        });
        
        if (result.success) {
          setOriginalContent(fileContent);

          // Notify parent that file is saved
          if (onFileChange && selectedFile) {
            onFileChange(selectedFile.path, false);
          }

          // Emit file saved event
          if (onStateChange) {
            onStateChange({
              filePath: selectedFile.path,
              isDirty: false
            });
          }

          // Re-check git status after save
          window.electronAPI.invoke('git:file-status', sessionId, selectedFile.path).then((statusResult: { success: boolean; data?: { status: 'clean' | 'modified' | 'untracked' } }) => {
            if (statusResult.success && statusResult.data) {
              setGitStatus(statusResult.data.status);
            }
          });
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to auto-save file');
      }
    }, 1000), // Auto-save after 1 second of inactivity
    [sessionId, selectedFile, fileContent, originalContent, onFileChange, onStateChange]
  );

  // Trigger auto-save when content changes
  useEffect(() => {
    if (fileContent !== originalContent && selectedFile && !selectedFile.isDirectory) {
      autoSave();
    }
  }, [fileContent, originalContent, selectedFile, autoSave]);

  // Re-check git status when git operations complete (e.g. commit from diff panel or terminal)
  useEffect(() => {
    if (!selectedFile) return;
    const handlePanelEvent = (event: CustomEvent) => {
      const { type } = event.detail || {};
      if (type === 'git:operation_completed' || type === 'diff:refreshed' || type === 'terminal:command_executed' || type === 'files:changed') {
        window.electronAPI.invoke('git:file-status', sessionId, selectedFile.path).then((statusResult: { success: boolean; data?: { status: 'clean' | 'modified' | 'untracked' } }) => {
          if (statusResult.success && statusResult.data) {
            setGitStatus(statusResult.data.status);
          }
        });
      }
    };
    window.addEventListener('panel:event', handlePanelEvent as EventListener);
    return () => window.removeEventListener('panel:event', handlePanelEvent as EventListener);
  }, [selectedFile, sessionId]);

  // Ref for Ctrl+S to access latex compile
  const handleLatexCompileRef = useRef<(() => void) | null>(null);

  // LaTeX compile handler
  const handleLatexCompile = useCallback(async () => {
    if (!selectedFile || !isLatexFile) return;

    setLatexCompiling(true);
    setLatexError(null);
    setLatexPdfDataUrl(null);

    try {
      // Force save before compiling so xelatex sees the latest content
      if (fileContent !== originalContent) {
        await window.electronAPI.invoke('file:write', {
          sessionId,
          filePath: selectedFile.path,
          content: fileContent
        });
        setOriginalContent(fileContent);
        console.log('[LaTeX] File saved before compilation');
      }

      const result = await window.electronAPI.invoke('file:compile-latex', {
        sessionId,
        filePath: selectedFile.path
      }) as { success: boolean; pdfPath?: string; error?: string; log?: string };

      if (result.success && result.pdfPath) {
        // Read the compiled PDF as binary
        // pdfPath is relative to worktree
        const pdfResult = await window.electronAPI.invoke('file:readBinary', {
          sessionId,
          filePath: result.pdfPath
        });

        if (pdfResult.success && pdfResult.base64) {
          // Add timestamp to force iframe refresh even if content is the same
          setLatexPdfDataUrl(`data:application/pdf;base64,${pdfResult.base64}#t=${Date.now()}`);
          setShowLatexPreview(true);
          console.log('[LaTeX] PDF loaded, base64 length:', pdfResult.base64.length);
        } else {
          console.error('[LaTeX] Failed to read PDF:', pdfResult);
          setLatexError(`Failed to read compiled PDF: ${pdfResult.error || 'No base64 data returned'}`);
        }
      } else {
        setLatexError(result.log || result.error || 'LaTeX compilation failed');
        setShowLatexPreview(true); // Show error panel
      }
    } catch (err) {
      setLatexError(err instanceof Error ? err.message : 'LaTeX compilation failed');
      setShowLatexPreview(true);
    } finally {
      setLatexCompiling(false);
    }
  }, [selectedFile, isLatexFile, sessionId, fileContent, originalContent]);

  // Keep ref in sync for Ctrl+S access
  useEffect(() => {
    handleLatexCompileRef.current = isLatexFile ? handleLatexCompile : null;
  }, [isLatexFile, handleLatexCompile]);

  // Script run handler
  const handleRunScript = useCallback(async () => {
    if (!selectedFile || !isRunnableFile) return;

    setScriptRunning(true);
    setScriptOutput(null);
    setScriptError(null);
    setShowScriptOutput(true);

    try {
      const result = await window.electronAPI.invoke('file:run-script', {
        sessionId,
        filePath: selectedFile.path
      }) as { success: boolean; output?: string; error?: string };

      if (result.success) {
        setScriptOutput(result.output || '(no output)');
      } else {
        setScriptOutput(result.output || null);
        setScriptError(result.error || 'Script execution failed');
      }
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : 'Script execution failed');
    } finally {
      setScriptRunning(false);
    }
  }, [selectedFile, isRunnableFile, sessionId]);

  // Load initial file if provided
  useEffect(() => {
    if (initialFilePath && !selectedFile) {
      const file: FileItem = {
        name: initialFilePath.split('/').pop() || '',
        path: initialFilePath,
        isDirectory: false
      };
      loadFile(file);
    }
  }, [initialFilePath, selectedFile, loadFile]);

  // Memoize the tree state change handler to prevent infinite loops
  const handleTreeStateChange = useCallback((treeState: { expandedDirs: string[]; searchQuery: string; showSearch: boolean }) => {
    console.log('[FileEditor] handleTreeStateChange called with:', treeState);
    if (onStateChange) {
      console.log('[FileEditor] Calling onStateChange');
      onStateChange({
        expandedDirs: treeState.expandedDirs,
        searchQuery: treeState.searchQuery,
        showSearch: treeState.showSearch
      });
    } else {
      console.log('[FileEditor] No onStateChange callback');
    }
  }, [onStateChange]);
  
  // Cleanup effect for Monaco editor models
  useEffect(() => {
    return () => {
      // Cleanup Monaco editor models when component unmounts or file changes
      try {
        if (editorRef.current && typeof editorRef.current === 'object' && editorRef.current !== null && 'getModel' in editorRef.current) {
          const editor = editorRef.current as { getModel: () => unknown, dispose?: () => void };
          const model = editor.getModel();
          if (model && typeof model === 'object' && model !== null && 'dispose' in model) {
            const typedModel = model as { dispose: () => void };
            console.log('[FileEditor] Disposing Monaco model');
            typedModel.dispose();
          }
        }
      } catch (error) {
        console.warn('[FileEditor] Error during Monaco cleanup:', error);
      }
    };
  }, [selectedFile?.path]); // Run cleanup when file changes

  // Editor content area (reusable between normal and split view)
  const editorContentArea = (
    <>
      {mediaFileType && mediaDataUrl ? (
        <div className="h-full overflow-auto bg-bg-primary flex items-center justify-center p-4">
          {mediaFileType === 'image' && (
            <img
              src={mediaDataUrl}
              alt={selectedFile?.name || ''}
              className="max-w-full max-h-full object-contain"
            />
          )}
          {mediaFileType === 'pdf' && (
            <iframe
              src={mediaDataUrl}
              title={selectedFile?.name || ''}
              className="w-full h-full border-0"
            />
          )}
          {mediaFileType === 'video' && (
            <video
              src={mediaDataUrl}
              controls
              className="max-w-full max-h-full"
            >
              Your browser does not support video playback.
            </video>
          )}
          {mediaFileType === 'audio' && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-4xl text-text-tertiary">&#9835;</div>
              <span className="text-sm text-text-secondary">{selectedFile?.name || ''}</span>
              <audio
                src={mediaDataUrl}
                controls
                className="w-80"
              >
                Your browser does not support audio playback.
              </audio>
            </div>
          )}
        </div>
      ) : mediaFileType && mediaLoading ? (
        <div className="h-full flex items-center justify-center text-text-secondary">
          Loading preview...
        </div>
      ) : viewMode === 'preview' && isMarkdownFile ? (
        <div className="h-full overflow-auto bg-bg-primary">
          <MarkdownPreview
            content={fileContent}
            className="min-h-full"
            id={`file-editor-preview-${sessionId}-${selectedFile?.path.replace(/[^a-zA-Z0-9]/g, '-') || ''}`}
          />
        </div>
      ) : viewMode === 'preview' && isNotebookFile ? (
        <div className="h-full overflow-auto bg-bg-primary">
          <NotebookPreview
            content={fileContent}
            className="min-h-full"
          />
        </div>
      ) : (
        <MonacoErrorBoundary>
          <Editor
            theme={isDarkMode ? 'vs-dark' : 'light'}
            value={fileContent}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
            }}
            language={getLanguageFromPath(selectedFile?.path || '')}
          />
        </MonacoErrorBoundary>
      )}
    </>
  );

  return (
    <div className="h-full flex">
      <div
        className="bg-surface-secondary border-r border-border-primary relative flex-shrink-0"
        style={{ width: `${fileTreeWidth}px` }}
      >
        <HeadlessFileTree
          sessionId={sessionId}
          onFileSelect={loadFile}
          selectedPath={selectedFile?.path || null}
          initialExpandedDirs={initialState?.expandedDirs}
          initialSearchQuery={initialState?.searchQuery}
          initialShowSearch={initialState?.showSearch}
          onTreeStateChange={handleTreeStateChange}
        />

        {/* Resize handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize group z-10"
          onMouseDown={startResize}
        >
          {/* Visual indicator */}
          <div className="absolute inset-0 bg-border-primary group-hover:bg-interactive transition-colors" />
          {/* Larger grab area */}
          <div className="absolute -left-2 -right-2 top-0 bottom-0" />
          {/* Drag indicator dots */}
          <div className="absolute top-1/2 -translate-y-1/2 right-0 transform translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex flex-col gap-1">
              <div className="w-1 h-1 bg-interactive rounded-full" />
              <div className="w-1 h-1 bg-interactive rounded-full" />
              <div className="w-1 h-1 bg-interactive rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        {openFiles.length > 0 && (
          <div className="flex items-center bg-surface-secondary border-b border-border-primary overflow-x-auto flex-shrink-0 scrollbar-thin">
            {openFiles.map((filePath) => {
              const fileName = filePath.split('/').pop() || filePath;
              const isActive = filePath === activeFilePath;
              const cachedState = fileTabStatesRef.current.get(filePath);
              const tabIsDirty = isActive
                ? hasUnsavedChanges
                : cachedState ? cachedState.content !== cachedState.originalContent : false;

              return (
                <div
                  key={filePath}
                  className={`group flex items-center gap-1 px-3 py-1.5 cursor-pointer border-r border-border-primary text-sm whitespace-nowrap select-none transition-colors ${
                    isActive
                      ? 'bg-bg-primary text-text-primary border-b-2 border-b-interactive'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary border-b-2 border-b-transparent'
                  }`}
                  onClick={() => handleSwitchTab(filePath)}
                  title={filePath}
                  onMouseDown={(e) => {
                    // Middle-click to close tab
                    if (e.button === 1) {
                      e.preventDefault();
                      handleCloseTab(filePath);
                    }
                  }}
                >
                  <File className="w-3.5 h-3.5 flex-shrink-0 text-text-tertiary" />
                  <span className="max-w-[120px] truncate">{fileName}</span>
                  {tabIsDirty && (
                    <span className="text-status-warning text-xs flex-shrink-0">●</span>
                  )}
                  <button
                    className={`p-0.5 rounded flex-shrink-0 transition-opacity ${
                      isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
                    } hover:bg-surface-tertiary`}
                    onClick={(e) => handleCloseTab(filePath, e)}
                    title="Close"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {selectedFile ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-surface-secondary border-b border-border-primary flex-shrink-0">
              <div className="flex items-center gap-2">
                {gitStatus !== 'clean' && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    gitStatus === 'untracked'
                      ? 'bg-status-success text-white'
                      : 'bg-interactive text-white'
                  }`}>
                    {gitStatus === 'untracked' ? 'U' : 'M'}
                  </span>
                )}
                <span className="text-xs text-text-tertiary truncate max-w-[300px]">{selectedFile.path}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Run Script button */}
                {isRunnableFile && !mediaFileType && !isLatexFile && (
                  <button
                    onClick={handleRunScript}
                    disabled={scriptRunning}
                    className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                      scriptRunning
                        ? 'bg-surface-tertiary text-text-tertiary cursor-not-allowed'
                        : 'bg-status-success hover:bg-status-success/80 text-white'
                    }`}
                    title="Run script"
                  >
                    {scriptRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    {scriptRunning ? 'Running...' : 'Run'}
                  </button>
                )}
                {/* LaTeX Compile & Preview button */}
                {isLatexFile && !mediaFileType && (
                  <button
                    onClick={handleLatexCompile}
                    disabled={latexCompiling}
                    className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                      latexCompiling
                        ? 'bg-surface-tertiary text-text-tertiary cursor-not-allowed'
                        : 'bg-interactive hover:bg-interactive-hover text-white'
                    }`}
                    title="Compile LaTeX and preview PDF"
                  >
                    {latexCompiling ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    {latexCompiling ? 'Compiling...' : 'Compile & Preview'}
                  </button>
                )}
                {/* Preview Toggle for Markdown/Notebook Files (not shown for media files) */}
                {!mediaFileType && (isMarkdownFile || isNotebookFile) && (
                  <div className="flex items-center rounded-lg border border-border-primary bg-surface-tertiary">
                    <button
                      onClick={() => setViewMode('edit')}
                      className={`px-2 py-1 text-xs font-medium rounded-l-lg transition-colors flex items-center gap-1 ${
                        viewMode === 'edit'
                          ? 'bg-interactive text-white'
                          : 'text-text-secondary hover:bg-surface-hover'
                      }`}
                      title="Edit mode"
                    >
                      <Code className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`px-2 py-1 text-xs font-medium rounded-r-lg transition-colors flex items-center gap-1 ${
                        viewMode === 'preview'
                          ? 'bg-interactive text-white'
                          : 'text-text-secondary hover:bg-surface-hover'
                      }`}
                      title="Preview mode"
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                  </div>
                )}
                {mediaFileType && (
                  <div className="flex items-center gap-1 text-xs text-text-tertiary">
                    <Eye className="w-3 h-3" />
                    <span>{mediaFileType.charAt(0).toUpperCase() + mediaFileType.slice(1)} Preview</span>
                  </div>
                )}
                {!mediaFileType && (
                  <div className="flex items-center gap-2 text-sm">
                    {hasUnsavedChanges ? (
                      <>
                        <div className="w-2 h-2 bg-status-warning rounded-full animate-pulse" />
                        <span className="text-status-warning text-xs">Auto-saving...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-status-success rounded-full" />
                        <span className="text-status-success text-xs">Saved</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            {error && (
              <div className="px-4 py-2 bg-status-error/20 text-status-error text-sm flex-shrink-0">
                Error: {error}
              </div>
            )}
            {/* Main content area: split view for LaTeX, normal view otherwise */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className={`${showScriptOutput ? 'flex-1 min-h-0' : 'h-full'} overflow-hidden`}>
                {isLatexFile && showLatexPreview ? (
                  <div className="h-full flex" ref={splitContainerRef}>
                    {/* Editor side */}
                    <div className="min-w-0 overflow-hidden" style={{ width: `${splitPercent}%` }}>
                      {editorContentArea}
                    </div>
                    {/* Draggable divider */}
                    <div
                      className="w-1 bg-border-primary flex-shrink-0 cursor-col-resize hover:bg-interactive/50 active:bg-interactive transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const container = splitContainerRef.current;
                        if (!container) return;
                        const startX = e.clientX;
                        const startPercent = splitPercent;
                        const containerWidth = container.offsetWidth;
                        const onMouseMove = (ev: MouseEvent) => {
                          const delta = ev.clientX - startX;
                          const newPercent = Math.max(20, Math.min(80, startPercent + (delta / containerWidth) * 100));
                          setSplitPercent(newPercent);
                        };
                        const onMouseUp = () => {
                          document.removeEventListener('mousemove', onMouseMove);
                          document.removeEventListener('mouseup', onMouseUp);
                          document.body.style.cursor = '';
                          document.body.style.userSelect = '';
                        };
                        document.body.style.cursor = 'col-resize';
                        document.body.style.userSelect = 'none';
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                      }}
                    />
                    {/* PDF preview / error side */}
                    <div className="min-w-0 flex flex-col overflow-hidden" style={{ width: `${100 - splitPercent}%` }}>
                      <div className="flex items-center justify-between px-3 py-1 bg-surface-secondary border-b border-border-primary flex-shrink-0">
                        <span className="text-xs text-text-secondary font-medium">PDF Preview</span>
                        <button
                          onClick={() => { setShowLatexPreview(false); setLatexError(null); }}
                          className="p-0.5 rounded hover:bg-surface-hover text-text-tertiary hover:text-text-primary"
                          title="Close preview"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-auto">
                        {latexPdfDataUrl ? (
                          <iframe
                            src={latexPdfDataUrl}
                            title="LaTeX PDF Preview"
                            className="w-full h-full border-0"
                          />
                        ) : latexError ? (
                          <div className="p-4">
                            <div className="text-sm font-medium text-status-error mb-2">Compilation Error</div>
                            <pre className="text-xs text-text-secondary bg-surface-tertiary rounded p-3 overflow-auto max-h-full whitespace-pre-wrap font-mono">
                              {latexError}
                            </pre>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-text-tertiary text-sm">
                            Click &quot;Compile &amp; Preview&quot; to generate PDF
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  editorContentArea
                )}
              </div>
              {/* Script output panel */}
              {showScriptOutput && (
                <>
                  <div className="h-px bg-border-primary flex-shrink-0" />
                  <div className="flex flex-col flex-shrink-0" style={{ height: '200px' }}>
                    <div className="flex items-center justify-between px-3 py-1 bg-surface-secondary border-b border-border-primary flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary font-medium">Output</span>
                        {scriptRunning && (
                          <Loader2 className="w-3 h-3 animate-spin text-text-tertiary" />
                        )}
                        {!scriptRunning && scriptError && (
                          <span className="text-xs text-status-error">Exit with error</span>
                        )}
                        {!scriptRunning && !scriptError && scriptOutput !== null && (
                          <span className="text-xs text-status-success">Done</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setScriptOutput(null); setScriptError(null); }}
                          className="px-1.5 py-0.5 text-xs rounded hover:bg-surface-hover text-text-tertiary hover:text-text-primary"
                          title="Clear output"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => { setShowScriptOutput(false); setScriptOutput(null); setScriptError(null); }}
                          className="p-0.5 rounded hover:bg-surface-hover text-text-tertiary hover:text-text-primary"
                          title="Close output panel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-bg-primary">
                      <pre className="text-xs text-text-secondary p-3 whitespace-pre-wrap font-mono">
                        {scriptRunning && !scriptOutput && 'Running script...'}
                        {scriptOutput}
                        {scriptError && (
                          <span className="text-status-error">{scriptOutput ? '\n' : ''}{scriptError}</span>
                        )}
                        {!scriptRunning && !scriptOutput && !scriptError && '(no output)'}
                      </pre>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            {loading ? 'Loading...' : 'Select a file to edit'}
          </div>
        )}
      </div>
    </div>
  );
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    ipynb: 'json',
    md: 'markdown',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    java: 'java',
    cs: 'csharp',
    php: 'php',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    fish: 'shell',
    ps1: 'powershell',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    sql: 'sql',
    graphql: 'graphql',
    vue: 'vue',
    svelte: 'svelte',
    tex: 'latex',
    latex: 'latex',
  };
  
  return languageMap[ext || ''] || 'plaintext';
}