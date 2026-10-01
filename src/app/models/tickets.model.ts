export interface Ticket {
  id: number;

  ticket_id: string;

  ticket_name: string;

  description: string;

  summary: string;

  category: any;

  priority: string;

  status: string;

  assigned_to: any;

  team: any;

  tags: any[];

  attachments: any[];

  storage_type: string;

  is_locked: boolean;
}