import { describe, expect, it } from 'vitest';
import {
  getWorkspaceLayoutGridCellClassName,
  getWorkspaceLayoutSlotFrameClassName,
} from '../../../../UpdateWuruize/frontend/WorkspaceLayoutSurfaceClasses';

describe('workspace layout surface class contracts', () => {
  it('keeps each grid cell clipped to avoid panel overflow between rows', () => {
    const className = getWorkspaceLayoutGridCellClassName();

    expect(className).toContain('h-full');
    expect(className).toContain('min-h-0');
    expect(className).toContain('min-w-0');
    expect(className).toContain('overflow-hidden');
  });

  it('makes each slot frame fill the full cell height', () => {
    const className = getWorkspaceLayoutSlotFrameClassName(false);

    expect(className).toContain('h-full');
    expect(className).toContain('overflow-hidden');
    expect(className).toContain('flex-col');
  });
});
