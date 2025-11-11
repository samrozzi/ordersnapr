/**
 * Mention Textarea Component
 * Textarea with @mention autocomplete functionality
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUserSearch } from '@/hooks/use-mentions';
import type { MentionableUser } from '@/lib/collaboration-types';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
  onSubmit?: () => void;
}

export function MentionTextarea({
  value,
  onChange,
  placeholder = 'Type @ to mention someone...',
  className,
  minRows = 3,
  disabled = false,
  onSubmit,
}: MentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: users = [] } = useUserSearch(mentionQuery, showSuggestions);

  // Detect @ mentions
  const handleTextChange = (newValue: string) => {
    onChange(newValue);

    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newValue.slice(0, cursorPos);

    // Find the last @ symbol before cursor
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      // Check if @ is at start or preceded by whitespace
      const charBeforeAt = textBeforeCursor[lastAtSymbol - 1];
      if (lastAtSymbol === 0 || !charBeforeAt || /\s/.test(charBeforeAt)) {
        const queryAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
        // Check if there's no whitespace after @
        if (!/\s/.test(queryAfterAt)) {
          setMentionQuery(queryAfterAt);
          setMentionStartPos(lastAtSymbol);
          setShowSuggestions(true);
          setSelectedIndex(0);
          return;
        }
      }
    }

    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStartPos(null);
  };

  // Insert mention
  const insertMention = (user: MentionableUser) => {
    if (mentionStartPos === null || !textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBefore = value.slice(0, mentionStartPos);
    const textAfter = value.slice(cursorPos);

    const mention = user.username ? `@${user.username}` : `@${user.email}`;
    const newValue = `${textBefore}${mention} ${textAfter}`;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStartPos(null);

    // Set cursor position after mention
    setTimeout(() => {
      const newCursorPos = mentionStartPos + mention.length + 1;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      textareaRef.current?.focus();
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || users.length === 0) {
      // Allow Cmd/Ctrl+Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, users.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;

      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (users[selectedIndex]) {
          insertMention(users[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setMentionQuery('');
        setMentionStartPos(null);
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !textareaRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        rows={minRows}
        disabled={disabled}
      />

      {/* Mention Suggestions */}
      {showSuggestions && users.length > 0 && (
        <Card
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto z-50"
        >
          <div className="py-1">
            {users.map((user, index) => (
              <button
                key={user.id}
                type="button"
                className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-muted transition-colors ${
                  index === selectedIndex ? 'bg-muted' : ''
                }`}
                onClick={() => insertMention(user)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {user.full_name
                      ? user.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                      : user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">
                    {user.full_name || user.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user.username ? `@${user.username}` : user.email}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground mt-1">
        Type <kbd className="px-1 py-0.5 bg-muted rounded text-xs">@</kbd> to mention a
        teammate
        {onSubmit && (
          <>
            {' • '}
            <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Cmd</kbd>
            {'+'}
            <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to post
          </>
        )}
      </p>
    </div>
  );
}
