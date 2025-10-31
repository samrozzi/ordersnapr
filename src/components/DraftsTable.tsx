import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Trash2, Edit, Download } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { toast } from "sonner";
import { format } from "date-fns";

interface Draft {
  id: string;
  form_type: string;
  draft_name: string;
  form_data: any;
  created_at: string;
  updated_at: string;
}

interface DraftsTableProps {
  onLoadDraft: (formType: string, draftData: any, draftId: string) => void;
}

export const DraftsTable = ({ onLoadDraft }: DraftsTableProps) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [newName, setNewName] = useState("");

  const fetchDrafts = async () => {
    try {
      console.log('Fetching drafts...');
      const { data, error } = await supabase
        .from('form_drafts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Drafts query error:', error);
        throw error;
      }
      
      console.log('Drafts fetched:', data?.length || 0, 'records');
      setDrafts(data || []);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      toast.error("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleDelete = async (draftId: string) => {
    try {
      const { error } = await supabase
        .from('form_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;
      
      toast.success("Draft deleted");
      fetchDrafts();
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast.error("Failed to delete draft");
    }
  };

  const handleRename = async (draftId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error("Draft name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from('form_drafts')
        .update({ draft_name: newName })
        .eq('id', draftId);

      if (error) throw error;
      
      toast.success("Draft renamed");
      setEditingDraft(null);
      setNewName("");
      fetchDrafts();
    } catch (error) {
      console.error("Error renaming draft:", error);
      toast.error("Failed to rename draft");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading drafts...</div>;
  }

  if (drafts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Drafts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No saved drafts yet</p>
            <p className="text-sm mt-2">Save a draft from the Job Audit or Ride Along forms to see it here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Drafts ({drafts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Draft Name</TableHead>
              <TableHead>Form Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drafts.map((draft) => (
              <TableRow key={draft.id}>
                <TableCell className="font-medium">
                  {draft.draft_name}
                </TableCell>
                <TableCell>
                  <Badge variant={draft.form_type === 'job-audit' ? 'default' : 'secondary'}>
                    {draft.form_type === 'job-audit' ? 'Job Audit' : 'Ride Along'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(draft.created_at), 'MMM d, yyyy h:mm a')}
                </TableCell>
                <TableCell>
                  {format(new Date(draft.updated_at), 'MMM d, yyyy h:mm a')}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <FavoriteButton entityType="form_draft" entityId={draft.id} />
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLoadDraft(draft.form_type, draft.form_data, draft.id)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Load
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingDraft(draft);
                          setNewName(draft.draft_name);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rename Draft</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Enter new name"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingDraft(null);
                              setNewName("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={() => handleRename(draft.id, newName)}>
                            Save
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Draft</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{draft.draft_name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(draft.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
