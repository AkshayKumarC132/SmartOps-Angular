export interface Ticket {
  id: number;
  ticket_id: string;
  ticket_name: string;
  description: string;
  summary: string;
  category: string;
  priority: string;
  status: string;
  storage_type: string;

  assigned_to?: any | null;
  team?: any | null;

  tags?: any[];
  is_locked: boolean;
  attachments?: any[];

  created_at: string;
  updated_at: string;

  // Actual SLA deadline returned by the backend API.
  // null means no deadline has been configured.
  sla_due_date?: string | null;
}