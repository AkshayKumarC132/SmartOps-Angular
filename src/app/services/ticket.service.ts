
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Ticket } from '../models/tickets.model';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private apiUrl = `${environment.apiUrl}/tickets/`;

  constructor(private http: HttpClient) {}

  // ==============================
  // GET ALL TICKETS
  // ==============================

  getTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(
      this.apiUrl
    );
  }

  // ==============================
  // GET SINGLE TICKET
  // ==============================

  getTicket(ticketId: number): Observable<Ticket> {
    return this.http.get<Ticket>(
      `${environment.apiUrl}/ticket_detail/${ticketId}/`
    );
  }

  // ==============================
  // UPDATE TICKET
  // ==============================

  updateTicket(
    ticketId: number,
    data: any
  ): Observable<any> {

    return this.http.put(
      `${environment.apiUrl}/ticket_detail/${ticketId}/`,
      data
    );
  }

  // ==============================
  // DELETE TICKET
  // ==============================

  deleteTicket(ticketId: number): Observable<any> {
    return this.http.delete(
      `${environment.apiUrl}/ticket_detail/${ticketId}/`
    );
  }

  // ==============================
  // GET TEAMS
  // ==============================

  getTeams(): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.apiUrl}/teams/`
    );
  }

  // ==============================
  // TAGS: READ / ADD / REMOVE ON TICKET
  // ==============================

  getTags(): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.apiUrl}/tags/`
    );
  }

  addTicketTags(
    ticketId: number,
    tagNames: string[]
  ): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/ticket_detail/${ticketId}/add_tags/`,
      { tag_name: tagNames }
    );
  }

  removeTicketTag(
    ticketId: number,
    tagName: string
  ): Observable<any> {
    return this.http.delete(
      `${environment.apiUrl}/ticket_detail/${ticketId}/remove_tags/${encodeURIComponent(tagName)}/`
    );
  }

  // ==============================
  // ATTACHMENTS: UPLOAD / DELETE
  // ==============================

  uploadTicketAttachments(
    ticketId: number,
    files: File[]
  ): Observable<any> {

    const formData = new FormData();

    files.forEach(
      file => formData.append('file', file, file.name)
    );

    return this.http.post(
      `${environment.apiUrl}/ticket_detail/${ticketId}/attachments/`,
      formData
    );
  }

  deleteTicketAttachment(
    ticketId: number,
    attachmentId: number
  ): Observable<any> {
    return this.http.delete(
      `${environment.apiUrl}/ticket_detail/${ticketId}/attachments/${attachmentId}/`
    );
  }

  // ==============================
  // DOWNLOAD ATTACHMENT FOR PREVIEW
  // ==============================

  getAttachmentPreview(url: string): Observable<Blob> {
    return this.http.get(url, {
      responseType: 'blob'
    });
  }

  // ==============================
  // CREATE TEAM
  // ==============================

  createTeam(data: any): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/teams/`,
      data
    );
  }

  // ==============================
  // UPDATE TEAM
  // ==============================

  updateTeam(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put(
      `${environment.apiUrl}/team_detail/${id}/`,
      data
    );
  }

  // ==============================
  // DELETE TEAM
  // ==============================

  deleteTeam(id: number): Observable<any> {
    return this.http.delete(
      `${environment.apiUrl}/team_detail/${id}/`
    );
  }

  // ==============================
  // CREATE TICKET
  // ==============================

  createTicket(
    data: any
  ): Observable<Ticket> {

    return this.http.post<Ticket>(
      this.apiUrl,
      data
    );
  }

  // ==============================
  // AUDIT LOG / TICKET ACTIVITY
  // ==============================

  getAuditActivities(): Observable<any[]> {

    return this.http.get<any[]>(
      `${environment.apiUrl}/tickets-activity/`
    );
  }

}
