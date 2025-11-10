import { useState } from "react";
import { History, Mail, MailOpen, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInvoiceEmailHistory } from "@/hooks/use-send-invoice-email";
import { formatDistanceToNow } from "date-fns";

interface InvoiceEmailHistoryDialogProps {
  invoiceId: string;
  trigger?: React.ReactNode;
}

export function InvoiceEmailHistoryDialog({
  invoiceId,
  trigger,
}: InvoiceEmailHistoryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { emailHistory, isLoading } = useInvoiceEmailHistory(invoiceId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "bounced":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: "default",
      failed: "destructive",
      bounced: "destructive",
      pending: "secondary",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "—";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <History className="h-4 w-4 mr-2" />
            Email History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Email History</DialogTitle>
          <DialogDescription>
            View all emails sent for this invoice
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading email history...</div>
          </div>
        ) : emailHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No emails sent for this invoice yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailHistory.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>{getStatusBadge(email.status)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{email.sent_to}</div>
                        {email.cc && (
                          <div className="text-sm text-muted-foreground">CC: {email.cc}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={email.subject}>
                        {email.subject}
                      </div>
                      {email.error_message && (
                        <div className="text-sm text-red-500 mt-1 truncate" title={email.error_message}>
                          Error: {email.error_message}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(email.sent_at)}</TableCell>
                    <TableCell>
                      {email.opened_at ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <MailOpen className="h-4 w-4" />
                          {formatDate(email.opened_at)}
                        </div>
                      ) : email.status === "sent" ? (
                        <span className="text-muted-foreground">Not opened</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
