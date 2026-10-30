import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../services/account.service';
import { ToastService } from '../../services/toast.service';
import { Account } from '../../models/models';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="bg-blob" style="width:500px;height:500px;background:#4f8ef7;top:-150px;right:-150px;"></div>

      <div class="page-content">
        <header class="page-header animate-fade-in">
          <div>
            <h1>Accounts</h1>
            <p class="text-secondary">Manage all bank accounts</p>
          </div>
          <button class="btn btn-primary" (click)="openModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Account
          </button>
        </header>

        <!-- Search & Filter -->
        <div class="toolbar card animate-fade-in">
          <div class="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input [(ngModel)]="search" placeholder="Search by name or IBAN…" class="search-input" />
          </div>
          <select [(ngModel)]="filterType" class="input-field" style="width:180px;">
            <option value="">All Types</option>
            <option value="CHECKING">Checking</option>
            <option value="SAVINGS">Savings</option>
            <option value="BUSINESS">Business</option>
          </select>
          <select [(ngModel)]="filterStatus" class="input-field" style="width:180px;">
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <!-- Table -->
        <div class="card animate-fade-in" style="padding:0;overflow:hidden;">
          @if (loading()) {
            <div style="padding:32px;">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="skeleton" style="height:60px;margin-bottom:10px;border-radius:10px;"></div>
              }
            </div>
          } @else if (filtered().length === 0) {
            <div class="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted)"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              <p style="margin-top:12px;">No accounts found</p>
              <button class="btn btn-primary" style="margin-top:16px;" (click)="openModal()">Create First Account</button>
            </div>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>Account Holder</th>
                  <th>IBAN</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (acc of filtered(); track acc.id) {
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:12px;">
                        <div class="avatar" [class]="'avatar-' + acc.type.toLowerCase()">{{ acc.ownerName.charAt(0) }}</div>
                        <span style="font-weight:600;">{{ acc.ownerName }}</span>
                      </div>
                    </td>
                    <td><span class="font-mono" style="font-size:0.8rem;color:var(--text-secondary)">{{ acc.iban }}</span></td>
                    <td><span class="badge badge-info">{{ acc.type }}</span></td>
                    <td><span style="font-weight:700;font-family:'JetBrains Mono',monospace;">{{ acc.balance | number:'1.2-2' }} {{ acc.currency }}</span></td>
                    <td>
                      <span [class]="'badge ' + (acc.status === 'ACTIVE' ? 'badge-success' : acc.status === 'SUSPENDED' ? 'badge-warning' : 'badge-danger')">
                        {{ acc.status }}
                      </span>
                    </td>
                    <td>
                      <div style="display:flex;justify-content:flex-end;gap:8px;">
                        <button class="btn-icon" title="Edit" (click)="openModal(acc)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-icon btn-danger" title="Delete" (click)="confirmDelete(acc)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>

      <!-- Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingAccount() ? 'Edit Account' : 'New Account' }}</h3>
              <button class="btn-icon" (click)="closeModal()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="input-group">
                <label>Owner Name</label>
                <input class="input-field" [(ngModel)]="form.ownerName" placeholder="John Doe" />
              </div>
              <div class="input-group">
                <label>IBAN</label>
                <input class="input-field font-mono" [(ngModel)]="form.iban" placeholder="MA64..." [readonly]="!!editingAccount()" />
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="input-group">
                  <label>Type</label>
                  <select class="input-field" [(ngModel)]="form.type">
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </div>
                <div class="input-group">
                  <label>Currency</label>
                  <select class="input-field" [(ngModel)]="form.currency">
                    <option value="MAD">MAD</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              @if (!editingAccount()) {
                <div class="input-group">
                  <label>Initial Balance</label>
                  <input class="input-field" type="number" [(ngModel)]="form.balance" placeholder="0.00" />
                </div>
              }
              @if (editingAccount()) {
                <div class="input-group">
                  <label>Status</label>
                  <select class="input-field" [(ngModel)]="form.status">
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
              <button class="btn btn-primary" (click)="saveAccount()" [disabled]="saving()">
                @if (saving()) { <span class="animate-spin">⟳</span> }
                {{ editingAccount() ? 'Save Changes' : 'Create Account' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirm -->
      @if (deleteTarget()) {
        <div class="modal-overlay" (click)="deleteTarget.set(null)">
          <div class="modal-box modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Delete Account?</h3>
            </div>
            <div class="modal-body">
              <p class="text-secondary">This will permanently delete <strong style="color:var(--text-primary)">{{ deleteTarget()!.ownerName }}</strong>'s account. This action cannot be undone.</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" (click)="deleteTarget.set(null)">Cancel</button>
              <button class="btn btn-danger" (click)="deleteAccount()" [disabled]="saving()">Delete</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { position: relative; min-height: 100vh; }
    .page-content { max-width: 1280px; margin: 0 auto; padding: 32px 24px; position: relative; z-index: 1; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
    .page-header h1 { font-size: 2rem; }

    .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding: 16px 20px; flex-wrap: wrap; }
    .search-box { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0 14px; }
    .search-box svg { color: var(--text-muted); flex-shrink: 0; }
    .search-input { background: transparent; border: none; outline: none; color: var(--text-primary); font-family: 'Inter', sans-serif; font-size: 0.9rem; width: 100%; padding: 11px 0; }
    .search-input::placeholder { color: var(--text-muted); }

    .data-table { width: 100%; border-collapse: collapse; }
    .data-table thead { background: rgba(255,255,255,0.02); }
    .data-table th { padding: 14px 18px; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); }
    .data-table td { padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); font-size: 0.9rem; }
    .data-table tbody tr { transition: var(--transition); }
    .data-table tbody tr:hover { background: rgba(255,255,255,0.02); }
    .data-table tbody tr:last-child td { border-bottom: none; }

    .avatar { width: 38px; height: 38px; border-radius: 10px; font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .avatar-checking { background: rgba(79,142,247,0.15); color: var(--accent-primary); }
    .avatar-savings  { background: rgba(34,211,165,0.15); color: var(--accent-success); }
    .avatar-business { background: rgba(124,92,252,0.15); color: var(--accent-secondary); }

    .btn-danger { background: rgba(244,91,105,0.1); color: var(--accent-danger); border-color: rgba(244,91,105,0.15); }
    .btn-danger:hover { background: rgba(244,91,105,0.2); }

    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 64px 32px; color: var(--text-muted); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-box { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); width: 100%; max-width: 520px; animation: fadeInUp 0.2s ease; }
    .modal-sm { max-width: 400px; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 24px 28px 0; }
    .modal-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 18px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 0 28px 24px; }
  `]
})
export class AccountsComponent implements OnInit {
  private accountSvc = inject(AccountService);
  private toast = inject(ToastService);

  accounts  = signal<Account[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  showModal = signal(false);
  editingAccount = signal<Account | null>(null);
  deleteTarget   = signal<Account | null>(null);
  search       = '';
  filterType   = '';
  filterStatus = '';

  form: Partial<Account> = {};

  get filtered(): any {
    return () => this.accounts().filter(a => {
      const q = this.search.toLowerCase();
      const matchQ = !q || a.ownerName.toLowerCase().includes(q) || a.iban?.toLowerCase().includes(q);
      const matchT = !this.filterType   || a.type === this.filterType;
      const matchS = !this.filterStatus || a.status === this.filterStatus;
      return matchQ && matchT && matchS;
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.accountSvc.getAccounts(0, 100).subscribe({
      next: res => this.accounts.set(res.content ?? (res as any) as Account[]),
      error: () => this.toast.error('Failed to load accounts'),
      complete: () => this.loading.set(false)
    });
  }

  openModal(acc?: Account) {
    this.editingAccount.set(acc ?? null);
    this.form = acc ? { ...acc } : { type: 'CHECKING', currency: 'MAD', balance: 0, status: 'ACTIVE' };
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); this.editingAccount.set(null); }

  saveAccount() {
    this.saving.set(true);
    const op = this.editingAccount()
      ? this.accountSvc.updateAccount(this.editingAccount()!.id, this.form)
      : this.accountSvc.createAccount(this.form);

    op.subscribe({
      next: () => {
        this.toast.success(this.editingAccount() ? 'Account updated!' : 'Account created!');
        this.closeModal(); this.load();
      },
      error: () => this.toast.error('Operation failed'),
      complete: () => this.saving.set(false)
    });
  }

  confirmDelete(acc: Account) { this.deleteTarget.set(acc); }

  deleteAccount() {
    this.saving.set(true);
    this.accountSvc.deleteAccount(this.deleteTarget()!.id).subscribe({
      next: () => { this.toast.success('Account deleted'); this.deleteTarget.set(null); this.load(); },
      error: () => this.toast.error('Delete failed'),
      complete: () => this.saving.set(false)
    });
  }
}
