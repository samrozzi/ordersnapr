import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid, List, Star, Pin, Archive, ArrowUpDown, ArrowDownUp, LayoutGrid } from "lucide-react";
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'all' | 'pinned' | 'favorites' | 'archived'>('all');
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
  const pinnedCount = pinnedNotes.length;
  const favoriteCount = favoriteNotes.length;

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-1 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            Your personal workspace
          </p>
        </div>
        <Button onClick={handleCreateNote} size="default" className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5 md:gap-4 mb-6">
        <Card className="p-2 md:p-4">
          <div className="text-xl md:text-2xl font-bold">{notes.length}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">Total</div>
        </Card>
        <Card className="p-2 md:p-4">
          <div className="text-xl md:text-2xl font-bold">{pinnedCount}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">Pinned</div>
        </Card>
        <Card className="p-2 md:p-4">
          <div className="text-xl md:text-2xl font-bold">{favoriteCount}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">Favs</div>
        </Card>
        <Card className="p-2 md:p-4">
          <div className="text-xl md:text-2xl font-bold">{notes.length - pinnedCount}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">Left</div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sort and View Mode Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Sort by:</span>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last Updated</SelectItem>
              <SelectItem value="created">Date Created</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="shrink-0"
          >
            {sortOrder === 'asc' ? <ArrowUpDown className="h-4 w-4" /> : <ArrowDownUp className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">View:</span>
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'pinned' | 'favorites' | 'archived')} className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all" className="flex-1 sm:flex-none">All Notes</TabsTrigger>
          <TabsTrigger value="pinned" className="flex-1 sm:flex-none">Pinned</TabsTrigger>
          <TabsTrigger value="favorites" className="flex-1 sm:flex-none">Favorites</TabsTrigger>
          <TabsTrigger value="archived" className="flex-1 sm:flex-none">Archived</TabsTrigger>
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
