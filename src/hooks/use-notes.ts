import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { usePremiumAccess } from "./use-premium-access";
import { toast } from "sonner";

export interface NoteBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'checklist' | 'table' | 'image' | 'divider';
  content?: string;
  level?: number; // for headings
  items?: Array<{ id: string; checked: boolean; text: string }>; // for checklists
  rows?: any[]; // for tables
  url?: string; // for images
  caption?: string; // for images
}

export interface NoteContent {
  blocks: NoteBlock[];
}

export interface Note {
  id: string;
  user_id: string;
  org_id: string | null;
  title: string;
  content: NoteContent;
  background_color: string | null;
  banner_image: string | null;
  is_favorite: boolean;
  is_pinned: boolean;
  kanban_position: number | null;
  kanban_column: string | null;
  view_mode: 'note' | 'checklist' | 'canvas' | 'table';
  created_at: string;
  updated_at: string;
}

export interface UserNotesPreferences {
  id: string;
  user_id: string;
  default_view: 'list' | 'kanban';
  sidebar_dropdown_open: boolean;
  kanban_columns: string[];
  list_sort_by: string;
  list_sort_order: 'asc' | 'desc';
  created_at: string;
  updated_at: string;
}

const FREE_TIER_NOTE_LIMIT = 10;

export function useNotes() {
  const { user } = useAuth();
  const { hasPremiumAccess } = usePremiumAccess();
  const queryClient = useQueryClient();

  // Fetch all notes for the user
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching notes:", error);
        throw error;
      }

      return data as Note[];
    },
    enabled: !!user,
  });

  // Fetch user preferences
  const { data: preferences } = useQuery({
    queryKey: ["user-notes-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_notes_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching preferences:", error);
        throw error;
      }

      return data as UserNotesPreferences | null;
    },
    enabled: !!user,
  });

  // Check if user can create more notes
  const canCreateNote = (): boolean => {
    if (hasPremiumAccess) return true;
    return notes.length < FREE_TIER_NOTE_LIMIT;
  };

  // Create note mutation
  const createNote = useMutation({
    mutationFn: async (noteData: Partial<Note>) => {
      if (!user) throw new Error("User required");

      if (!canCreateNote()) {
        throw new Error(`Free tier users can create up to ${FREE_TIER_NOTE_LIMIT} notes. Upgrade for unlimited notes.`);
      }

      const { data, error } = await supabase
        .from("notes")
        .insert([
          {
            ...noteData,
            user_id: user.id,
            content: noteData.content || { blocks: [] },
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
      toast.success("Note created successfully");
    },
    onError: (error: any) => {
      console.error("Error creating note:", error);
      toast.error(error.message || "Failed to create note");
    },
  });

  // Update note mutation
  const updateNote = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Note> }) => {
      const { data, error } = await supabase
        .from("notes")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
    },
    onError: (error: any) => {
      console.error("Error updating note:", error);
      toast.error(error.message || "Failed to update note");
    },
  });

  // Delete note mutation
  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
      toast.success("Note deleted successfully");
    },
    onError: (error: any) => {
      console.error("Error deleting note:", error);
      toast.error(error.message || "Failed to delete note");
    },
  });

  // Toggle favorite
  const toggleFavorite = useMutation({
    mutationFn: async (id: string) => {
      const note = notes.find(n => n.id === id);
      if (!note) throw new Error("Note not found");

      const { error } = await supabase
        .from("notes")
        .update({ is_favorite: !note.is_favorite })
        .eq("id", id)
        .eq("user_id", user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
    },
  });

  // Toggle pin
  const togglePin = useMutation({
    mutationFn: async (id: string) => {
      const note = notes.find(n => n.id === id);
      if (!note) throw new Error("Note not found");

      const { error } = await supabase
        .from("notes")
        .update({ is_pinned: !note.is_pinned })
        .eq("id", id)
        .eq("user_id", user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
    },
  });

  // Update kanban position
  const updateKanbanPosition = useMutation({
    mutationFn: async ({ id, column, position }: { id: string; column: string; position: number }) => {
      const { error } = await supabase
        .from("notes")
        .update({
          kanban_column: column,
          kanban_position: position
        })
        .eq("id", id)
        .eq("user_id", user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
    },
  });

  // Update or create user preferences
  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<UserNotesPreferences>) => {
      if (!user) throw new Error("User required");

      // Try to update first
      const { data: existing } = await supabase
        .from("user_notes_preferences")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from("user_notes_preferences")
          .update(updates)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("user_notes_preferences")
          .insert([
            {
              ...updates,
              user_id: user.id,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notes-preferences", user?.id] });
    },
  });

  // Get pinned notes for sidebar
  const pinnedNotes = notes.filter(note => note.is_pinned);

  return {
    notes,
    pinnedNotes,
    isLoading,
    preferences,
    canCreateNote: canCreateNote(),
    notesRemaining: hasPremiumAccess ? Infinity : FREE_TIER_NOTE_LIMIT - notes.length,
    createNote: createNote.mutateAsync,
    updateNote: updateNote.mutateAsync,
    deleteNote: deleteNote.mutateAsync,
    toggleFavorite: toggleFavorite.mutateAsync,
    togglePin: togglePin.mutateAsync,
    updateKanbanPosition: updateKanbanPosition.mutateAsync,
    updatePreferences: updatePreferences.mutateAsync,
  };
}
