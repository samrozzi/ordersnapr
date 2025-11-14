import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Briefcase, User, Sparkles } from "lucide-react";
import { type NoteTemplate } from "@/hooks/use-notes";
import { TemplatePreviewCard } from "@/components/notes/TemplatePreviewCard";

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: NoteTemplate[];
  onSelectTemplate: (template: NoteTemplate) => void;
  onCreateBlank: () => void;
}

export function TemplatePickerDialog({
  open,
  onOpenChange,
  templates,
  onSelectTemplate,
  onCreateBlank,
}: TemplatePickerDialogProps) {
  const workTemplates = templates.filter(t => t.category === 'work');
  const personalTemplates = templates.filter(t => t.category === 'personal');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create a New Note</DialogTitle>
          <DialogDescription>
            Start from scratch or choose a template to get started quickly
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Blank Note Option */}
          <Card
            className="cursor-pointer hover:shadow-lg hover:border-primary transition-all mb-4 bg-gradient-to-r from-background to-muted/20"
            onClick={onCreateBlank}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Blank Canvas</CardTitle>
                  <CardDescription className="text-sm">
                    Start from scratch with unlimited possibilities
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Templates */}
          <Tabs defaultValue="work" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="work" className="flex-1">
                <Briefcase className="h-4 w-4 mr-2" />
                Work Templates ({workTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex-1">
                <User className="h-4 w-4 mr-2" />
                Personal Templates ({personalTemplates.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="work" className="mt-4">
              <div className="grid gap-3 md:grid-cols-2">
                {workTemplates.map((template) => (
                  <TemplatePreviewCard
                    key={template.id}
                    template={template}
                    onClick={() => onSelectTemplate(template)}
                  />
                ))}
              </div>
              {workTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No work templates available yet</p>
                  <p className="text-xs mt-1">Create your own custom templates!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="personal" className="mt-4">
              <div className="grid gap-3 md:grid-cols-2">
                {personalTemplates.map((template) => (
                  <TemplatePreviewCard
                    key={template.id}
                    template={template}
                    onClick={() => onSelectTemplate(template)}
                  />
                ))}
              </div>
              {personalTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No personal templates available yet</p>
                  <p className="text-xs mt-1">Save your favorite notes as templates!</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
