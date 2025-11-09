import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, XCircle, RotateCcw } from "lucide-react";

interface PaymentStatusBadgeProps {
  status: 'unpaid' | 'partial' | 'paid' | 'refunded' | 'failed';
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const config = {
    unpaid: {
      label: 'Unpaid',
      variant: 'secondary' as const,
      icon: Clock,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
    partial: {
      label: 'Partially Paid',
      variant: 'secondary' as const,
      icon: AlertCircle,
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    },
    paid: {
      label: 'Paid',
      variant: 'secondary' as const,
      icon: CheckCircle,
      className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    },
    refunded: {
      label: 'Refunded',
      variant: 'secondary' as const,
      icon: RotateCcw,
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    },
    failed: {
      label: 'Failed',
      variant: 'destructive' as const,
      icon: XCircle,
      className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    },
  };

  const { label, icon: Icon, className: statusClassName } = config[status];

  return (
    <Badge variant="secondary" className={`${statusClassName} ${className || ''}`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
