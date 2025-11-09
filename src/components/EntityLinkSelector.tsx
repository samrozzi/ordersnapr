import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Link2, User, FileText, Receipt, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { LinkedEntity } from "@/hooks/use-notes";

interface EntityLinkSelectorProps {
  currentEntity: LinkedEntity | null;
  noteOrgId: string | null;
  onLink: (entityType: 'customer' | 'work_order' | 'invoice', entityId: string) => void;
  onUnlink: () => void;
}

export function EntityLinkSelector({
  currentEntity,
  noteOrgId,
  onLink,
  onUnlink,
}: EntityLinkSelectorProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] = useState<'customer' | 'work_order' | 'invoice' | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search for entities based on type and query
  useEffect(() => {
    if (!entityType || !searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchEntities = async () => {
      setIsSearching(true);
      try {
        let results: any[] = [];

        if (entityType === 'customer') {
          const { data } = await supabase
            .from('customers')
            .select('id, name, org_id')
            .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
            .eq('org_id', noteOrgId || '')
            .limit(10);
          results = data || [];
        } else if (entityType === 'work_order') {
          const { data } = await supabase
            .from('work_orders')
            .select('id, title, org_id')
            .ilike('title', `%${searchQuery}%`)
            .eq('org_id', noteOrgId || '')
            .limit(10);
          results = (data || []).map(wo => ({ ...wo, name: wo.title }));
        } else if (entityType === 'invoice') {
          const { data } = await supabase
            .from('invoices')
            .select('id, invoice_number, org_id')
            .ilike('invoice_number', `%${searchQuery}%`)
            .eq('org_id', noteOrgId || '')
            .limit(10);
          results = (data || []).map(inv => ({ ...inv, name: `Invoice #${inv.invoice_number}` }));
        }

        setSearchResults(results);
      } catch (error) {
        console.error('Error searching entities:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchEntities, 300);
    return () => clearTimeout(debounce);
  }, [entityType, searchQuery, noteOrgId]);

  const handleSelectEntity = (entity: any) => {
    if (entityType) {
      onLink(entityType, entity.id);
      setOpen(false);
      setEntityType('');
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <User className="h-4 w-4" />;
      case 'work_order':
        return <FileText className="h-4 w-4" />;
      case 'invoice':
        return <Receipt className="h-4 w-4" />;
      default:
        return <Link2 className="h-4 w-4" />;
    }
  };

  if (currentEntity) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="flex items-center gap-2">
          {getEntityIcon(currentEntity.type)}
          <span>Linked to: {currentEntity.name}</span>
          <button
            onClick={onUnlink}
            className="ml-1 hover:bg-muted rounded-sm p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="h-4 w-4 mr-2" />
          Link to Entity
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Entity Type</Label>
            <Select value={entityType} onValueChange={(value: any) => setEntityType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer
                  </div>
                </SelectItem>
                <SelectItem value="work_order">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Work Order
                  </div>
                </SelectItem>
                <SelectItem value="invoice">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Invoice
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {entityType && (
            <div className="space-y-2">
              <Label>Search {entityType.replace('_', ' ')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${entityType.replace('_', ' ')}...`}
                  className="pl-9"
                />
              </div>

              {searchQuery.length >= 2 && (
                <div className="max-h-[200px] overflow-y-auto border rounded-md">
                  {isSearching ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="divide-y">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSelectEntity(result)}
                          className="w-full p-3 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                        >
                          {getEntityIcon(entityType)}
                          <span>{result.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No results found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {noteOrgId === null && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Note: This is a personal note. You can only link personal entities (not organization entities).
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
