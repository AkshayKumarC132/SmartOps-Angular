import {
  ChangeDetectorRef,
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { TicketService } from '../../services/ticket.service';
import { ApiErrorService } from '../../services/api-error.service';
import {
  UserService,
  User
} from '../../services/user.service';
import {
  OrganizationContextService
} from '../../services/organization-context.service';
import Swal from 'sweetalert2';
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
export class TicketDetails implements OnInit, OnDestroy {
  ticket: any = null;
  ticketId: number | null = null;

  users: User[] = [];
  teams: any[] = [];
  teamsLoading = false;
  teamsLoadError = '';

  availableTags: any[] = [];
  tagsLoading = false;
  tagsLoadError = '';
  selectedTagToAdd = '';
  tagSaving = false;
  tagMessage = '';
  tagError = false;

  selectedAttachmentFiles: File[] = [];
  attachmentsSaving = false;
  attachmentMessage = '';
  attachmentError = false;

  // Attachment preview state
  previewAttachmentUrl = '';
  previewAttachmentSafeUrl: SafeResourceUrl | null = null;
  previewAttachmentName = '';
  previewAttachmentType: 'image' | 'pdf' | 'other' = 'other';
  showAttachmentPreview = false;

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  isEditing = false;
  editStatus = '';
  editPriority = '';
  editTicketName = '';
  editDescription = '';
  editSummary = '';
  editCategory = '';
  categoryOptions: string[] = [
    'Bug',
    'Feature',
    'Infrastructure',
    'Documentation',
    'Other'
  ];

  selectedAssigneeId: number | null = null;
  selectedTeamId: number | null = null;

  assigning = false;
  assignmentMessage = '';
  assignmentError = false;

  statusOptions: string[] = [
    'Open',
    'Assigned',
    'In_Progress',
    'Resolved',
    'Closed',
    'ReOpened',
    'Invalid'
  ];

  priorityOptions: string[] = [
    'Low',
    'Medium',
    'High',
    'Critical'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private apiErrorService: ApiErrorService,
    private userService: UserService,
    private organizationContext: OrganizationContextService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  // ============================================
  // INITIALIZE
  // ============================================

  ngOnInit(): void {
    this.loadUsers();
    this.loadTeams();
    this.loadTags();

    const id = this.route.snapshot.paramMap.get('id');

    if (!id || id.trim() === '') {
      this.loading = false;
      this.errorMessage = 'Ticket ID was not found.';
      return;
    }

    const parsedId = Number(id);

    if (isNaN(parsedId) || parsedId <= 0) {
      this.loading = false;
      this.errorMessage = 'Invalid ticket ID.';
      return;
    }

    this.ticketId = parsedId;
    this.loadTicket(parsedId);
  }

  // ============================================
  // LOAD ASSIGNABLE TEAM MEMBERS
  // ============================================

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (response: any) => {
        let userList: User[] = [];

        if (Array.isArray(response)) {
          userList = response;
        } else if (Array.isArray(response?.results)) {
          userList = response.results;
        } else if (Array.isArray(response?.users)) {
          userList = response.users;
        } else if (Array.isArray(response?.data)) {
          userList = response.data;
        }

        const activeUsers = userList.filter(
          (user: User) => user.is_active !== false
        );

        const organizationUsers =
          this.organizationContext.filterRecords(activeUsers);

        this.users = organizationUsers.filter(
          (user: User) =>
            String(user.role || '')
              .trim()
              .toLowerCase() === 'team member'
        );

        console.log(
          'Assignable Team Members:',
          this.users
        );

        if (this.ticket) {
          this.setCurrentAssignee();
        }

        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('Failed to load users:', error);
        this.users = [];
        this.cdr.detectChanges();
      }
    });
  }

  // ============================================
  // LOAD ORGANIZATION TEAMS
  // ============================================

  loadTeams(): void {
    this.teamsLoading = true;
    this.teamsLoadError = '';

    this.ticketService.getTeams().subscribe({
      next: (response: any) => {
        let teamList: any[] = [];

        if (Array.isArray(response)) {
          teamList = response;
        } else if (Array.isArray(response?.results)) {
          teamList = response.results;
        } else if (Array.isArray(response?.teams)) {
          teamList = response.teams;
        } else if (Array.isArray(response?.data)) {
          teamList = response.data;
        }

        const activeTeams = teamList.filter(
          team => team?.is_active !== false
        );

        this.teams =
          this.organizationContext.filterRecords(activeTeams);

        this.teamsLoading = false;

        if (this.ticket) {
          this.setCurrentTeam();
        }

        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('Failed to load teams:', error);

        this.teams = [];
        this.teamsLoading = false;

        this.teamsLoadError =
          error?.status === 403
            ? 'You do not have permission to view teams.'
            : 'Unable to load teams. Please refresh and try again.';

        this.cdr.detectChanges();
      }
    });
  }

  // ============================================
  // LOAD ORGANIZATION TAG DEFINITIONS
  // ============================================

  loadTags(): void {
    this.tagsLoading = true;
    this.tagsLoadError = '';

    this.ticketService.getTags().subscribe({
      next: (response: any) => {
        if (Array.isArray(response)) {
          this.availableTags = response;
        } else if (Array.isArray(response?.results)) {
          this.availableTags = response.results;
        } else if (Array.isArray(response?.data)) {
          this.availableTags = response.data;
        } else {
          this.availableTags = [];
        }

        this.tagsLoading = false;
        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('Failed to load tag definitions:', error);

        this.availableTags = [];
        this.tagsLoading = false;

        this.tagsLoadError = error?.status === 403
          ? 'Only organization Admins can load tag definitions.'
          : 'Unable to load available tags.';

        this.cdr.detectChanges();
      }
    });
  }

  getTagName(tag: any): string {
    if (typeof tag === 'string') {
      return tag;
    }

    return String(tag?.tag_name || tag?.name || '');
  }

  isTagAssigned(tagName: string): boolean {
    const currentTags = Array.isArray(this.ticket?.tags)
      ? this.ticket.tags
      : [];

    return currentTags.some((tag: any) =>
      this.getTagName(tag).trim().toLowerCase() ===
      tagName.trim().toLowerCase()
    );
  }

  getUnassignedTags(): any[] {
    return this.availableTags.filter((tag: any) => {
      const name = this.getTagName(tag);
      return !!name && !this.isTagAssigned(name);
    });
  }

  // ============================================
  // ADD TAG
  // ============================================

  addSelectedTag(): void {
    if (
      !this.ticketId ||
      !this.selectedTagToAdd ||
      this.tagSaving
    ) {
      return;
    }

    if (this.isTagAssigned(this.selectedTagToAdd)) {
      this.tagError = true;
      this.tagMessage =
        'This tag is already assigned to the ticket.';
      return;
    }

    this.tagSaving = true;
    this.tagError = false;
    this.tagMessage = '';

    this.ticketService.addTicketTags(
      this.ticketId,
      [this.selectedTagToAdd]
    ).subscribe({
      next: () => {
        this.tagSaving = false;
        this.selectedTagToAdd = '';
        this.tagMessage = 'Tag added successfully.';

        this.loadTicket(this.ticketId!);
        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('Failed to add ticket tag:', error);

        this.tagSaving = false;
        this.tagError = true;

        this.tagMessage = this.readApiError(
          error,
          'Unable to add this tag.'
        );

        this.cdr.detectChanges();
      }
    });
  }

  // ============================================
  // REMOVE TAG
  // ============================================

  removeTicketTag(tagName: string): void {
    if (
      !this.ticketId ||
      !tagName ||
      this.tagSaving
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Remove the tag "${tagName}" from this ticket?`
    );

    if (!confirmed) {
      return;
    }

    this.tagSaving = true;
    this.tagError = false;
    this.tagMessage = '';

    this.ticketService.removeTicketTag(
      this.ticketId,
      tagName
    ).subscribe({
      next: () => {
        this.tagSaving = false;
        this.tagMessage = 'Tag removed successfully.';

        this.loadTicket(this.ticketId!);
        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('Failed to remove ticket tag:', error);

        this.tagSaving = false;
        this.tagError = true;

        this.tagMessage = this.readApiError(
          error,
          'Unable to remove this tag.'
        );

        this.cdr.detectChanges();
      }
    });
  }

  // ============================================
  // ATTACHMENT UPLOAD / DELETE
  // ============================================

  onAttachmentSelection(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.selectedAttachmentFiles = input.files
      ? Array.from(input.files)
      : [];

    this.attachmentMessage = '';
    this.attachmentError = false;
  }

  uploadSelectedAttachments(input: HTMLInputElement): void {
    if (
      !this.ticketId ||
      !this.selectedAttachmentFiles.length ||
      this.attachmentsSaving
    ) {
      return;
    }

    this.attachmentsSaving = true;
    this.attachmentError = false;
    this.attachmentMessage = '';

    this.ticketService.uploadTicketAttachments(
      this.ticketId,
      this.selectedAttachmentFiles
    ).subscribe({
      next: () => {
        this.attachmentsSaving = false;
        this.selectedAttachmentFiles = [];
        input.value = '';

        this.attachmentMessage =
          'Attachment(s) uploaded successfully.';

        this.loadTicket(this.ticketId!);
        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('Attachment upload failed:', error);

        this.attachmentsSaving = false;
        this.attachmentError = true;

        this.attachmentMessage = this.readApiError(
          error,
          'Unable to upload attachment(s). Check file size and allowed file count.'
        );

        this.cdr.detectChanges();
      }
    });
  }

  deleteTicketAttachment(attachment: any): void {
  if (
    !this.ticketId ||
    !attachment?.id ||
    this.attachmentsSaving
  ) {
    this.attachmentError = true;
    this.attachmentMessage =
      'The attachment ID is missing; it cannot be deleted.';
    return;
  }

  const attachmentName = this.getAttachmentName(attachment);

  Swal.fire({
    title: 'Delete attachment?',
    text: `Are you sure you want to delete "${attachmentName}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    reverseButtons: true
  }).then((result) => {

    if (!result.isConfirmed) {
      return;
    }

    this.attachmentsSaving = true;
    this.attachmentError = false;
    this.attachmentMessage = '';

    this.ticketService.deleteTicketAttachment(
      this.ticketId!,
      Number(attachment.id)
    ).subscribe({
      next: () => {
        this.attachmentsSaving = false;

        this.attachmentMessage =
          'Attachment deleted successfully.';

        this.ticket.attachments =
          (this.ticket.attachments || []).filter(
            (item: any) =>
              Number(item.id) !== Number(attachment.id)
          );

        this.cdr.detectChanges();

        Swal.fire({
          title: 'Deleted!',
          text: 'The attachment has been deleted successfully.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#14b8a6'
        });
      },

      error: (error: any) => {
        console.error('Attachment deletion failed:', error);

        this.attachmentsSaving = false;
        this.attachmentError = true;

        this.attachmentMessage = this.readApiError(
          error,
          'Unable to delete this attachment.'
        );

        this.cdr.detectChanges();

        Swal.fire({
          title: 'Delete failed',
          text: this.attachmentMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  });
}
  getAttachmentName(attachment: any): string {
    if (typeof attachment === 'string') {
      return attachment.split('/').pop() || attachment;
    }

    const originalName = attachment?.original_filename;

    if (originalName) {
      return originalName;
    }

    const file = attachment?.file;

    if (typeof file === 'string') {
      return file.split('/').pop() || file;
    }

    return 'Attachment';
  }

  getAttachmentUrl(attachment: any): string | null {
  let url: string | null = null;

  if (typeof attachment === 'string') {
    url = attachment;
  } else if (typeof attachment?.file === 'string') {
    url = attachment.file;
  }

  if (!url) {
    return null;
  }

  // Already an absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative media URL - point to Django backend
  return `http://127.0.0.1:8000${url.startsWith('/') ? url : '/' + url}`;
}

  // ============================================
  // ATTACHMENT PREVIEW (AUTHENTICATED DOWNLOAD)
  // ============================================

  openAttachmentPreview(attachment: any): void {
    const url = this.getAttachmentUrl(attachment);

    if (!url) {
      return;
    }

    // Clear any previous preview URL before starting a new request.
    this.releaseAttachmentPreviewUrl();

    this.previewAttachmentName = this.getAttachmentName(attachment);
    this.showAttachmentPreview = true;
    this.previewAttachmentUrl = '';
    this.previewAttachmentSafeUrl = null;

    const extension = this.previewAttachmentName
      .split('.')
      .pop()
      ?.toLowerCase();

    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(extension || '')) {
      this.previewAttachmentType = 'image';
    } else if (extension === 'pdf') {
      this.previewAttachmentType = 'pdf';
    } else {
      this.previewAttachmentType = 'other';
      this.cdr.detectChanges();
      return;
    }

    this.ticketService.getAttachmentPreview(url).subscribe({
      next: (blob: Blob) => {
        this.previewAttachmentUrl = URL.createObjectURL(blob);

        if (this.previewAttachmentType === 'pdf') {
          this.previewAttachmentSafeUrl =
            this.sanitizer.bypassSecurityTrustResourceUrl(
              this.previewAttachmentUrl
            );
        }

        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Attachment preview failed:', error);
        this.closeAttachmentPreview();
        this.errorMessage =
          error?.status === 401 || error?.status === 403
            ? 'You do not have permission to preview this attachment.'
            : 'Unable to load attachment preview.';
        this.cdr.detectChanges();
      }
    });
  }

  closeAttachmentPreview(): void {
    this.showAttachmentPreview = false;
    this.releaseAttachmentPreviewUrl();
    this.previewAttachmentName = '';
    this.previewAttachmentSafeUrl = null;
    this.previewAttachmentType = 'other';
  }

  private releaseAttachmentPreviewUrl(): void {
    if (this.previewAttachmentUrl) {
      URL.revokeObjectURL(this.previewAttachmentUrl);
      this.previewAttachmentUrl = '';
    }
  }

  ngOnDestroy(): void {
    this.releaseAttachmentPreviewUrl();
  }

  private readApiError(
    error: any,
    fallback: string
  ): string {
    const detail =
      error?.error?.Error ||
      error?.error?.error ||
      error?.error?.detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    if (error?.error && typeof error.error === 'object') {
      const firstValue = Object.values(error.error)[0];

      if (Array.isArray(firstValue) && firstValue.length) {
        return String(firstValue[0]);
      }

      if (typeof firstValue === 'string') {
        return firstValue;
      }
    }

    return fallback;
  }

  // ============================================
  // GET CURRENT ASSIGNEE ID
  // ============================================

  private getAssignedUserId(): number | null {
    const assigned =
      this.ticket?.assigned_to ??
      this.ticket?.assigned_to_id ??
      null;

    if (
      assigned === null ||
      assigned === undefined ||
      assigned === ''
    ) {
      return null;
    }

    if (typeof assigned === 'object') {
      const id = assigned.id ?? assigned.pk;

      return id !== null && id !== undefined
        ? Number(id)
        : null;
    }

    if (
      typeof assigned === 'number' ||
      /^\d+$/.test(String(assigned))
    ) {
      return Number(assigned);
    }

    const matchingUser = this.users.find(
      user =>
        user.username === assigned ||
        user.email === assigned
    );

    return matchingUser
      ? Number(matchingUser.id)
      : null;
  }

  setCurrentAssignee(): void {
    this.selectedAssigneeId = this.getAssignedUserId();
  }

  // ============================================
  // RESOLVE CURRENT TEAM ID
  // ============================================

  private getCurrentTeamId(): number | null {
    const currentTeam =
      this.ticket?.team_id ??
      this.ticket?.team ??
      null;

    if (
      currentTeam === null ||
      currentTeam === undefined ||
      currentTeam === ''
    ) {
      return null;
    }

    if (typeof currentTeam === 'object') {
      const id = currentTeam.id ?? currentTeam.pk;

      return id !== null && id !== undefined
        ? Number(id)
        : null;
    }

    if (
      typeof currentTeam === 'number' ||
      /^\d+$/.test(String(currentTeam))
    ) {
      return Number(currentTeam);
    }

    const matchingTeam = this.teams.find(team =>
      String(team.team_name || team.name || '')
        .trim()
        .toLowerCase() ===
      String(currentTeam).trim().toLowerCase()
    );

    return matchingTeam?.id !== undefined
      ? Number(matchingTeam.id)
      : null;
  }

  setCurrentTeam(): void {
    this.selectedTeamId = this.getCurrentTeamId();
  }

  getTeamName(team: any): string {
    return team?.team_name || team?.name || 'Unnamed team';
  }

  // ============================================
  // AUTOMATIC LOCK STATUS
  // ============================================

  get isTicketLocked(): boolean {
    const assignedUser = this.isEditing
      ? this.selectedAssigneeId
      : (
          this.ticket?.assigned_to ??
          this.ticket?.assigned_to_id ??
          null
        );

    const assignedTeam = this.isEditing
      ? this.selectedTeamId
      : (
          this.ticket?.team_id ??
          this.ticket?.team ??
          null
        );

    return (
      this.hasAssignmentValue(assignedUser) ||
      this.hasAssignmentValue(assignedTeam)
    );
  }

  private hasAssignmentValue(value: any): boolean {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return false;
    }

    if (typeof value === 'object') {
      const identifier =
        value.id ??
        value.pk ??
        value.team_id;

      if (
        identifier !== undefined &&
        identifier !== null
      ) {
        return this.hasAssignmentValue(identifier);
      }

      const label =
        value.username ??
        value.email ??
        value.team_name ??
        value.name;

      return this.hasAssignmentValue(label);
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      return ![
        '',
        'none',
        'null',
        'unassigned',
        'no team',
        '—',
        '-'
      ].includes(normalized);
    }

    return Number(value) > 0;
  }

  // ============================================
  // GET ASSIGNED USER NAME
  // ============================================

  getAssignedUserName(): string {
    const assigned =
      this.ticket?.assigned_to ??
      this.ticket?.assigned_to_id ??
      this.ticket?.assigned_to_username ??
      this.ticket?.assigned_to_name ??
      null;

    if (
      assigned === null ||
      assigned === undefined ||
      assigned === ''
    ) {
      return 'Unassigned';
    }

    if (typeof assigned === 'object') {
      const fullName = [
        assigned.first_name,
        assigned.last_name
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      return (
        fullName ||
        assigned.username ||
        assigned.name ||
        assigned.email ||
        this.getUserNameById(assigned.id ?? assigned.pk) ||
        'Unknown User'
      );
    }

    const user = this.users.find(
      item => String(item.id) === String(assigned)
    );

    if (user) {
      return this.getUserDisplayName(user);
    }

    if (
      typeof assigned === 'string' &&
      !/^\d+$/.test(assigned)
    ) {
      return assigned;
    }

    return this.getUserNameById(assigned) || 'Unknown User';
  }

  private getUserNameById(id: any): string {
    if (
      id === null ||
      id === undefined ||
      id === ''
    ) {
      return '';
    }

    const user = this.users.find(
      item => Number(item.id) === Number(id)
    );

    return user
      ? this.getUserDisplayName(user)
      : '';
  }

  private getUserDisplayName(user: User): string {
    const fullName = [
      user.first_name,
      user.last_name
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return (
      fullName ||
      user.username ||
      user.email ||
      'Unknown User'
    );
  }

  isTicketAssigned(): boolean {
    return this.getAssignedUserId() !== null;
  }

  // ============================================
  // LOAD TICKET
  // ============================================

  loadTicket(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.ticketService.getTicket(id).subscribe({
      next: (response: any) => {
        console.log('FULL TICKET RESPONSE:', response);

        this.ticket = response;

        this.setEditValuesFromTicket();
        this.setCurrentAssignee();
        this.setCurrentTeam();

        this.loading = false;
        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('TICKET DETAILS API ERROR:', error);

        this.ticket = null;
        this.loading = false;

        if (error.status === 401) {
          this.errorMessage =
            'Authentication is required to view this ticket.';
        } else if (error.status === 403) {
          this.errorMessage =
            'You are not allowed to view this ticket.';
        } else if (error.status === 404) {
          this.errorMessage = `Ticket ${id} was not found.`;
        } else if (error.status === 500) {
          this.errorMessage =
            'Server error while loading ticket details.';
        } else if (error.status === 0) {
          this.errorMessage =
            'Unable to connect to the backend server.';
        } else {
          this.errorMessage = this.getSharedErrorMessage(
            error,
            `Unable to load ticket details. Server returned ${error?.status ?? 'an unknown error'}.`
          );
        }

        this.cdr.detectChanges();
      }
    });
  }

  // ============================================
  // ASSIGN OR REASSIGN TICKET
  // ============================================

  assignTicket(): void {
    if (
      !this.ticket ||
      this.ticketId === null ||
      this.assigning
    ) {
      return;
    }

    if (this.selectedAssigneeId !== null) {
      const selectedUser = this.users.find(
        user =>
          Number(user.id) === Number(this.selectedAssigneeId)
      );

      if (
        !selectedUser ||
        selectedUser.is_active === false ||
        String(selectedUser.role || '')
          .trim()
          .toLowerCase() !== 'team member'
      ) {
        this.assignmentError = true;
        this.assignmentMessage =
          'Select an active Team Member from your organization.';
        return;
      }
    }

    this.assigning = true;
    this.assignmentMessage = '';
    this.assignmentError = false;
    this.errorMessage = '';

    const payload = {
      assigned_to: this.selectedAssigneeId
    };

    console.log(
      'Updating ticket assignment:',
      this.ticketId,
      payload
    );

    this.ticketService
      .updateTicket(this.ticketId, payload)
      .subscribe({
        next: () => {
          this.assigning = false;
          this.assignmentError = false;

          this.assignmentMessage =
            this.selectedAssigneeId === null
              ? 'Ticket is now unassigned.'
              : 'Ticket assignment updated successfully.';

          this.loadTicket(this.ticketId!);
          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error('TICKET ASSIGNMENT ERROR:', error);

          this.assigning = false;
          this.assignmentError = true;

          if (error.status === 400) {
            this.assignmentMessage =
              error?.error?.assigned_to?.[0] ||
              error?.error?.detail ||
              'Invalid assignee. Check the selected user and API field.';
          } else if (error.status === 401) {
            this.assignmentMessage =
              'Your session has expired. Please log in again.';
          } else if (error.status === 403) {
            this.assignmentMessage =
              'You do not have permission to assign this ticket.';
          } else if (error.status === 404) {
            this.assignmentMessage =
              'Ticket or selected user was not found.';
          } else {
            this.assignmentMessage =
              this.apiErrorService.getErrorMessage(error) ||
              'Unable to update ticket assignment.';
          }

          this.cdr.detectChanges();
        }
      });
  }

  // ============================================
  // COPY CURRENT VALUES INTO THE EDITOR
  // ============================================

  private setEditValuesFromTicket(): void {
    if (!this.ticket) {
      return;
    }

    this.editTicketName = this.ticket.ticket_name || '';
    this.editDescription = this.ticket.description || '';
    this.editSummary = this.ticket.summary || '';
    this.editCategory = this.ticket.category || '';
    this.editStatus = this.ticket.status || '';
    this.editPriority = this.ticket.priority || '';

    this.setCurrentAssignee();
    this.setCurrentTeam();
  }

  // ============================================
  // START EDITING
  // ============================================

  startEditing(): void {
    if (!this.ticket) {
      return;
    }

    this.setEditValuesFromTicket();

    this.errorMessage = '';
    this.successMessage = '';
    this.isEditing = true;

    this.cdr.detectChanges();
  }

  // ============================================
  // CANCEL EDITING
  // ============================================

  cancelEditing(): void {
    this.setEditValuesFromTicket();

    this.isEditing = false;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  // ============================================
  // SAVE ALL ADMIN-EDITABLE TICKET FIELDS
  // ============================================

  saveChanges(): void {
    if (
      !this.ticket ||
      this.ticketId === null ||
      this.saving
    ) {
      return;
    }

    if (!this.editTicketName.trim()) {
      this.errorMessage = 'Ticket name cannot be empty.';
      return;
    }

    if (!this.editStatus || !this.editPriority) {
      this.errorMessage =
        'Please select both status and priority.';
      return;
    }

    if (this.teamsLoadError) {
      this.errorMessage = this.teamsLoadError;
      return;
    }

    if (this.teamsLoading) {
      this.errorMessage =
        'Teams are still loading. Please try again.';
      return;
    }

    if (this.selectedTeamId !== null) {
      const selectedTeam = this.teams.find(
        team => Number(team.id) === Number(this.selectedTeamId)
      );

      if (!selectedTeam) {
        this.errorMessage =
          'Select a team from your organization.';
        return;
      }
    }

    if (this.selectedAssigneeId !== null) {
      const selectedUser = this.users.find(
        user => Number(user.id) === Number(this.selectedAssigneeId)
      );

      if (
        !selectedUser ||
        selectedUser.is_active === false ||
        String(selectedUser.role || '')
          .trim()
          .toLowerCase() !== 'team member'
      ) {
        this.errorMessage =
          'Select an active Team Member from your organization.';
        return;
      }
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData = {
      ticket_name: this.editTicketName.trim(),
      description: this.editDescription,
      summary: this.editSummary,
      category: this.editCategory.trim(),
      status: this.editStatus,
      priority: this.editPriority,
      assigned_to: this.selectedAssigneeId,
      team: this.selectedTeamId
    };

    // is_locked is intentionally not sent.
    // The existing backend derives it from assigned_to and team.

    console.log(
      'Updating ticket with Admin edit form:',
      updateData
    );

    this.ticketService.updateTicket(
      this.ticketId,
      updateData
    ).subscribe({
      next: () => {
        this.saving = false;
        this.isEditing = false;
        this.successMessage = 'Ticket updated successfully.';

        this.loadTicket(this.ticketId!);
        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('TICKET UPDATE ERROR:', error);

        this.saving = false;

        if (error.status === 400) {
          this.errorMessage = this.getSharedErrorMessage(
            error,
            'Invalid ticket data. Check the selected status, priority, team and assignee.'
          );
        } else if (error.status === 401) {
          this.errorMessage =
            'Authentication is required to update this ticket.';
        } else if (error.status === 403) {
          this.errorMessage =
            'You do not have permission to update this ticket.';
        } else if (error.status === 404) {
          this.errorMessage =
            'Ticket or selected team/user was not found.';
        } else if (error.status === 500) {
          this.errorMessage =
            'Server error while updating ticket.';
        } else if (error.status === 0) {
          this.errorMessage =
            'Unable to connect to the backend server.';
        } else {
          this.errorMessage = this.getSharedErrorMessage(
            error,
            `Unable to update ticket. Server returned ${error?.status ?? 'an unknown error'}.`
          );
        }

        this.cdr.detectChanges();
      }
    });
  }

  // ============================================
  // SHARED API ERROR HANDLING
  // ============================================

  private getSharedErrorMessage(
    error: any,
    fallback: string
  ): string {
    const message =
      this.apiErrorService.getErrorMessage(error);

    return message &&
      message !== 'An unexpected error occurred.'
      ? message
      : fallback;
  }

  // ============================================
  // FORMAT STATUS
  // ============================================

  formatStatus(status: string): string {
    if (!status) {
      return '';
    }

    return status.replace(/_/g, ' ');
  }

  // ============================================
  // BACK TO TICKETS
  // ============================================

  goBack(): void {
    this.router.navigate(['/tickets']);
  }
}