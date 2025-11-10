import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, MoreHorizontal, Send, Check, X, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInvoices } from "@/hooks/use-invoices";
import { useCloneInvoice } from "@/hooks/use-invoice-settings";
import { format } from "date-fns";

interface InvoiceTableProps {
  invoices: any[];
  isLoading: boolean;
  onEdit: (invoice: any) => void;
  onView: (invoice: any) => void;
}

export function InvoiceTable({ invoices, isLoading, onEdit, onView }: InvoiceTableProps) {
  const { markAsSent, markAsPaid, deleteInvoice } = useInvoices();
  const { cloneInvoice, isCloning } = useCloneInvoice();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", variant: "secondary" as const },
      sent: { label: "Sent", variant: "default" as const },
      paid: { label: "Paid", variant: "success" as const },
      void: { label: "Void", variant: "destructive" as const },
      cancelled: { label: "Cancelled", variant: "outline" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isOverdue = (invoice: any) => {
    if (invoice.status === 'paid' || invoice.status === 'void' || invoice.status === 'cancelled') return false;
    if (!invoice.due_date) return false;
    return new Date(invoice.due_date) < new Date();
  };

  const handleMarkAsSent = async (invoice: any) => {
    await markAsSent(invoice.id);
  };

  const handleMarkAsPaid = async (invoice: any) => {
    await markAsPaid({ id: invoice.id, amount_cents: invoice.total_cents });
  };

  const handleDelete = async (invoice: any) => {
    if (confirm(`Are you sure you want to delete invoice ${invoice.number}?`)) {
      await deleteInvoice(invoice.id);
    }
  };

  const handleClone = async (invoice: any) => {
    await cloneInvoice(invoice.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 border rounded-lg bg-muted/50">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No invoices found</p>
          <p className="text-muted-foreground">Create your first invoice to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} className={isOverdue(invoice) ? "bg-destructive/5" : ""}>
              <TableCell className="font-medium">
                {invoice.number || "Draft"}
              </TableCell>
              <TableCell>
                {invoice.customer_name || invoice.customer?.name || "No customer"}
              </TableCell>
              <TableCell>
                {invoice.issue_date ? format(new Date(invoice.issue_date), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : "—"}
                  {isOverdue(invoice) && (
                    <Badge variant="destructive" className="text-xs">Overdue</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(invoice.total_cents || 0)}
              </TableCell>
              <TableCell>{getStatusBadge(invoice.status)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onView(invoice)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    {invoice.status === 'draft' && (
                      <DropdownMenuItem onClick={() => onEdit(invoice)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {invoice.status === 'draft' && (
                      <DropdownMenuItem onClick={() => handleMarkAsSent(invoice)}>
                        <Send className="h-4 w-4 mr-2" />
                        Mark as Sent
                      </DropdownMenuItem>
                    )}
                    {(invoice.status === 'sent' || invoice.status === 'draft') && (
                      <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                        <Check className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleClone(invoice)} disabled={isCloning}>
                      <Copy className="h-4 w-4 mr-2" />
                      Clone Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(invoice)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
