import { inject } from '@angular/core';
import { CanActivateChildFn } from '@angular/router';
import { NavigationLockService } from '../services/navigation-lock.service';

export const navigationLockCanActivateChild: CanActivateChildFn = () => {
  return !inject(NavigationLockService).isLocked;
};