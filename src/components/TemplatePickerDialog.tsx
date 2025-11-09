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
import { FileText, Briefcase, User } from "lucide-react";
import { type NoteTemplate } from "@/hooks/use-notes";

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
            className="cursor-pointer hover:shadow-md transition-shadow mb-4"
            onClick={onCreateBlank}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Blank Note</CardTitle>
                  <CardDescription className="text-sm">
                    Start with an empty canvas
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
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onSelectTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{template.icon}</div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {template.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              {workTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No work templates available
                </div>
              )}
            </TabsContent>

            <TabsContent value="personal" className="mt-4">
              <div className="grid gap-3 md:grid-cols-2">
                {personalTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onSelectTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{template.icon}</div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {template.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              {personalTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No personal templates available
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
