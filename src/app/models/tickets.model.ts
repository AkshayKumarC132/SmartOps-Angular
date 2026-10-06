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

  assigned_to?: string | null;

  team?: string | null;

  tags?: any[];

  is_locked: boolean;

  attachments?: any[];

  created_at: string;

  updated_at: string;
}