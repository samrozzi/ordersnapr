import { useHotkeys } from 'react-hotkeys-hook';

interface KeyboardShortcutsOptions {
  onAddBlockBelow?: () => void;
  onAddBlockAbove?: () => void;
  onDuplicateBlock?: () => void;
  onDeleteBlock?: () => void;
  onMoveBlockUp?: () => void;
  onMoveBlockDown?: () => void;
  onTogglePresentationMode?: () => void;
  onToggleCheckbox?: () => void;
  onShowHelp?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const {
    onAddBlockBelow,
    onAddBlockAbove,
    onDuplicateBlock,
    onDeleteBlock,
    onMoveBlockUp,
    onMoveBlockDown,
    onTogglePresentationMode,
    onToggleCheckbox,
    onShowHelp,
  } = options;

  // Block operations
  useHotkeys('mod+enter', (e) => {
    e.preventDefault();
    onAddBlockBelow?.();
  }, { enableOnFormTags: true });

  useHotkeys('mod+shift+enter', (e) => {
    e.preventDefault();
    onAddBlockAbove?.();
  }, { enableOnFormTags: true });

  useHotkeys('mod+d', (e) => {
    e.preventDefault();
    onDuplicateBlock?.();
  }, { enableOnFormTags: true });

  useHotkeys('mod+shift+backspace', (e) => {
    e.preventDefault();
    onDeleteBlock?.();
  }, { enableOnFormTags: true });

  // Navigation
  useHotkeys('mod+shift+up', (e) => {
    e.preventDefault();
    onMoveBlockUp?.();
  }, { enableOnFormTags: true });

  useHotkeys('mod+shift+down', (e) => {
    e.preventDefault();
    onMoveBlockDown?.();
  }, { enableOnFormTags: true });

  // View
  useHotkeys('mod+p', (e) => {
    e.preventDefault();
    onTogglePresentationMode?.();
  }, { enableOnFormTags: true });

  useHotkeys('mod+/', (e) => {
    e.preventDefault();
    onShowHelp?.();
  }, { enableOnFormTags: true });

  // Checklist
  useHotkeys('mod+shift+c', (e) => {
    e.preventDefault();
    onToggleCheckbox?.();
  }, { enableOnFormTags: true });
}
