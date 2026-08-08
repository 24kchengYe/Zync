export function getWorkspaceLayoutGridCellClassName() {
  return 'h-full min-h-0 min-w-0 overflow-hidden';
}

export function getWorkspaceLayoutSlotFrameClassName(isFocused: boolean) {
  return [
    'relative',
    'flex',
    'h-full',
    'min-h-0',
    'min-w-0',
    'flex-col',
    'overflow-hidden',
    'rounded-lg',
    'border',
    'bg-surface-primary/60',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
    'transition-colors',
    isFocused ? 'border-border-focus' : 'border-border-primary/80',
  ].join(' ');
}
