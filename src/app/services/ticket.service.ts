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

  getTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(this.apiUrl);
  }

  getTicket(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(
      `${environment.apiUrl}/ticket_detail/${id}/`
    );
  }

  updateTicket(id: number, data: any): Observable<any> {
    return this.http.put(
      `${environment.apiUrl}/ticket_detail/${id}/`,
      data
    );
  }

  getTeams(): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.apiUrl}/teams/`
    );
  }

  createTeam(data: any): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/teams/`,
      data
    );
  }

  updateTeam(id: number, data: any): Observable<any> {
    return this.http.put(
      `${environment.apiUrl}/team_detail/${id}/`,
      data
    );
  }

  createTicket(data: any): Observable<Ticket> {
    return this.http.post<Ticket>(
      this.apiUrl,
      data
    );
  }
}