
import { Routes } from '@angular/router';

import { Login } from './components/login/login';
import { AdminLayout } from './components/admin-layout/admin-layout';
import { Tickets } from './components/ticket/ticket';
import { TicketDetails } from './components/ticket-details/ticket-details';
import { Teams } from './components/teams/teams';
import { KnowledgeBase } from './components/knowledge-base/knowledge-base';
import { KnowledgeBaseDetails } from './components/knowledge-base-details/knowledge-base-details';
import { KnowledgeBaseEdit } from './components/knowledge-base-edit/knowledge-base-edit';

import { authGuard } from './auth/auth.guard';
import { roleGuard } from './auth/role.guard';

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
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['Admin']
    },

    children: [

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/dashboard/dashboard')
            .then(m => m.Dashboard)
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
        loadComponent: () =>
          import('./components/ai-results/ai-results')
            .then(m => m.AiResults)
      },

      {
        path: 'knowledge-base/:id/edit',
        component: KnowledgeBaseEdit
      },

      {
        path: 'user-management',
        loadComponent: () =>
          import('./components/user-management/user-management')
            .then(m => m.UserManagement)
      },

      {
        path: 'sla-config',
        loadComponent: () =>
          import('./components/sla-config/sla-config')
            .then(m => m.SlaConfig)
      },

      {
        path: 'audit-log',
        loadComponent: () =>
          import('./components/audit-log/audit-log')
            .then(m => m.AuditLog)
      },

      {
        path: 'notifications',
        loadComponent: () =>
          import('./components/notifications/notifications')
            .then(m => m.Notifications)
      },

      {
        path: 'settings',
        loadComponent: () =>
          import('./components/settings/settings')
            .then(m => m.Settings)
      }

    ]
  },

  {
    path: '**',
    redirectTo: 'login'
  }

];
