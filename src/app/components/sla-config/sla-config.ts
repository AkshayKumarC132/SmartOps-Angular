
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { forkJoin } from 'rxjs';

import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth.service';

import { TicketService } from '../../services/ticket.service';
import { SLAService, SLAConfiguration } from '../../services/sla.service';
import { ApiErrorService } from '../../services/api-error.service';

// ========================================
// SLA RULE INTERFACE
// ========================================

interface SlaRule {
  id: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  responseTime: string;
  resolutionTime: string;
}

// ========================================
// TEAM INTERFACE
// ========================================
interface SlaTeamMember {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
}

interface SlaTeam {
  id: number;
  name: string;
  description?: string;
  members: SlaTeamMember[];
  rules: SlaRule[];
}
@Component({
  selector: 'app-sla-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './sla-config.html',
  styleUrl: './sla-config.css'
})
export class SlaConfig implements OnInit {

  // ========================================
// ORGANIZATION
// ========================================

organizationName = 'Loading...';
organizationPlan = 'Not configured';

  // ========================================
  // TEAMS
  // ========================================

  teams: SlaTeam[] = [];

  loadingTeams = true;

  teamError = '';

  // ========================================
  // MODAL
  // ========================================

  showRuleModal = false;
  showTeamDetailsModal = false;
  selectedTeamDetails: SlaTeam | null = null;
  editingRule: SlaRule | null = null;

  editingTeam: SlaTeam | null = null;

  // ========================================
  // FORM
  // ========================================

  ruleForm = {
    teamId: 0,
    priority: 'Critical' as SlaRule['priority'],
    responseTime: '',
    resolutionTime: ''
  };

  // ========================================
  // UI STATE
  // ========================================

  saving = false;

  successMessage = '';

  errorMessage = '';

  // ========================================
  // PRIORITIES
  // ========================================

  priorities: SlaRule['priority'][] = [
    'Critical',
    'High',
    'Medium',
    'Low'
  ];

  // ========================================
  // CONSTRUCTOR
  // ========================================

 constructor(
  private ticketService: TicketService,
  private slaService: SLAService,
  private cdr: ChangeDetectorRef,
  private apiErrorService: ApiErrorService,
  private authService: AuthService
) {}

  // ========================================
// INIT
// ========================================

ngOnInit(): void {
  this.loadOrganizationInfo();
  this.loadTeams();
}
// ========================================
// TEAM DETAILS
// ========================================

openTeamDetails(team: SlaTeam): void {
  this.selectedTeamDetails = team;
  this.showTeamDetailsModal = true;
}

closeTeamDetails(): void {
  this.showTeamDetailsModal = false;
  this.selectedTeamDetails = null;
}

getTeamMemberName(member: SlaTeamMember): string {
  const fullName =
    `${member.first_name || ''} ${member.last_name || ''}`.trim();

  return fullName || member.username || `User ${member.id}`;
}
// ========================================
// LOAD ORGANIZATION INFORMATION
// ========================================

loadOrganizationInfo(): void {

  const user = this.authService.getUser();

  console.log('Logged-in user:', user);

  if (!user) {
    this.organizationName = 'Organization unavailable';
    this.organizationPlan = 'Not configured';
    return;
  }

  const organization =
    user.Organization ?? user.organization;

  console.log('Organization data:', organization);

  if (
    organization !== null &&
    typeof organization === 'object' &&
    !Array.isArray(organization)
  ) {

    const details = organization as Record<string, unknown>;

    const name =
      details['Organization Name'] ??
      details['name'];

    this.organizationName =
      typeof name === 'string' && name.trim()
        ? name.trim()
        : user.organization_name || 'Organization unavailable';

  } else {

    this.organizationName =
      user.organization_name || 'Organization unavailable';

  }

  this.organizationPlan = 'Not configured';
  console.log(
  'Final organization name:',
  this.organizationName
);

console.log(
  'Final organization plan:',
  this.organizationPlan
);
}

  // ========================================
  // LOAD TEAMS AND SLA CONFIGURATIONS
  // ========================================

  loadTeams(): void {

    this.loadingTeams = true;
    this.teamError = '';

    console.log('Loading teams and SLA configurations...');

    forkJoin({
      teams: this.ticketService.getTeams(),
      configurations: this.slaService.getConfigurations()
    }).subscribe({

      next: (response) => {

        console.log('Teams API Response:', response.teams);

        console.log(
          'SLA Configurations API Response:',
          response.configurations
        );

        if (!Array.isArray(response.teams)) {

          this.teams = [];

          this.teamError =
            'Invalid team data received from the server.';

          this.loadingTeams = false;

          this.cdr.detectChanges();

          return;
        }

        // Map actual backend teams.

        this.teams = response.teams.map(
          (team: any): SlaTeam => {

            const teamId = Number(team.id);

            // Find actual SLA configurations for this team.

            const teamConfigurations =
              response.configurations.filter(
                configuration =>
                  Number(configuration.team) === teamId
              );

            const rules: SlaRule[] =
              teamConfigurations.map(configuration => ({

                id: configuration.id,

                priority: this.toUiPriority(
                  configuration.priority
                ),

                responseTime:
                  this.slaService.formatDuration(
                    configuration.response_time
                  ),

                resolutionTime:
                  this.slaService.formatDuration(
                    configuration.resolution_time
                  )

              }));

            return {
            id: teamId,
            name: team.team_name || team.name,
            description: team.description || '',
            members: Array.isArray(team.team_member_details)
            ? team.team_member_details
            : [],
            rules
          };
          }
        );

        console.log(
          'Teams with actual SLA configurations:',
          this.teams
        );

        this.loadingTeams = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Unable to load SLA configuration:',
          error
        );

        this.teams = [];

        this.loadingTeams = false;

        this.teamError =
          this.apiErrorService.getErrorMessage(error);

        this.cdr.detectChanges();
      }

    });
  }

  // ========================================
  // CONVERT BACKEND PRIORITY TO UI PRIORITY
  // ========================================

  private toUiPriority(
    priority: string
  ): SlaRule['priority'] {

    switch (priority?.toUpperCase()) {

      case 'CRITICAL':
        return 'Critical';

      case 'HIGH':
        return 'High';

      case 'MEDIUM':
        return 'Medium';

      case 'LOW':
        return 'Low';

      default:
        return 'Low';
    }
  }

  // ========================================
  // CONVERT UI PRIORITY TO BACKEND PRIORITY
  // ========================================

  private toApiPriority(
    priority: SlaRule['priority']
  ): SLAConfiguration['priority'] {

    switch (priority) {

      case 'Critical':
        return 'Critical';

      case 'High':
        return 'High';

      case 'Medium':
        return 'Medium';

      case 'Low':
        return 'Low';
    }
  }

  // ========================================
  // GET MISSING PRIORITIES
  // ========================================

  getMissingPriorities(
    team: SlaTeam
  ): SlaRule['priority'][] {

    return this.priorities.filter(
      priority =>
        !team.rules.some(
          rule => rule.priority === priority
        )
    );
  }

  // ========================================
  // HAS MISSING PRIORITIES
  // ========================================

  hasMissingPriorities(
    team: SlaTeam
  ): boolean {

    return this.getMissingPriorities(team).length > 0;
  }

  // ========================================
  // MISSING PRIORITIES TEXT
  // ========================================

  getMissingPrioritiesText(
    team: SlaTeam
  ): string {

    const missing = this.getMissingPriorities(team);

    return missing.join(', ');
  }

  // ========================================
  // ADD RULE
  // ========================================

  openAddRuleModal(): void {

    this.editingRule = null;
    this.editingTeam = null;

    this.ruleForm = {

      teamId:
        this.teams.length > 0
          ? this.teams[0].id
          : 0,

      priority: 'Critical',

      responseTime: '',

      resolutionTime: ''
    };

    this.successMessage = '';
    this.errorMessage = '';

    this.showRuleModal = true;
  }

  // ========================================
  // ADD RULE FOR SPECIFIC TEAM
  // ========================================

  openAddRuleForTeam(
    team: SlaTeam
  ): void {

    this.editingRule = null;
    this.editingTeam = team;

    const missing = this.getMissingPriorities(team);

    this.ruleForm = {

      teamId: team.id,

      priority:
        missing.length > 0
          ? missing[0]
          : 'Critical',

      responseTime: '',

      resolutionTime: ''
    };

    this.successMessage = '';
    this.errorMessage = '';

    this.showRuleModal = true;
  }

  // ========================================
  // EDIT RULE
  // ========================================

  openEditRule(
    team: SlaTeam,
    rule: SlaRule
  ): void {

    this.editingTeam = team;
    this.editingRule = rule;

    this.ruleForm = {

      teamId: team.id,

      priority: rule.priority,

      responseTime: rule.responseTime,

      resolutionTime: rule.resolutionTime
    };

    this.successMessage = '';
    this.errorMessage = '';

    this.showRuleModal = true;
  }

  // ========================================
  // CLOSE MODAL
  // ========================================

  closeRuleModal(): void {

    if (this.saving) {
      return;
    }

    this.showRuleModal = false;

    this.editingRule = null;
    this.editingTeam = null;

    this.errorMessage = '';
  }

  // ========================================
  // SAVE RULE
  // CREATE OR UPDATE THROUGH DJANGO API
  // ========================================

  saveRule(): void {

    this.errorMessage = '';
    this.successMessage = '';

    // Validate team.

    if (!this.ruleForm.teamId) {

      this.errorMessage = 'Please select a team.';

      return;
    }

    // Validate priority.

    if (!this.ruleForm.priority) {

      this.errorMessage = 'Please select a priority.';

      return;
    }

    // Validate response time.

    if (!this.ruleForm.responseTime.trim()) {

      this.errorMessage = 'Response time is required.';

      return;
    }

    // Validate resolution time.

    if (!this.ruleForm.resolutionTime.trim()) {

      this.errorMessage = 'Resolution time is required.';

      return;
    }

    const team = this.teams.find(
      item => item.id === Number(this.ruleForm.teamId)
    );

    if (!team) {

      this.errorMessage = 'Selected team was not found.';

      return;
    }

    // Backend does not allow changing team or priority
    // after an SLA configuration is created.

    if (
      this.editingRule &&
      this.editingRule.priority !== this.ruleForm.priority
    ) {

      this.errorMessage =
        'Priority cannot be changed after SLA configuration creation.';

      return;
    }

    // Check duplicate priority for the selected team.

    const duplicate = team.rules.some(
      rule =>
        rule.priority === this.ruleForm.priority &&
        rule.id !== this.editingRule?.id
    );

    if (duplicate) {

      this.errorMessage =
        `${this.ruleForm.priority} rule already exists for ${team.name}.`;

      return;
    }

    // Convert duration values into API format.

    let responseTime: string;
    let resolutionTime: string;

    try {

      responseTime = this.slaService.toApiDuration(
        this.ruleForm.responseTime
      );

      resolutionTime = this.slaService.toApiDuration(
        this.ruleForm.resolutionTime
      );

    } catch (error) {

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Invalid SLA duration.';

      return;
    }

    // Backend request payload.

    const payload = {

      team: team.id,

      priority: this.toApiPriority(
        this.ruleForm.priority
      ),

      response_time: responseTime,

      resolution_time: resolutionTime
    };

    this.saving = true;

    // ========================================
    // UPDATE EXISTING SLA RULE
    // ========================================

    if (this.editingRule) {

      const ruleId = this.editingRule.id;

      this.slaService.updateConfiguration(
        ruleId,
        payload
      ).subscribe({

        next: (response) => {

          console.log(
            'SLA configuration updated:',
            response
          );

          this.saving = false;

          this.showRuleModal = false;

          this.editingRule = null;
          this.editingTeam = null;

          this.successMessage =
            response.message ||
            'SLA rule updated successfully.';

          // Reload actual saved data from Django.

          this.loadTeams();
        },

        error: (error) => {

          console.error(
            'SLA update failed:',
            error
          );

          this.saving = false;

          this.errorMessage =
            this.apiErrorService.getErrorMessage(error);

          this.cdr.detectChanges();
        }

      });

    }

    // ========================================
    // CREATE NEW SLA RULE
    // ========================================

    else {

      this.slaService.createConfiguration(
        payload
      ).subscribe({

        next: (response) => {

          console.log(
            'SLA configuration created:',
            response
          );

          this.saving = false;

          this.showRuleModal = false;

          this.editingRule = null;
          this.editingTeam = null;

          this.successMessage =
            response.message ||
            'SLA rule added successfully.';

          // Reload actual saved data from Django.

          this.loadTeams();
        },

        error: (error) => {

          console.error(
            'SLA creation failed:',
            error
          );

          this.saving = false;

          this.errorMessage =
            this.apiErrorService.getErrorMessage(error);

          this.cdr.detectChanges();
        }

      });

    }
  }

  // ========================================
  // DELETE RULE - SWEETALERT2
  // DELETE THROUGH DJANGO API
  // ========================================

  async deleteRule(
    team: SlaTeam,
    rule: SlaRule
  ): Promise<void> {

    const result = await Swal.fire({

      title: 'Delete SLA rule?',

      text:
        `Delete the ${rule.priority} SLA rule from ${team.name}?`,

      icon: 'warning',

      showCancelButton: true,

      confirmButtonText: 'Delete',

      cancelButtonText: 'Cancel',

      reverseButtons: true,

      confirmButtonColor: '#d33',

      cancelButtonColor: '#6b7280',

      focusCancel: true

    });

    // Do not delete if the user cancels.

    if (!result.isConfirmed) {
      return;
    }

    // Call Django DELETE API.

    this.slaService.deleteConfiguration(
      rule.id
    ).subscribe({

      next: (response) => {

        console.log(
          'SLA configuration deleted:',
          response
        );

        this.successMessage =
          response.message ||
          'SLA rule deleted successfully.';

        // Reload actual data from Django.

        this.loadTeams();
      },

      error: (error) => {

        console.error(
          'SLA deletion failed:',
          error
        );

        this.errorMessage =
          this.apiErrorService.getErrorMessage(error);

        this.cdr.detectChanges();
      }

    });
  }

  // ========================================
  // PRIORITY CLASS
  // ========================================

  getPriorityClass(
    priority: string
  ): string {

    switch (priority?.toUpperCase()) {

      case 'CRITICAL':
        return 'priority-critical';

      case 'HIGH':
        return 'priority-high';

      case 'MEDIUM':
        return 'priority-medium';

      case 'LOW':
        return 'priority-low';

      default:
        return 'priority-default';
    }
  }

  // ========================================
  // CLEAR MESSAGES
  // ========================================

  clearMessages(): void {

    this.successMessage = '';

    this.errorMessage = '';
  }

}
