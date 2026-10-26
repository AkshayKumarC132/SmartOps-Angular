
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import Swal from 'sweetalert2';

import { TicketService } from '../../services/ticket.service';
import { ApiErrorService } from '../../services/api-error.service';

interface SlaRule {
  id: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  responseTime: string;
  resolutionTime: string;
}

interface SlaTeam {
  id: number;
  name: string;
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

  // ORGANIZATION

  organizationName = 'Stratapps';
  organizationPlan = 'Enterprise';

  // TEAMS

  teams: SlaTeam[] = [];

  loadingTeams = true;

  teamError = '';

  // MODAL

  showRuleModal = false;

  editingRule: SlaRule | null = null;

  editingTeam: SlaTeam | null = null;

  // FORM

  ruleForm = {
    teamId: 0,
    priority: 'CRITICAL' as SlaRule['priority'],
    responseTime: '',
    resolutionTime: ''
  };

  // UI STATE

  saving = false;

  successMessage = '';

  errorMessage = '';

  // PRIORITIES

  priorities: SlaRule['priority'][] = [
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
  ];

  // CONSTRUCTOR

  constructor(
    private ticketService: TicketService,
    private cdr: ChangeDetectorRef,
    private apiErrorService: ApiErrorService
  ) {}

  // INIT

  ngOnInit(): void {
    this.loadTeams();
  }

  // LOAD TEAMS FROM BACKEND

  loadTeams(): void {
    this.loadingTeams = true;
    this.teamError = '';

    console.log(
      'Loading teams for SLA Configuration...'
    );

    this.ticketService.getTeams().subscribe({

      next: (response: any[]) => {
        console.log(
          'SLA Teams API Response:',
          response
        );

        if (!Array.isArray(response)) {
          this.teams = [];

          this.teamError =
            'Invalid team data received from the server.';

          this.loadingTeams = false;

          this.cdr.detectChanges();

          return;
        }

        // Existing SLA rules are intentionally empty here.
        // The real SLA rules API will be connected separately.

        this.teams = response.map(
          (team: any): SlaTeam => ({
            id: Number(team.id),

            name:
              team.team_name ||
              team.name ||
              `Team ${team.id}`,

            rules: []
          })
        );

        console.log(
          'Teams displayed in SLA Configuration:',
          this.teams
        );

        this.loadingTeams = false;

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error(
          'Unable to load SLA teams:',
          error
        );

        this.teams = [];

        this.loadingTeams = false;

        if (error.status === 401) {
          this.teamError =
            'Authentication failed. Please login again.';
        } else if (error.status === 403) {
          this.teamError =
            'You do not have permission to view teams.';
        } else if (error.status === 0) {
          this.teamError =
            'Unable to connect to the backend server.';
        } else {
          this.teamError =
            this.apiErrorService.getErrorMessage(error) ||
            'Unable to load teams.';
        }

        this.cdr.detectChanges();
      }

    });
  }

  // GET MISSING PRIORITIES

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

  // HAS MISSING PRIORITIES

  hasMissingPriorities(
    team: SlaTeam
  ): boolean {
    return this.getMissingPriorities(team).length > 0;
  }

  // MISSING PRIORITIES TEXT

  getMissingPrioritiesText(
    team: SlaTeam
  ): string {
    const missing =
      this.getMissingPriorities(team);

    return missing.join(', ');
  }

  // ADD RULE

  openAddRuleModal(): void {
    this.editingRule = null;
    this.editingTeam = null;

    this.ruleForm = {
      teamId:
        this.teams.length > 0
          ? this.teams[0].id
          : 0,

      priority: 'CRITICAL',

      responseTime: '',

      resolutionTime: ''
    };

    this.successMessage = '';
    this.errorMessage = '';

    this.showRuleModal = true;
  }

  // ADD RULE FOR SPECIFIC TEAM

  openAddRuleForTeam(
    team: SlaTeam
  ): void {
    this.editingRule = null;
    this.editingTeam = team;

    const missing =
      this.getMissingPriorities(team);

    this.ruleForm = {
      teamId: team.id,

      priority:
        missing.length > 0
          ? missing[0]
          : 'CRITICAL',

      responseTime: '',

      resolutionTime: ''
    };

    this.successMessage = '';
    this.errorMessage = '';

    this.showRuleModal = true;
  }

  // EDIT RULE

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

  // CLOSE MODAL

  closeRuleModal(): void {
    if (this.saving) {
      return;
    }

    this.showRuleModal = false;

    this.editingRule = null;
    this.editingTeam = null;

    this.errorMessage = '';
  }

  // SAVE RULE
  // Updates frontend state only, as in the original code.

  saveRule(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.ruleForm.teamId) {
      this.errorMessage = 'Please select a team.';
      return;
    }

    if (!this.ruleForm.priority) {
      this.errorMessage = 'Please select a priority.';
      return;
    }

    if (!this.ruleForm.responseTime.trim()) {
      this.errorMessage = 'Response time is required.';
      return;
    }

    if (!this.ruleForm.resolutionTime.trim()) {
      this.errorMessage = 'Resolution time is required.';
      return;
    }

    const team = this.teams.find(
      item =>
        item.id === Number(this.ruleForm.teamId)
    );

    if (!team) {
      this.errorMessage = 'Selected team was not found.';
      return;
    }

    this.saving = true;

    // EDIT

    if (this.editingRule) {
      const duplicate = team.rules.some(
        rule =>
          rule.id !== this.editingRule!.id &&
          rule.priority === this.ruleForm.priority
      );

      if (duplicate) {
        this.errorMessage =
          `${this.ruleForm.priority} rule already exists for ${team.name}.`;

        this.saving = false;
        return;
      }

      this.editingRule.priority =
        this.ruleForm.priority;

      this.editingRule.responseTime =
        this.ruleForm.responseTime.trim();

      this.editingRule.resolutionTime =
        this.ruleForm.resolutionTime.trim();

      this.successMessage =
        'SLA rule updated successfully.';
    }

    // CREATE

    else {
      const duplicate = team.rules.some(
        rule =>
          rule.priority === this.ruleForm.priority
      );

      if (duplicate) {
        this.errorMessage =
          `${this.ruleForm.priority} rule already exists for ${team.name}.`;

        this.saving = false;
        return;
      }

      const newRule: SlaRule = {
        id: this.getNextRuleId(),

        priority: this.ruleForm.priority,

        responseTime:
          this.ruleForm.responseTime.trim(),

        resolutionTime:
          this.ruleForm.resolutionTime.trim()
      };

      team.rules.push(newRule);

      this.successMessage =
        'SLA rule added successfully.';
    }

    this.saving = false;

    this.showRuleModal = false;

    this.editingRule = null;
    this.editingTeam = null;

    this.cdr.detectChanges();
  }

  // DELETE RULE - SWEETALERT2

  async deleteRule(
    team: SlaTeam,
    rule: SlaRule
  ): Promise<void> {

    const result = await Swal.fire({
      title: 'Delete SLA rule?',
      text: `Delete the ${rule.priority} SLA rule from ${team.name}?`,
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

    // Preserve the original deletion behavior.

    team.rules = team.rules.filter(
      item => item.id !== rule.id
    );

    this.successMessage =
      'SLA rule deleted successfully.';

    this.cdr.detectChanges();
  }

  // NEXT RULE ID

  private getNextRuleId(): number {
    const ids = this.teams.flatMap(
      team =>
        team.rules.map(
          rule => rule.id
        )
    );

    return ids.length > 0
      ? Math.max(...ids) + 1
      : 1;
  }

  // PRIORITY CLASS

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

  // CLEAR MESSAGES

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
