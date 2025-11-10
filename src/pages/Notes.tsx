import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid, List, Star, Pin } from "lucide-react";
import { useNotes } from "@/hooks/use-notes";
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
import { InteractiveNoteViewer } from "@/components/InteractiveNoteViewer";
import { NoteCustomizer } from "@/components/NoteCustomizer";
import { NoteCard } from "@/components/NoteCard";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TemplatePickerDialog } from "@/components/TemplatePickerDialog";
import type { Note, NoteTemplate } from "@/hooks/use-notes";
import { format } from "date-fns";

const Notes = () => {
  const { notes, pinnedNotes, isLoading, canCreateNote, notesRemaining, createNote, preferences, updatePreferences, templates, toggleFavorite, togglePin } = useNotes();
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

  // Filter notes by search query
  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    return note.title.toLowerCase().includes(query);
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pinned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pinnedNotes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Favorites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{favoriteNotes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {canCreateNote ? "Notes Remaining" : "Upgrade for Unlimited"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
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
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {viewMode === 'list' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      </Tabs>

      {/* Template Picker Dialog */}
      <TemplatePickerDialog
        open={showTemplatePicker}
        onOpenChange={setShowTemplatePicker}
        templates={templates}
        onSelectTemplate={handleCreateFromTemplate}
        onCreateBlank={handleCreateBlankNote}
      />

      {/* Note Viewer/Customizer Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && handleCloseNote()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {selectedNote && (
            isCustomizeMode ? (
              <NoteCustomizer
                note={selectedNote}
                onClose={handleCloseNote}
                onBackToView={handleBackToView}
              />
            ) : (
              <InteractiveNoteViewer
                note={selectedNote}
                onClose={handleCloseNote}
                onCustomize={handleCustomize}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notes;
