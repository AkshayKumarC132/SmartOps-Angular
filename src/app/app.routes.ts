import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { Tickets } from './components/ticket/ticket';
import { TicketDetails } from './components/ticket-details/ticket-details';
import { Teams } from './components/teams/teams';
import { KnowledgeBase } from './components/knowledge-base/knowledge-base';
import { AiResults } from './components/ai-results/ai-results';
import { AdminLayout } from './components/admin-layout/admin-layout';
import { KnowledgeBaseDetails } from './components/knowledge-base-details/knowledge-base-details';
import { KnowledgeBaseEdit } from './components/knowledge-base-edit/knowledge-base-edit';
import { UserManagement } from './components/user-management/user-management';
import { SlaConfig } from './components/sla-config/sla-config';
import { AuditLog } from './components/audit-log/audit-log';
import { Notifications } from './components/notifications/notifications';
import { Settings } from './components/settings/settings';
import { authGuard } from './auth/auth.guard';


export const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    component: Login
  },

  {
    path: '',
    component: AdminLayout,
    canActivate: [authGuard],

    children: [

      {
        path: 'dashboard',
        component: Dashboard
      },

      {
        path: 'tickets',
        component: Tickets
      },

      {
        path: 'ticket/:id',
        component: TicketDetails
      },

      {
        path: 'teams',
        component: Teams
      },

      {
        path: 'knowledge-base',
        component: KnowledgeBase
      },

      {
        path: 'knowledge-base/:id',
        component: KnowledgeBaseDetails
      },

      {
        path: 'ai-results',
        component: AiResults
      },

      {
        path: 'knowledge-base/:id/edit',
        component: KnowledgeBaseEdit
      },

      {
        path: 'user-management',
        component: UserManagement
      },

      {
        path: 'sla-config',
        component: SlaConfig
      },

      {
        path: 'audit-log',
        component: AuditLog
      },

      {
        path: 'notifications',
        component: Notifications
      },

      {
        path: 'settings',
        component: Settings
      }

    ]
  },

  {
    path: '**',
    redirectTo: 'login'
  }

];