import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { findCliNodeScript } from '../nodeFinder';
import { existsSync, readFileSync, readdirSync } from 'fs';

vi.mock('fs');

describe('findCliNodeScript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Bin stub is treated as unreadable so resolution falls through to package search
    (readFileSync as unknown as Mock).mockImplementation(() => {
      throw new Error('binary file');
    });
  });

  it('resolves the pnpm-installed Copilot CLI to the @github/copilot entry', () => {
    const binPath = '/proj/node_modules/.bin/copilot';
    const expected = '/proj/node_modules/.pnpm/@github+copilot@1.0.65/node_modules/@github/copilot/index.js';

    (existsSync as unknown as Mock).mockImplementation(
      (p: string) => p === '/proj/node_modules/.pnpm' || p === expected
    );
    (readdirSync as unknown as Mock).mockReturnValue(['@github+copilot@1.0.65']);

    expect(findCliNodeScript(binPath)).toBe(expected);
  });

  it('resolves the pnpm-installed Codex CLI alongside Copilot', () => {
    const binPath = '/proj/node_modules/.bin/codex';
    const expected = '/proj/node_modules/.pnpm/@openai+codex@1.0.0/node_modules/@openai/codex/bin/codex.js';

    (existsSync as unknown as Mock).mockImplementation(
      (p: string) => p === '/proj/node_modules/.pnpm' || p === expected
    );
    (readdirSync as unknown as Mock).mockReturnValue(['@openai+codex@1.0.0']);

    expect(findCliNodeScript(binPath)).toBe(expected);
  });
});
