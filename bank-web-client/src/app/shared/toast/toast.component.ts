import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type" (click)="toastService.dismiss(toast.id)">
          <span class="toast-icon">
            @switch(toast.type) {
              @case('success') { ✓ }
              @case('error')   { ✕ }
              @case('info')    { ℹ }
            }
          </span>
          {{ toast.message }}
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-icon {
      font-size: 1rem; font-weight: 700; flex-shrink: 0;
      width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
    }
    .toast { cursor: pointer; }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
