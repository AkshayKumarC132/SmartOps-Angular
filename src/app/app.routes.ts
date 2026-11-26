import { Routes } from '@angular/router';
import { AdminLayout } from './components/admin-layout/admin-layout';
import { authGuard } from './auth/auth.guard';
import { roleGuard } from './auth/role.guard';
import { navigationLockCanActivateChild } from './auth/navigation-lock.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then(m => m.Login)
  },
  {
    path: '',
    component: AdminLayout,
    canActivate: [authGuard, roleGuard],
    canDeactivate: [navigationLockCanActivateChild],
    data: { roles: ['Admin'] },
    children: [
      {
        path: 'request-organization',
        loadComponent: () => import('./components/request-organization/request-organization').then(m => m.RequestOrganization)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'tickets',
        loadComponent: () => import('./components/ticket/ticket').then(m => m.Tickets)
      },
      {
        path: 'ticket/:id',
        loadComponent: () => import('./components/ticket-details/ticket-details').then(m => m.TicketDetails)
      },
      {
        path: 'teams',
        loadComponent: () => import('./components/teams/teams').then(m => m.Teams)
      },
      {
        path: 'knowledge-base',
        loadComponent: () => import('./components/knowledge-base/knowledge-base').then(m => m.KnowledgeBase)
      },
      {
        path: 'knowledge-base/:id',
        loadComponent: () => import('./components/knowledge-base-details/knowledge-base-details').then(m => m.KnowledgeBaseDetails)
      },
      {
        path: 'ai-results',
        loadComponent: () => import('./components/ai-results/ai-results').then(m => m.AiResults)
      },
      {
        path: 'knowledge-base/:id/edit',
        loadComponent: () => import('./components/knowledge-base-edit/knowledge-base-edit').then(m => m.KnowledgeBaseEdit)
      },
      {
        path: 'user-management',
        loadComponent: () => import('./components/user-management/user-management').then(m => m.UserManagement)
      },
      {
        path: 'sla-config',
        loadComponent: () => import('./components/sla-config/sla-config').then(m => m.SlaConfig)
      },
      {
        path: 'audit-log',
        loadComponent: () => import('./components/audit-log/audit-log').then(m => m.AuditLog)
      },
      {
        path: 'integrations',
        loadComponent: () => import('./components/integrations/integrations').then(m => m.Integrations)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./components/notifications/notifications').then(m => m.Notifications)
      },
      {
        path: 'settings',
        loadComponent: () => import('./components/settings/settings').then(m => m.Settings)
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
