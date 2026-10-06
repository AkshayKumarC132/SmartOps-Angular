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
  // GET TEAMS
  // ==============================

  getTeams(): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.apiUrl}/teams/`
    );
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