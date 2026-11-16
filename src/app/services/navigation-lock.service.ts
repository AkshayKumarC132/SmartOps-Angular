import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavigationLockService {
  private activeOperations = 0;

  private lockedSubject = new BehaviorSubject<boolean>(false);

  locked$ = this.lockedSubject.asObservable();

  get isLocked(): boolean {
    return this.activeOperations > 0;
  }

  begin(): void {
    this.activeOperations++;
    this.lockedSubject.next(true);
  }

  end(): void {
    if (this.activeOperations > 0) {
      this.activeOperations--;
    }

    this.lockedSubject.next(this.activeOperations > 0);
  }
}