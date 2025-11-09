import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { useNotes, type Note } from "@/hooks/use-notes";

interface KanbanBoardProps {
  notes: Note[];
  onNoteClick: (note: Note) => void;
}

export function KanbanBoard({ notes, onNoteClick }: KanbanBoardProps) {
  const { updateKanbanPosition, preferences } = useNotes();
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  const columns = preferences?.kanban_columns || ["To Do", "In Progress", "Done"];

  // Group notes by column
  const notesByColumn = useMemo(() => {
    const grouped: Record<string, Note[]> = {};

    columns.forEach(column => {
      grouped[column] = notes
        .filter(note => (note.kanban_column || "To Do") === column)
        .sort((a, b) => (a.kanban_position || 0) - (b.kanban_position || 0));
    });

    return grouped;
  }, [notes, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const note = notes.find(n => n.id === active.id);
    setActiveNote(note || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveNote(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dropping over a column
    const targetColumn = columns.find(col => overId === `column-${col}`);

    if (targetColumn) {
      // Dropped directly on a column
      const notesInColumn = notesByColumn[targetColumn];
      const newPosition = notesInColumn.length;

      await updateKanbanPosition({
        id: activeId,
        column: targetColumn,
        position: newPosition,
      });
    } else {
      // Dropped on another note - find which column
      const targetNote = notes.find(n => n.id === overId);
      if (targetNote) {
        const targetCol = targetNote.kanban_column || "To Do";
        const notesInColumn = notesByColumn[targetCol];
        const targetIndex = notesInColumn.findIndex(n => n.id === overId);

        await updateKanbanPosition({
          id: activeId,
          column: targetCol,
          position: targetIndex,
        });

        // Reorder other notes in the column
        const updatedNotes = notesInColumn.filter(n => n.id !== activeId);
        updatedNotes.splice(targetIndex, 0, notes.find(n => n.id === activeId)!);

        // Update positions for all notes in column
        for (let i = 0; i < updatedNotes.length; i++) {
          if (updatedNotes[i].id !== activeId) {
            await updateKanbanPosition({
              id: updatedNotes[i].id,
              column: targetCol,
              position: i,
            });
          }
        }
      }
    }

    setActiveNote(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(column => {
          const columnNotes = notesByColumn[column] || [];

          return (
            <KanbanColumn
              key={column}
              id={`column-${column}`}
              title={column}
              count={columnNotes.length}
            >
              <SortableContext
                items={columnNotes.map(n => n.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 min-h-[200px]">
                  {columnNotes.map(note => (
                    <KanbanCard
                      key={note.id}
                      note={note}
                      onClick={() => onNoteClick(note)}
                    />
                  ))}
                </div>
              </SortableContext>
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeNote && (
          <div className="opacity-50">
            <KanbanCard note={activeNote} onClick={() => {}} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
