import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useQueryClient } from "@tanstack/react-query";
import type { Note } from "@/hooks/use-notes";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note;
}

export function SaveAsTemplateDialog({ open, onOpenChange, note }: SaveAsTemplateDialogProps) {
  const [name, setName] = useState(note.title);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"work" | "personal">("work");
  const [icon, setIcon] = useState(note.icon || "📝");
  const [visibility, setVisibility] = useState<"global" | "org" | "personal">("org");
  const [isSaving, setIsSaving] = useState(false);
  const { activeOrgId } = useActiveOrg();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!name.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Prepare template data
      const templateData = {
        name: name.trim(),
        description: description.trim(),
        category,
        icon,
        default_title: note.title,
        default_blocks: note.content.blocks,
        is_system: false,
        created_by: user.id,
        org_id: visibility === "org" ? activeOrgId : null,
        visibility,
        theme_config: {
          background_color: note.background_color,
          banner_image: note.banner_image,
        },
      };

      const { error } = await supabase
        .from("note_templates")
        .insert([{
          ...templateData,
          default_blocks: JSON.parse(JSON.stringify(templateData.default_blocks))
        }]);

      if (error) throw error;

      toast.success("Template saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      onOpenChange(false);
      
      // Reset form
      setName(note.title);
      setDescription("");
      setCategory("work");
      setIcon(note.icon || "📝");
      setVisibility("org");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Create a reusable template from this note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Project Brief Template"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description *</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is for..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-category">Category</Label>
            <Select value={category} onValueChange={(val) => setCategory(val as "work" | "personal")}>
              <SelectTrigger id="template-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-icon">Icon (Emoji)</Label>
            <Input
              id="template-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="📝"
              maxLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <RadioGroup value={visibility} onValueChange={(val) => setVisibility(val as any)}>
              {activeOrgId && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="org" id="org" />
                  <Label htmlFor="org" className="font-normal cursor-pointer">
                    Organization - Available to all members
                  </Label>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="font-normal cursor-pointer">
                  Personal - Only visible to you
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
