export interface User {
  id: number;
  Username: string;
  Email?: string;
  Role: 'Admin' | 'Team Member' | 'Requester';
  Team?: number | null;
}