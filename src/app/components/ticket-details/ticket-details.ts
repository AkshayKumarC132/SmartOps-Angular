import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './ticket-details.html',
  styleUrl: './ticket-details.css'
})
export class TicketDetails implements OnInit {

  // ============================================
  // TICKET
  // ============================================

  ticket: any = null;

  // IMPORTANT:
  // Backend uses numeric database primary key.
  ticketId: number | null = null;


  // ============================================
  // PAGE STATE
  // ============================================

  loading = true;

  saving = false;

  errorMessage = '';

  successMessage = '';


  // ============================================
  // EDIT STATE
  // ============================================

  isEditing = false;

  editStatus = '';

  editPriority = '';


  // ============================================
  // AVAILABLE STATUS VALUES
  // ============================================

  statusOptions: string[] = [
    'Open',
    'Assigned',
    'In_Progress',
    'Resolved',
    'Closed',
    'ReOpened'
  ];


  // ============================================
  // AVAILABLE PRIORITY VALUES
  // ============================================

  priorityOptions: string[] = [
    'Low',
    'Medium',
    'High',
    'Critical'
  ];


  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private cdr: ChangeDetectorRef
  ) {}


  // ============================================
  // INITIALIZE
  // ============================================

  ngOnInit(): void {

    console.log(
      'TicketDetails component loaded'
    );


    // Get numeric database ID from URL
    //
    // Example:
    // /ticket/4
    //
    // id = "4"

    const id =
      this.route.snapshot.paramMap.get('id');


    console.log(
      'Ticket ID from URL:',
      id
    );


    // ==========================================
    // CHECK ID EXISTS
    // ==========================================

    if (!id || id.trim() === '') {

      this.loading = false;

      this.errorMessage =
        'Ticket ID was not found.';

      this.cdr.detectChanges();

      return;
    }


    // ==========================================
    // CONVERT STRING ROUTE PARAMETER TO NUMBER
    // ==========================================

    const parsedId =
      Number(id);


    // ==========================================
    // VALIDATE NUMERIC ID
    // ==========================================

    if (
      isNaN(parsedId) ||
      parsedId <= 0
    ) {

      this.loading = false;

      this.errorMessage =
        'Invalid ticket ID.';

      this.cdr.detectChanges();

      return;
    }


    // ==========================================
    // STORE DATABASE ID
    // ==========================================

    this.ticketId =
      parsedId;


    console.log(
      'Parsed numeric ticket ID:',
      this.ticketId
    );


    // ==========================================
    // LOAD TICKET
    // ==========================================

    this.loadTicket(
      this.ticketId
    );
  }


  // ============================================
  // LOAD TICKET
  // ============================================

  loadTicket(
    id: number
  ): void {

    console.log(
      'Calling API for ticket:',
      id
    );


    this.loading = true;

    this.errorMessage = '';

    this.successMessage = '';


    // ==========================================
    // CALL BACKEND
    // ==========================================

    this.ticketService
      .getTicket(id)
      .subscribe({

        // ======================================
        // SUCCESS
        // ======================================

        next: (
          response: any
        ) => {

          console.log(
            'FULL TICKET RESPONSE:',
            response
          );


          // Store ticket response
          this.ticket =
            response;


          // ====================================
          // SYNC EDIT VALUES
          // ====================================

          this.editStatus =
            this.ticket.status || '';


          this.editPriority =
            this.ticket.priority || '';


          this.loading = false;


          this.cdr.detectChanges();
        },


        // ======================================
        // ERROR
        // ======================================

        error: (
          error: any
        ) => {

          console.error(
            'TICKET DETAILS API ERROR:',
            error
          );


          this.ticket = null;

          this.loading = false;


          // ====================================
          // 401
          // ====================================

          if (
            error.status === 401
          ) {

            this.errorMessage =
              'Authentication is required to view this ticket.';
          }


          // ====================================
          // 403
          // ====================================

          else if (
            error.status === 403
          ) {

            this.errorMessage =
              'You are not allowed to view this ticket.';
          }


          // ====================================
          // 404
          // ====================================

          else if (
            error.status === 404
          ) {

            this.errorMessage =
              `Ticket ${id} was not found.`;
          }


          // ====================================
          // 500
          // ====================================

          else if (
            error.status === 500
          ) {

            this.errorMessage =
              'Server error while loading ticket details.';
          }


          // ====================================
          // CONNECTION ERROR
          // ====================================

          else if (
            error.status === 0
          ) {

            this.errorMessage =
              'Unable to connect to the backend server.';
          }


          // ====================================
          // OTHER
          // ====================================

          else {

            this.errorMessage =
              `Unable to load ticket details. Server returned ${error.status}.`;
          }


          this.cdr.detectChanges();
        }

      });
  }


  // ============================================
  // START EDITING
  // ============================================

  startEditing(): void {

    if (!this.ticket) {
      return;
    }


    this.editStatus =
      this.ticket.status || '';


    this.editPriority =
      this.ticket.priority || '';


    this.errorMessage = '';

    this.successMessage = '';

    this.isEditing = true;


    this.cdr.detectChanges();
  }


  // ============================================
  // CANCEL EDITING
  // ============================================

  cancelEditing(): void {

    if (this.ticket) {

      this.editStatus =
        this.ticket.status || '';


      this.editPriority =
        this.ticket.priority || '';
    }


    this.isEditing = false;

    this.errorMessage = '';

    this.successMessage = '';


    this.cdr.detectChanges();
  }


  // ============================================
  // SAVE CHANGES
  // ============================================

  saveChanges(): void {

    // Make sure ticket and ID exist
    if (
      !this.ticket ||
      this.ticketId === null
    ) {
      return;
    }


    // ==========================================
    // STATUS VALIDATION
    // ==========================================

    if (!this.editStatus) {

      this.errorMessage =
        'Please select a status.';

      return;
    }


    // ==========================================
    // PRIORITY VALIDATION
    // ==========================================

    if (!this.editPriority) {

      this.errorMessage =
        'Please select a priority.';

      return;
    }


    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';


    // ==========================================
    // UPDATE DATA
    // ==========================================

    const updateData = {

      status:
        this.editStatus,

      priority:
        this.editPriority
    };


    console.log(
      'Updating ticket:',
      this.ticketId,
      updateData
    );


    // ==========================================
    // UPDATE API
    // ==========================================

    this.ticketService
      .updateTicket(
        this.ticketId,
        updateData
      )
      .subscribe({

        // ======================================
        // SUCCESS
        // ======================================

        next: (
          response: any
        ) => {

          console.log(
            'Ticket update response:',
            response
          );


          this.saving = false;

          this.isEditing = false;


          this.successMessage =
            'Ticket updated successfully.';


          // Reload actual backend data
          this.loadTicket(
            this.ticketId!
          );


          this.cdr.detectChanges();
        },


        // ======================================
        // ERROR
        // ======================================

        error: (
          error: any
        ) => {

          console.error(
            'TICKET UPDATE ERROR:',
            error
          );


          this.saving = false;


          // ====================================
          // 400
          // ====================================

          if (
            error.status === 400
          ) {

            this.errorMessage =
              'Invalid ticket data. Please check the selected values.';
          }


          // ====================================
          // 401
          // ====================================

          else if (
            error.status === 401
          ) {

            this.errorMessage =
              'Authentication is required to update this ticket.';
          }


          // ====================================
          // 403
          // ====================================

          else if (
            error.status === 403
          ) {

            this.errorMessage =
              'You do not have permission to update this ticket.';
          }


          // ====================================
          // 404
          // ====================================

          else if (
            error.status === 404
          ) {

            this.errorMessage =
              'Ticket was not found.';
          }


          // ====================================
          // 500
          // ====================================

          else if (
            error.status === 500
          ) {

            this.errorMessage =
              'Server error while updating ticket.';
          }


          // ====================================
          // CONNECTION ERROR
          // ====================================

          else if (
            error.status === 0
          ) {

            this.errorMessage =
              'Unable to connect to the backend server.';
          }


          // ====================================
          // OTHER
          // ====================================

          else {

            this.errorMessage =
              `Unable to update ticket. Server returned ${error.status}.`;
          }


          this.cdr.detectChanges();
        }

      });
  }


  // ============================================
  // FORMAT STATUS
  // ============================================

  formatStatus(
    status: string
  ): string {

    if (!status) {
      return '';
    }


    return status.replace(
      /_/g,
      ' '
    );
  }


  // ============================================
  // BACK TO TICKETS
  // ============================================

  goBack(): void {

    this.router.navigate([
      '/tickets'
    ]);
  }

}