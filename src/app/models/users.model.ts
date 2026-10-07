export interface NotificationPreferences {
  in_app: {
    ticket_assigned: boolean;
    ticket_status_changed: boolean;
    ticket_comments: boolean;
    sla_warnings: boolean;
    ai_suggestions: boolean;
  };

  email: {
    ticket_updates: boolean;
    weekly_digest: boolean;
    mentions: boolean;
  };

  slack: {
    critical_alerts: boolean;
    sla_alerts: boolean;
    team_mentions: boolean;
  };
}

export interface User {
  id: number;
  Username: string;
  Email?: string;
  Role: 'Admin' | 'Team Member' | 'Requester';
  Team?: number | null;

  notification_preferences?: NotificationPreferences;
}