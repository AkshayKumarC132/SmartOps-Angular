import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TicketService } from '../../services/ticket.service';

import {
  User,
  UserService
} from '../../services/user.service';


@Component({
  selector: 'app-teams',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './teams.html',
  styleUrl: './teams.css'
})
export class Teams implements OnInit {

  teams: any[] = [];

  users: User[] = [];

  loading = true;

  usersLoading = false;

  saving = false;

  memberSaving = false;

  errorMessage = '';

  successMessage = '';

  memberErrorMessage = '';

  showTeamModal = false;

  showAddMemberModal = false;

  isEditMode = false;

  selectedTeam: any = null;

  selectedUserIds: number[] = [];


  teamForm = {
    team_name: '',
    description: '',
    team_members: [] as number[]
  };


  constructor(
    private ticketService: TicketService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {

    this.loadTeams();

  }


  /* =====================================================
     LOAD TEAMS
     ===================================================== */

  loadTeams(): void {

    this.loading = true;

    this.errorMessage = '';

    this.ticketService
      .getTeams()
      .subscribe({

        next: (response) => {

          console.log(
            'Teams API response:',
            response
          );


          if (Array.isArray(response)) {

            this.teams = response;

          }

          else if (
            response &&
            Array.isArray(
              (response as {
                results?: any[]
              }).results
            )
          ) {

            this.teams =
              (response as {
                results: any[]
              }).results;

          }

          else {

            this.teams = [];

          }


          /*
           * Keep the currently selected team
           * after refresh.
           */

          if (this.selectedTeam?.id) {

            const updatedTeam =
              this.teams.find(
                team =>
                  team.id ===
                  this.selectedTeam.id
              );

            if (updatedTeam) {

              this.selectedTeam =
                updatedTeam;

            }

            else {

              this.selectedTeam =
                this.teams.length > 0
                  ? this.teams[0]
                  : null;

            }

          }

          else if (
            this.teams.length > 0
          ) {

            this.selectedTeam =
              this.teams[0];

          }

          else {

            this.selectedTeam = null;

          }


          this.loading = false;

          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Teams API error:',
            error
          );


          this.teams = [];

          this.selectedTeam = null;

          this.loading = false;


          if (
            error.status === 401
          ) {

            this.errorMessage =
              'Authentication failed. Please login again.';

          }

          else if (
            error.status === 403
          ) {

            this.errorMessage =
              'You do not have permission to view teams.';

          }

          else {

            this.errorMessage =
              'Unable to load teams.';

          }


          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     SELECT TEAM
     ===================================================== */

  selectTeam(team: any): void {

    this.selectedTeam = team;

    this.errorMessage = '';

    this.memberErrorMessage = '';

    this.successMessage = '';

    console.log(
      'Selected team:',
      team
    );

    console.log(
      'Selected team members:',
      team?.team_member_details
    );


    this.cdr.detectChanges();

  }


  /* =====================================================
     GET TEAM MEMBER IDS
     ===================================================== */

  getTeamMemberIds(
    team: any
  ): number[] {

    if (!team) {

      return [];

    }


    /*
     * Preferred:
     *
     * team_members:
     * [1, 2, 3]
     *
     * or:
     *
     * [{id: 1}, {id: 2}]
     */

    if (
      Array.isArray(
        team.team_members
      )
    ) {

      return team.team_members

        .map((member: any) => {

          if (
            typeof member === 'number'
          ) {

            return member;

          }

          if (
            member &&
            typeof member.id === 'number'
          ) {

            return member.id;

          }

          return null;

        })

        .filter(
          (
            id: number | null
          ): id is number =>
            typeof id === 'number'
        );

    }


    /*
     * Fallback:
     *
     * team_member_details
     */

    if (
      Array.isArray(
        team.team_member_details
      )
    ) {

      return team.team_member_details

        .map(
          (member: any) =>
            member?.id
        )

        .filter(
          (id: any) =>
            typeof id === 'number'
        );

    }


    return [];

  }


  /* =====================================================
     GET SELECTED TEAM MEMBERS
     ===================================================== */

  getSelectedMembers(): any[] {

    if (!this.selectedTeam) {

      return [];

    }


    /*
     * Backend normally returns
     * team_member_details.
     */

    if (
      Array.isArray(
        this.selectedTeam
          .team_member_details
      )
    ) {

      return this.selectedTeam
        .team_member_details;

    }


    /*
     * Fallback:
     * match team member IDs
     * against User Management users.
     */

    const memberIds =
      this.getTeamMemberIds(
        this.selectedTeam
      );


    return this.users.filter(
      user =>
        memberIds.includes(
          user.id
        )
    );

  }


  /* =====================================================
     MEMBER COUNT
     ===================================================== */

  getMemberCount(
    team: any
  ): number {

    if (
      team &&
      Array.isArray(
        team.team_member_details
      )
    ) {

      return team
        .team_member_details
        .length;

    }


    return this
      .getTeamMemberIds(team)
      .length;

  }


  /* =====================================================
     MEMBER LABEL
     ===================================================== */

  getMemberLabel(
    team: any
  ): string {

    return this.getMemberCount(team) === 1
      ? 'member'
      : 'members';

  }


  /* =====================================================
     MEMBER NAME
     ===================================================== */

  getMemberName(
    member: any
  ): string {

    if (!member) {

      return 'Team member';

    }


    const fullName =
      `${member.first_name || ''} ${member.last_name || ''}`
        .trim();


    return (
      fullName ||
      member.username ||
      member.name ||
      'Team member'
    );

  }


  /* =====================================================
     MEMBER INITIAL
     ===================================================== */

  getInitial(
    member: any
  ): string {

    const name =
      member?.username ||
      member?.first_name ||
      member?.name ||
      'U';


    return name
      .charAt(0)
      .toUpperCase();

  }


  /* =====================================================
     JOINED DATE
     ===================================================== */

  getJoinedDate(
    member: any
  ): string {

    const date =
      member?.joined_at ||
      member?.joined_date ||
      member?.date_joined ||
      member?.created_at;


    if (!date) {

      return '-';

    }


    const parsedDate =
      new Date(date);


    if (
      isNaN(
        parsedDate.getTime()
      )
    ) {

      return '-';

    }


    return parsedDate
      .toLocaleDateString(
        'en-GB'
      );

  }


  /* =====================================================
     TRACK TEAM
     ===================================================== */

  trackByTeam(
    index: number,
    team: any
  ): number {

    return team?.id ?? index;

  }


  /* =====================================================
     TRACK MEMBER
     ===================================================== */

  trackByMember(
    index: number,
    member: any
  ): number {

    return member?.id ?? index;

  }


  /* =====================================================
     CREATE TEAM
     ===================================================== */

  openCreateTeam(): void {

    this.isEditMode = false;

    this.selectedTeam = null;


    this.teamForm = {

      team_name: '',

      description: '',

      team_members: []

    };


    this.errorMessage = '';

    this.successMessage = '';

    this.showTeamModal = true;

  }


  /* =====================================================
     EDIT TEAM
     ===================================================== */

  openEditTeam(
    team: any
  ): void {

    this.isEditMode = true;

    this.selectedTeam = team;


    this.teamForm = {

      team_name:
        team?.team_name || '',

      description:
        team?.description || '',

      team_members:
        this.getTeamMemberIds(team)

    };


    this.errorMessage = '';

    this.successMessage = '';

    this.showTeamModal = true;

  }


  /* =====================================================
     CLOSE TEAM MODAL
     ===================================================== */

  closeTeamModal(): void {

    if (this.saving) {

      return;

    }


    this.showTeamModal = false;


    this.teamForm = {

      team_name: '',

      description: '',

      team_members: []

    };


    this.errorMessage = '';

  }


  /* =====================================================
     SAVE TEAM
     ===================================================== */

  saveTeam(): void {

    this.errorMessage = '';

    this.successMessage = '';


    const teamName =
      this.teamForm
        .team_name
        .trim();


    const description =
      this.teamForm
        .description
        .trim();


    if (!teamName) {

      this.errorMessage =
        'Team name is required.';

      return;

    }


    if (
      this.isEditMode &&
      !this.selectedTeam?.id
    ) {

      this.errorMessage =
        'Unable to identify the team.';

      return;

    }


    const payload = {

      team_name:
        teamName,

      description:
        description,

      team_members:
        this.teamForm.team_members

    };


    console.log(
      'Team save payload:',
      payload
    );


    this.saving = true;


    if (this.isEditMode) {

      this.ticketService
        .updateTeam(
          this.selectedTeam.id,
          payload
        )
        .subscribe({

          next: (response) => {

            console.log(
              'Team updated:',
              response
            );


            this.saving = false;

            this.showTeamModal = false;


            this.successMessage =
              'Team updated successfully.';


            this.loadTeams();

          },


          error: (error) => {

            console.error(
              'Team update error:',
              error
            );


            this.saving = false;


            this.handleSaveError(
              error,
              'Unable to update team.'
            );


            this.cdr.detectChanges();

          }

        });

    }

    else {

      this.ticketService
        .createTeam(payload)
        .subscribe({

          next: (response) => {

            console.log(
              'Team created:',
              response
            );


            this.saving = false;

            this.showTeamModal = false;


            this.successMessage =
              'Team created successfully.';


            this.loadTeams();

          },


          error: (error) => {

            console.error(
              'Team creation error:',
              error
            );


            this.saving = false;


            this.handleSaveError(
              error,
              'Unable to create team.'
            );


            this.cdr.detectChanges();

          }

        });

    }

  }


  /* =====================================================
     SAVE ERROR
     ===================================================== */

  handleSaveError(
    error: any,
    defaultMessage: string
  ): void {

    if (
      error.status === 400
    ) {

      if (
        error.error &&
        typeof error.error === 'object'
      ) {

        const messages: string[] = [];


        Object.keys(
          error.error
        ).forEach(
          key => {

            const value =
              error.error[key];


            if (
              Array.isArray(value)
            ) {

              messages.push(
                `${key}: ${value.join(', ')}`
              );

            }

            else if (
              typeof value === 'string'
            ) {

              messages.push(
                `${key}: ${value}`
              );

            }

          }
        );


        this.errorMessage =
          messages.length > 0
            ? messages.join(' | ')
            : defaultMessage;

      }

      else {

        this.errorMessage =
          defaultMessage;

      }

    }

    else if (
      error.status === 401
    ) {

      this.errorMessage =
        'Authentication failed. Please login again.';

    }

    else if (
      error.status === 403
    ) {

      this.errorMessage =
        'You do not have permission to perform this action.';

    }

    else {

      this.errorMessage =
        defaultMessage;

    }

  }


  /* =====================================================
     OPEN ADD MEMBER
     ===================================================== */

  openAddMember(): void {

    if (!this.selectedTeam) {

      this.errorMessage =
        'Please select a team first.';

      return;

    }


    this.selectedUserIds = [];

    this.memberErrorMessage = '';

    this.showAddMemberModal = true;


    console.log(
      'Opening Add Member for:',
      this.selectedTeam
    );


    this.loadUsers();

  }


  /* =====================================================
     LOAD USERS
     ===================================================== */

  loadUsers(): void {

    this.usersLoading = true;

    this.memberErrorMessage = '';


    console.log(
      'Loading users for Teams...'
    );


    this.userService
      .getUsers()
      .subscribe({

        next: (response) => {

          console.log(
            'Users loaded for Teams:',
            response
          );


          this.users =
            Array.isArray(response)
              ? response
              : [];


          this.usersLoading = false;


          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Users API error:',
            error
          );


          this.users = [];

          this.usersLoading = false;


          if (
            error.status === 401
          ) {

            this.memberErrorMessage =
              'Authentication failed. Please login again.';

          }

          else if (
            error.status === 403
          ) {

            this.memberErrorMessage =
              'Only Admin users can load users.';

          }

          else {

            this.memberErrorMessage =
              'Unable to load users from User Management.';

          }


          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     EXISTING MEMBER
     ===================================================== */

  isExistingMember(
    userId: number
  ): boolean {

    if (!this.selectedTeam) {

      return false;

    }


    return this
      .getTeamMemberIds(
        this.selectedTeam
      )
      .includes(userId);

  }


  /* =====================================================
     USER SELECTED
     ===================================================== */

  isUserSelected(
    userId: number
  ): boolean {

    return this
      .selectedUserIds
      .includes(userId);

  }


  /* =====================================================
     TOGGLE USER
     ===================================================== */

  toggleUserSelection(
    userId: number
  ): void {

    if (
      this.isExistingMember(userId)
    ) {

      return;

    }


    const index =
      this.selectedUserIds
        .indexOf(userId);


    if (index >= 0) {

      this.selectedUserIds
        .splice(index, 1);

    }

    else {

      this.selectedUserIds
        .push(userId);

    }


    console.log(
      'Selected user IDs:',
      this.selectedUserIds
    );

  }


  /* =====================================================
     CLOSE ADD MEMBER MODAL
     ===================================================== */

  closeAddMember(): void {

    if (this.memberSaving) {

      return;

    }


    this.showAddMemberModal = false;

    this.selectedUserIds = [];

    this.memberErrorMessage = '';

  }


  /* =====================================================
     ADD MEMBERS
     ===================================================== */

  addMembers(): void {

    this.memberErrorMessage = '';

    this.successMessage = '';


    if (!this.selectedTeam?.id) {

      this.memberErrorMessage =
        'Please select a team.';

      return;

    }


    if (
      this.selectedUserIds.length === 0
    ) {

      this.memberErrorMessage =
        'Please select at least one user.';

      return;

    }


    /*
     * Preserve existing members.
     */

    const existingIds =
      this.getTeamMemberIds(
        this.selectedTeam
      );


    /*
     * Add newly selected IDs.
     */

    const finalMemberIds =
      Array.from(
        new Set([
          ...existingIds,
          ...this.selectedUserIds
        ])
      );


    const payload = {

      team_name:
        this.selectedTeam.team_name,

      description:
        this.selectedTeam.description || '',

      team_members:
        finalMemberIds

    };


    console.log(
      '================================'
    );

    console.log(
      'ADD MEMBERS'
    );

    console.log(
      'Team:',
      this.selectedTeam.team_name
    );

    console.log(
      'Existing IDs:',
      existingIds
    );

    console.log(
      'New IDs:',
      this.selectedUserIds
    );

    console.log(
      'Final IDs:',
      finalMemberIds
    );

    console.log(
      'Payload:',
      payload
    );

    console.log(
      '================================'
    );


    this.memberSaving = true;


    this.ticketService
      .updateTeam(
        this.selectedTeam.id,
        payload
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Members added successfully:',
            response
          );


          this.memberSaving = false;

          this.showAddMemberModal = false;

          this.selectedUserIds = [];


          this.successMessage =
            'Member added successfully.';


          /*
           * Reload teams.
           */

          this.reloadSelectedTeam();

        },


        error: (error) => {

          console.error(
            'Add member error:',
            error
          );


          this.memberSaving = false;


          this.handleMemberError(
            error,
            'Unable to add member to team.'
          );


          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     REMOVE MEMBER
     ===================================================== */

  removeMember(
    member: any
  ): void {

    if (
      !this.selectedTeam?.id
    ) {

      this.errorMessage =
        'Please select a team.';

      return;

    }


    if (
      !member?.id
    ) {

      this.errorMessage =
        'Unable to identify the member.';

      return;

    }


    const memberName =
      this.getMemberName(member);


    const confirmed =
      window.confirm(
        `Remove ${memberName} from ${this.selectedTeam.team_name}?`
      );


    if (!confirmed) {

      return;

    }


    /*
     * Get all current member IDs.
     */

    const currentMemberIds =
      this.getTeamMemberIds(
        this.selectedTeam
      );


    /*
     * Remove only this user.
     */

    const updatedMemberIds =
      currentMemberIds.filter(
        id =>
          id !== member.id
      );


    const payload = {

      team_name:
        this.selectedTeam.team_name,

      description:
        this.selectedTeam.description || '',

      team_members:
        updatedMemberIds

    };


    console.log(
      '================================'
    );

    console.log(
      'REMOVE MEMBER'
    );

    console.log(
      'Member:',
      member
    );

    console.log(
      'Current IDs:',
      currentMemberIds
    );

    console.log(
      'Updated IDs:',
      updatedMemberIds
    );

    console.log(
      'Payload:',
      payload
    );

    console.log(
      '================================'
    );


    this.memberSaving = true;

    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';


    this.ticketService
      .updateTeam(
        this.selectedTeam.id,
        payload
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Member removed successfully:',
            response
          );


          this.memberSaving = false;

          this.saving = false;


          this.successMessage =
            `${memberName} removed from the team successfully.`;


          /*
           * Refresh team data.
           */

          this.reloadSelectedTeam();

        },


        error: (error) => {

          console.error(
            'Remove member error:',
            error
          );


          this.memberSaving = false;

          this.saving = false;


          this.handleMemberError(
            error,
            'Unable to remove member from the team.'
          );


          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     MEMBER ERROR
     ===================================================== */

  handleMemberError(
    error: any,
    defaultMessage: string
  ): void {

    if (
      error.status === 400
    ) {

      if (
        error.error &&
        typeof error.error === 'object'
      ) {

        const messages: string[] = [];


        Object.keys(
          error.error
        ).forEach(
          key => {

            const value =
              error.error[key];


            if (
              Array.isArray(value)
            ) {

              messages.push(
                `${key}: ${value.join(', ')}`
              );

            }

            else if (
              typeof value === 'string'
            ) {

              messages.push(
                `${key}: ${value}`
              );

            }

          }
        );


        this.memberErrorMessage =
          messages.length > 0
            ? messages.join(' | ')
            : defaultMessage;

      }

      else {

        this.memberErrorMessage =
          defaultMessage;

      }

    }

    else if (
      error.status === 401
    ) {

      this.memberErrorMessage =
        'Authentication failed. Please login again.';

    }

    else if (
      error.status === 403
    ) {

      this.memberErrorMessage =
        'You do not have permission to modify this team.';

    }

    else {

      this.memberErrorMessage =
        defaultMessage;

    }

  }


  /* =====================================================
     RELOAD SELECTED TEAM
     ===================================================== */

  reloadSelectedTeam(): void {

    const selectedTeamId =
      this.selectedTeam?.id;


    this.ticketService
      .getTeams()
      .subscribe({

        next: (response) => {

          const updatedTeams =
            Array.isArray(response)
              ? response
              : [];


          this.teams =
            updatedTeams;


          if (selectedTeamId) {

            this.selectedTeam =
              this.teams.find(
                team =>
                  team.id ===
                  selectedTeamId
              ) || null;

          }


          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Unable to reload teams:',
            error
          );


          this.loadTeams();

        }

      });

  }


  /* =====================================================
     USER DISPLAY
     ===================================================== */

  getUserDisplayName(
    user: User
  ): string {

    const fullName =
      `${user.first_name || ''} ${user.last_name || ''}`
        .trim();


    return (
      fullName ||
      user.username ||
      'User'
    );

  }

}