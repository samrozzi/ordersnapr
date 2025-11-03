import React, { createContext, useContext, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { WorkOrderDetails } from '@/components/WorkOrderDetails';
import { supabase } from '@/integrations/supabase/client';

interface WorkOrder {
  id: string;
  bpc: string | null;
  ban: string | null;
  package: string | null;
  job_id: string | null;
  customer_name: string;
  contact_info: string | null;
  address: string | null;
  notes: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  completion_notes: string | null;
  created_at: string;
  photos: string[] | null;
  access_required: boolean | null;
  access_notes: string | null;
  user_id: string;
  completed_by: string | null;
  type?: string | null;
  assigned_to?: string | null;
  custom_data?: any;
  checklist?: any;
  linked_invoice_id?: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
  creator?: {
    full_name: string | null;
    email: string | null;
  } | null;
  assignee?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface WorkOrderDialogContextType {
  openWorkOrderDialog: (workOrderId: string) => void;
  closeWorkOrderDialog: () => void;
}

const WorkOrderDialogContext = createContext<WorkOrderDialogContextType | undefined>(undefined);

export const WorkOrderDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  
  const openWorkOrderDialog = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          creator:profiles!work_orders_user_id_fkey(full_name, email),
          assignee:profiles!work_orders_assigned_to_fkey(full_name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) setWorkOrder(data as WorkOrder);
    } catch (error) {
      console.error('Error fetching work order:', error);
    }
  };
  
  const closeWorkOrderDialog = () => {
    setWorkOrder(null);
  };
  
  return (
    <WorkOrderDialogContext.Provider value={{ openWorkOrderDialog, closeWorkOrderDialog }}>
      {children}
      
      <Dialog open={!!workOrder} onOpenChange={(open) => !open && closeWorkOrderDialog()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {workOrder && (
            <WorkOrderDetails
              workOrder={workOrder}
              open={true}
              onOpenChange={(open) => !open && closeWorkOrderDialog()}
              onEdit={() => {}}
              onUpdate={() => {}}
            />
          )}
        </DialogContent>
      </Dialog>
    </WorkOrderDialogContext.Provider>
  );
};

export const useWorkOrderDialog = () => {
  const context = useContext(WorkOrderDialogContext);
  if (!context) {
    throw new Error('useWorkOrderDialog must be used within WorkOrderDialogProvider');
  }
  return context;
};
