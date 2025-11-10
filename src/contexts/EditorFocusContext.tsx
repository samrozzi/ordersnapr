import React, { createContext, useContext, useState } from "react";
import { Editor } from "@tiptap/react";

interface EditorFocusContextType {
  activeEditor: Editor | null;
  setActiveEditor: (editor: Editor | null) => void;
  toolbarLocked: boolean;
  setToolbarLocked: (locked: boolean) => void;
}

const EditorFocusContext = createContext<EditorFocusContextType | undefined>(undefined);

export const EditorFocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [toolbarLocked, setToolbarLocked] = useState<boolean>(false);

  return (
    <EditorFocusContext.Provider value={{ activeEditor, setActiveEditor, toolbarLocked, setToolbarLocked }}>
      {children}
    </EditorFocusContext.Provider>
  );
};

export const useEditorFocus = () => {
  const context = useContext(EditorFocusContext);
  if (context === undefined) {
    throw new Error("useEditorFocus must be used within an EditorFocusProvider");
  }
  return context;
};
