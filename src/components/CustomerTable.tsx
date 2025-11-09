import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit, MoreHorizontal, Trash2, Mail, Link as LinkIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCustomers, type CustomerWithStats } from "@/hooks/use-customers";
import { Badge } from "@/components/ui/badge";

interface CustomerTableProps {
  customers: CustomerWithStats[];
  isLoading: boolean;
  onEdit: (customer: CustomerWithStats) => void;
  onView: (customer: CustomerWithStats) => void;
  showStats?: boolean;
}

export function CustomerTable({ customers, isLoading, onEdit, onView, showStats = false }: CustomerTableProps) {
  const { deleteCustomer } = useCustomers();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleDelete = async (customer: CustomerWithStats) => {
    if (confirm(`Are you sure you want to delete ${customer.name}?`)) {
      try {
        await deleteCustomer(customer.id);
      } catch (error: any) {
        // Error is already handled by the hook with toast
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 border rounded-lg bg-muted/50">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No customers found</p>
          <p className="text-muted-foreground">Create your first customer to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            {showStats && (
              <>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Work Orders</TableHead>
                <TableHead className="text-right">Total Invoiced</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
              </>
            )}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">
                {customer.name}
                {customer.address && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {customer.address.city && customer.address.state &&
                      `${customer.address.city}, ${customer.address.state}`
                    }
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {customer.email || (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {customer.email && (
                    <Badge variant="outline" className="text-xs">
                      Portal Eligible
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {customer.phone || (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              {showStats && (
                <>
                  <TableCell className="text-right">
                    {customer.invoice_count || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {customer.work_order_count || 0}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(customer.total_invoiced_cents || 0)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    {formatCurrency(customer.total_paid_cents || 0)}
                  </TableCell>
                </>
              )}
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
                    <DropdownMenuItem onClick={() => onView(customer)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(customer)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(customer)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
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
