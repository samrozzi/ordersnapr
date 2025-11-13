import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid, List, Star, Pin, Archive } from "lucide-react";
import { useNotes } from "@/hooks/use-notes";
import { usePremiumAccess } from "@/hooks/use-premium-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OptimizedNoteEditor } from "@/components/notes/OptimizedNoteEditor";
import { NoteCard } from "@/components/NoteCard";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TemplatePickerDialog } from "@/components/TemplatePickerDialog";
import { ArchivedNotes } from "@/components/ArchivedNotes";
import type { Note, NoteTemplate } from "@/hooks/use-notes";
import { format } from "date-fns";

const Notes = () => {
  const { notes, archivedNotes, pinnedNotes, isLoading, canCreateNote, notesRemaining, createNote, preferences, updatePreferences, templates, toggleFavorite, togglePin, archiveNote, restoreNote, permanentlyDeleteNote } = useNotes();
  const { hasPremiumAccess } = usePremiumAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState(preferences?.list_sort_by || "updated_at");
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(preferences?.default_view || 'list');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Open note from query parameter (for pinned notes in sidebar)
  useEffect(() => {
    const noteId = searchParams.get('id');
    if (noteId && notes.length > 0) {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        setSelectedNote(note);
        setSearchParams({}); // Clear the query param
      }
    }
  }, [searchParams, notes, setSearchParams]);

  // Persist sort preference
  useEffect(() => {
    if (preferences && sortBy !== preferences.list_sort_by) {
      updatePreferences({ list_sort_by: sortBy });
    }
  }, [sortBy, preferences, updatePreferences]);

  // Filter notes by search query (title and content)
  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    
    // Search in title
    if (note.title.toLowerCase().includes(query)) return true;
    
    // Search in content blocks
    return note.content.blocks.some(block => {
      // Strip HTML tags and search text content
      const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').toLowerCase();
      
      switch (block.type) {
        case 'paragraph':
        case 'heading':
          return stripHtml(block.content || '').includes(query);
        case 'checklist':
          return block.items?.some(item => stripHtml(item.text || '').includes(query)) || false;
        case 'table':
          return block.rows?.some(row => 
            row.some((cell: any) => (cell.content || '').toLowerCase().includes(query))
          ) || false;
        case 'date':
          return (block.date || '').toLowerCase().includes(query);
        case 'time':
          return (block.time || '').toLowerCase().includes(query);
        default:
          return false;
      }
    });
  });

  // Sort notes
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "created_at":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "updated_at":
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
  });

  // Separate by categories
  const favoriteNotes = sortedNotes.filter(n => n.is_favorite);
  const regularNotes = sortedNotes.filter(n => !n.is_favorite && !n.is_pinned);

  const handleCreateNote = () => {
    if (!canCreateNote) {
      return;
    }
    setShowTemplatePicker(true);
  };

  const handleCreateBlankNote = async () => {
    try {
      const newNote = await createNote({
        title: "Untitled Note",
        content: { blocks: [{ id: `block-${Date.now()}`, type: 'paragraph', content: '' }] },
      });
      setSelectedNote(newNote as unknown as Note);
      setShowTemplatePicker(false);
    } catch (error) {
      // Error already handled by hook
    }
  };

  const handleCreateFromTemplate = async (template: NoteTemplate) => {
    try {
      const newNote = await createNote({
        title: template.default_title,
        content: { blocks: template.default_blocks },
        template_id: template.id,
      });
      setSelectedNote(newNote as unknown as Note);
      setShowTemplatePicker(false);
    } catch (error) {
      // Error already handled by hook
    }
  };

  const handleViewModeChange = async (mode: 'list' | 'kanban') => {
    setViewMode(mode);
    await updatePreferences({ default_view: mode });
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setIsCustomizeMode(false);
  };

  const handleCloseNote = () => {
    setSelectedNote(null);
    setIsCustomizeMode(false);
  };

  const handleCustomize = () => {
    setIsCustomizeMode(true);
  };

  const handleBackToView = () => {
    // Refresh the selected note with latest data from the notes array
    if (selectedNote) {
      const updatedNote = notes.find(n => n.id === selectedNote.id);
      if (updatedNote) {
        setSelectedNote(updatedNote);
      }
    }
    setIsCustomizeMode(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notes</h1>
          <p className="text-muted-foreground">
            Your personal workspace for ideas, lists, and more
          </p>
          {!canCreateNote && (
            <p className="text-sm text-destructive mt-1">
              Free tier limit reached ({notesRemaining} notes remaining). Upgrade for unlimited notes.
            </p>
          )}
        </div>

        <Button onClick={handleCreateNote} disabled={!canCreateNote}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5 md:gap-4">
        <Card className="h-14 md:h-auto">
          <CardHeader className="pb-0 px-1 md:pb-2 md:px-6 text-center">
            <CardDescription className="text-[9px] md:text-sm">Total</CardDescription>
          </CardHeader>
          <CardContent className="p-1 md:pt-3 md:px-6 text-center">
            <div className="text-base md:text-2xl font-bold">{notes.length}</div>
          </CardContent>
        </Card>

        <Card className="h-14 md:h-auto">
          <CardHeader className="pb-0 px-1 md:pb-2 md:px-6 text-center">
            <CardDescription className="text-[9px] md:text-sm">Pinned</CardDescription>
          </CardHeader>
          <CardContent className="p-1 md:pt-3 md:px-6 text-center">
            <div className="text-base md:text-2xl font-bold">{pinnedNotes.length}</div>
          </CardContent>
        </Card>

        <Card className="h-14 md:h-auto">
          <CardHeader className="pb-0 px-1 md:pb-2 md:px-6 text-center">
            <CardDescription className="text-[9px] md:text-sm">Favs</CardDescription>
          </CardHeader>
          <CardContent className="p-1 md:pt-3 md:px-6 text-center">
            <div className="text-base md:text-2xl font-bold">{favoriteNotes.length}</div>
          </CardContent>
        </Card>

        <Card className="h-14 md:h-auto">
          <CardHeader className="pb-0 px-1 md:pb-2 md:px-6 text-center">
            <CardDescription className="text-[9px] md:text-sm">
              {canCreateNote ? "Left" : "Upgrade"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-1 md:pt-3 md:px-6 text-center">
            <div className="text-base md:text-2xl font-bold">
              {notesRemaining === Infinity ? "∞" : notesRemaining}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at">Last Updated</SelectItem>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('kanban')}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Notes Content */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({notes.length})</TabsTrigger>
          <TabsTrigger value="pinned">
            <Pin className="h-3 w-3 mr-1" />
            Pinned ({pinnedNotes.length})
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="h-3 w-3 mr-1" />
            Favorites ({favoriteNotes.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Archived ({archivedNotes.length})</span>
            <span className="sm:hidden">({archivedNotes.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {viewMode === 'list' ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {sortedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => handleNoteClick(note)}
                />
              ))}
              {sortedNotes.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  {searchQuery ? "No notes found" : "No notes yet. Create your first note!"}
                </div>
              )}
            </div>
          ) : (
            <KanbanBoard
              notes={sortedNotes}
              onNoteClick={handleNoteClick}
            />
          )}
        </TabsContent>

        <TabsContent value="pinned" className="mt-4">
          {viewMode === 'list' ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => handleNoteClick(note)}
                />
              ))}
              {pinnedNotes.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No pinned notes. Pin notes to see them here and in the sidebar.
                </div>
              )}
            </div>
          ) : (
            <KanbanBoard
              notes={pinnedNotes}
              onNoteClick={handleNoteClick}
            />
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          {viewMode === 'list' ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => handleNoteClick(note)}
                />
              ))}
              {favoriteNotes.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No favorite notes. Mark notes as favorites to see them here.
                </div>
              )}
            </div>
          ) : (
            <KanbanBoard
              notes={favoriteNotes}
              onNoteClick={handleNoteClick}
            />
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          <ArchivedNotes 
            archivedNotes={archivedNotes}
            hasPremiumAccess={hasPremiumAccess()}
            onRestore={(id) => restoreNote(id)}
            onPermanentDelete={(id) => permanentlyDeleteNote(id)}
          />
        </TabsContent>
      </Tabs>

      {/* Template Picker Dialog */}
      <TemplatePickerDialog
        open={showTemplatePicker}
        onOpenChange={setShowTemplatePicker}
        templates={templates}
        onSelectTemplate={handleCreateFromTemplate}
        onCreateBlank={handleCreateBlankNote}
      />

      {/* Optimized Note Editor */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && handleCloseNote()}>
        <DialogContent hideClose className="max-w-5xl h-[100svh] md:h-[90vh] p-0 md:rounded-lg rounded-none overflow-hidden">
          {selectedNote && (
            <OptimizedNoteEditor
              note={selectedNote}
              onClose={handleCloseNote}
              onCustomize={handleCustomize}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notes;
