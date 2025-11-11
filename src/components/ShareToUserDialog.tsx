/**
 * Share to User Dialog
 * Share work orders, notes, invoices, etc. with team members
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, X, Users, Search } from 'lucide-react';
import { useUserSearch } from '@/hooks/use-mentions';
import { useShareToUsers } from '@/hooks/use-shares';
import { useToast } from '@/hooks/use-toast';
import type { CommentEntityType } from '@/lib/collaboration-types';

interface ShareToUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: CommentEntityType;
  entityId: string;
  entityTitle: string;
}

export function ShareToUserDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityTitle,
}: ShareToUserDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<
    Array<{ id: string; username: string | null; full_name: string; email: string }>
  >([]);
  const [message, setMessage] = useState('');

  const { data: searchResults = [] } = useUserSearch(searchQuery, searchQuery.length > 0);
  const shareToUsers = useShareToUsers();

  const handleSelectUser = (user: any) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'No recipients',
        description: 'Please select at least one person to share with',
        variant: 'destructive',
      });
      return;
    }

    try {
      await shareToUsers.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        recipient_ids: selectedUsers.map((u) => u.id),
        message: message.trim() || undefined,
      });

      toast({
        title: 'Shared successfully',
        description: `Shared with ${selectedUsers.length} team member${
          selectedUsers.length !== 1 ? 's' : ''
        }`,
      });

      onOpenChange(false);
      setSelectedUsers([]);
      setMessage('');
      setSearchQuery('');
    } catch (error: any) {
      console.error('Error sharing:', error);
      toast({
        title: 'Failed to share',
        description: error.message || 'Could not share with selected users',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedUsers([]);
    setMessage('');
    setSearchQuery('');
  };

  const getEntityTypeLabel = (type: CommentEntityType): string => {
    const labels: Record<CommentEntityType, string> = {
      work_order: 'Work Order',
      note: 'Note',
      invoice: 'Invoice',
      customer: 'Customer',
      property: 'Property',
      form_submission: 'Form Submission',
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share to Team Member
          </DialogTitle>
          <DialogDescription>
            Share "{entityTitle}" with your team members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Entity Info */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium">{entityTitle}</p>
              <p className="text-xs text-muted-foreground">{getEntityTypeLabel(entityType)}</p>
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Selected ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge key={user.id} variant="secondary" className="pl-2 pr-1 py-1">
                    <span className="text-sm">
                      {user.username ? `@${user.username}` : user.full_name || user.email}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto w-auto p-0 ml-1"
                      onClick={() => handleRemoveUser(user.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search Users */}
          <div className="space-y-2">
            <Label htmlFor="search-users">Search team members</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-users"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="pl-9"
              />
            </div>

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {searchResults.map((user) => {
                  const isSelected = selectedUsers.find((u) => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-muted transition-colors ${
                        isSelected ? 'bg-muted' : ''
                      }`}
                      onClick={() => !isSelected && handleSelectUser(user)}
                      disabled={isSelected}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {user.full_name
                            ? user.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                            : user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{user.full_name || user.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.username ? `@${user.username}` : user.email}
                        </div>
                      </div>
                      {isSelected && (
                        <Badge variant="secondary" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No team members found
              </p>
            )}
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <Label htmlFor="share-message">Message (optional)</Label>
            <Textarea
              id="share-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note about why you're sharing this..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={selectedUsers.length === 0 || shareToUsers.isPending}>
            {shareToUsers.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                Share with {selectedUsers.length} {selectedUsers.length === 1 ? 'Person' : 'People'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
