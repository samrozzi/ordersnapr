import { useState, ReactNode } from "react";
import { useFreeTierLimits, FreeTierLimits } from "@/hooks/use-free-tier-limits";
import { FreeTierLimitModal } from "./FreeTierLimitModal";

interface FreeTierGuardProps {
  resource: keyof FreeTierLimits;
  children: (props: { onClick: () => void; disabled: boolean; remaining: number }) => ReactNode;
  onAllowed?: () => void;
}

/**
 * FreeTierGuard - Wraps create buttons to enforce free tier limits
 *
 * Usage:
 * <FreeTierGuard resource="work_orders" onAllowed={() => navigate('/work-orders/new')}>
 *   {({ onClick, disabled, remaining }) => (
 *     <Button onClick={onClick} disabled={disabled}>
 *       Create Work Order {!disabled && `(${remaining} left)`}
 *     </Button>
 *   )}
 * </FreeTierGuard>
 */
export function FreeTierGuard({ resource, children, onAllowed }: FreeTierGuardProps) {
  const [showModal, setShowModal] = useState(false);
  const { canCreate, getRemainingCount, limits, isApproved, loading } = useFreeTierLimits();

  const handleClick = () => {
    if (canCreate(resource)) {
      onAllowed?.();
    } else {
      setShowModal(true);
    }
  };

  const remaining = getRemainingCount(resource);
  const isDisabled = loading;

  return (
    <>
      {children({
        onClick: handleClick,
        disabled: isDisabled,
        remaining: isApproved ? Infinity : remaining,
      })}

      <FreeTierLimitModal
        open={showModal}
        onClose={() => setShowModal(false)}
        resource={resource}
        limit={limits[resource]}
      />
    </>
  );
}
