import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';
import { AccountService } from '../../services/account.service';
import { ToastService } from '../../services/toast.service';
import { Transaction, Account } from '../../models/models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="bg-blob" style="width:450px;height:450px;background:#7c5cfc;top:-100px;left:-100px;"></div>

      <div class="page-content">
        <header class="page-header animate-fade-in">
          <div>
            <h1>Transactions</h1>
            <p class="text-secondary">Monitor all financial movements</p>
          </div>
          <button class="btn btn-primary" (click)="openModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Transaction
          </button>
        </header>

        <!-- Summary Cards -->
        <div class="summary-grid animate-fade-in">
          <div class="summary-card">
            <span class="summary-label">Total Credits</span>
            <span class="summary-value text-success">+{{ totalCredits() | number:'1.2-2' }}</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Total Debits</span>
            <span class="summary-value text-danger">-{{ totalDebits() | number:'1.2-2' }}</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Net Flow</span>
            <span class="summary-value" [class]="netFlow() >= 0 ? 'text-success' : 'text-danger'">
              {{ netFlow() >= 0 ? '+' : '' }}{{ netFlow() | number:'1.2-2' }}
            </span>
          </div>
          <div class="summary-card">
            <span class="summary-label">Total Count</span>
            <span class="summary-value">{{ transactions().length }}</span>
          </div>
        </div>

        <!-- Filter Toolbar -->
        <div class="toolbar card animate-fade-in">
          <div class="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input [(ngModel)]="search" placeholder="Search transactions…" class="search-input" />
          </div>
          <select [(ngModel)]="filterType" class="input-field" style="width:160px;">
            <option value="">All Types</option>
            <option value="CREDIT">Credit</option>
            <option value="DEBIT">Debit</option>
            <option value="TRANSFER">Transfer</option>
          </select>
          <select [(ngModel)]="filterStatus" class="input-field" style="width:160px;">
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
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
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted)"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
              <p style="margin-top:12px;">No transactions found</p>
            </div>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of filtered(); track tx.id) {
                  <tr>
                    <td>
                      <div class="tx-icon-cell">
                        <div class="tx-icon" [class]="'tx-' + tx.type.toLowerCase()">
                          @if (tx.type === 'CREDIT') {
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                          } @else if (tx.type === 'DEBIT') {
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                          } @else {
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/></svg>
                          }
                        </div>
                        <span class="badge" [class]="'badge-' + (tx.type === 'CREDIT' ? 'success' : tx.type === 'DEBIT' ? 'danger' : 'info')">{{ tx.type }}</span>
                      </div>
                    </td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ tx.description }}</td>
                    <td><span class="font-mono" style="font-size:0.8rem;color:var(--text-secondary)">{{ tx.accountId }}</span></td>
                    <td>
                      <span class="font-mono" style="font-weight:700;" [class]="tx.type === 'CREDIT' ? 'text-success' : 'text-danger'">
                        {{ tx.type === 'CREDIT' ? '+' : '-' }}{{ tx.amount | number:'1.2-2' }}
                      </span>
                    </td>
                    <td><span style="color:var(--text-secondary);font-size:0.85rem;">{{ tx.date | date:'MMM d, y HH:mm' }}</span></td>
                    <td>
                      <span [class]="'badge ' + (tx.status === 'COMPLETED' ? 'badge-success' : tx.status === 'PENDING' ? 'badge-warning' : 'badge-danger')">
                        {{ tx.status }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>

      <!-- New Transaction Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>New Transaction</h3>
              <button class="btn-icon" (click)="closeModal()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="input-group">
                <label>Account</label>
                <select class="input-field" [(ngModel)]="form.accountId">
                  <option value="">Select account…</option>
                  @for (a of accounts(); track a.id) {
                    <option [value]="a.id">{{ a.ownerName }} — {{ a.iban }}</option>
                  }
                </select>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="input-group">
                  <label>Type</label>
                  <select class="input-field" [(ngModel)]="form.type">
                    <option value="CREDIT">Credit</option>
                    <option value="DEBIT">Debit</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </div>
                <div class="input-group">
                  <label>Amount</label>
                  <input class="input-field" type="number" [(ngModel)]="form.amount" placeholder="0.00" min="0" />
                </div>
              </div>
              <div class="input-group">
                <label>Description</label>
                <input class="input-field" [(ngModel)]="form.description" placeholder="Payment for…" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
              <button class="btn btn-primary" (click)="saveTransaction()" [disabled]="saving()">
                @if (saving()) { <span class="animate-spin">⟳</span> } Submit
              </button>
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

    .summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 20px; }
    @media(max-width:900px) { .summary-grid { grid-template-columns: repeat(2,1fr); } }
    @media(max-width:500px) { .summary-grid { grid-template-columns: 1fr; } }
    .summary-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px 20px; display: flex; flex-direction: column; gap: 6px; }
    .summary-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .summary-value { font-size: 1.5rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; }

    .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding: 14px 18px; flex-wrap: wrap; }
    .search-box { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0 14px; }
    .search-box svg { color: var(--text-muted); flex-shrink: 0; }
    .search-input { background: transparent; border: none; outline: none; color: var(--text-primary); font-family: 'Inter', sans-serif; font-size: 0.9rem; width: 100%; padding: 10px 0; }
    .search-input::placeholder { color: var(--text-muted); }

    .data-table { width: 100%; border-collapse: collapse; }
    .data-table thead { background: rgba(255,255,255,0.02); }
    .data-table th { padding: 14px 18px; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); }
    .data-table td { padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); font-size: 0.9rem; }
    .data-table tbody tr { transition: var(--transition); }
    .data-table tbody tr:hover { background: rgba(255,255,255,0.02); }
    .data-table tbody tr:last-child td { border-bottom: none; }

    .tx-icon-cell { display: flex; align-items: center; gap: 10px; }
    .tx-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .tx-credit   { background: rgba(34,211,165,0.12); color: var(--accent-success); }
    .tx-debit    { background: rgba(244,91,105,0.12);  color: var(--accent-danger); }
    .tx-transfer { background: rgba(79,142,247,0.12);  color: var(--accent-primary); }

    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 64px 32px; color: var(--text-muted); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-box { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); width: 100%; max-width: 520px; animation: fadeInUp 0.2s ease; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 24px 28px 0; }
    .modal-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 18px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 0 28px 24px; }
  `]
})
export class TransactionsComponent implements OnInit {
  private txSvc = inject(TransactionService);
  private accountSvc = inject(AccountService);
  private toast = inject(ToastService);

  transactions = signal<Transaction[]>([]);
  accounts = signal<Account[]>([]);
  loading = signal(true);
  saving  = signal(false);
  showModal = signal(false);
  search = '';
  filterType = '';
  filterStatus = '';
  form: Partial<Transaction> = {};

  totalCredits = () => this.transactions().filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
  totalDebits  = () => this.transactions().filter(t => t.type !== 'CREDIT').reduce((s, t) => s + t.amount, 0);
  netFlow      = () => this.totalCredits() - this.totalDebits();

  get filtered(): any {
    return () => this.transactions().filter(t => {
      const q = this.search.toLowerCase();
      const matchQ = !q || t.description?.toLowerCase().includes(q);
      const matchT = !this.filterType   || t.type === this.filterType;
      const matchS = !this.filterStatus || t.status === this.filterStatus;
      return matchQ && matchT && matchS;
    });
  }

  ngOnInit() {
    this.load();
    this.accountSvc.getAccounts(0, 100).subscribe({
      next: res => this.accounts.set(res.content ?? (res as any) as Account[])
    });
  }

  load() {
    this.loading.set(true);
    this.txSvc.getTransactions(0, 200).subscribe({
      next: res => this.transactions.set(res.content ?? (res as any) as Transaction[]),
      error: () => this.toast.error('Failed to load transactions'),
      complete: () => this.loading.set(false)
    });
  }

  openModal() {
    this.form = { type: 'CREDIT', amount: 0, description: '', status: 'COMPLETED' };
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); }

  saveTransaction() {
    this.saving.set(true);
    this.txSvc.createTransaction(this.form).subscribe({
      next: () => { this.toast.success('Transaction created!'); this.closeModal(); this.load(); },
      error: () => this.toast.error('Failed to create transaction'),
      complete: () => this.saving.set(false)
    });
  }
}
