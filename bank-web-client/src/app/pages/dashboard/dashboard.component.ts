import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { TransactionService } from '../../services/transaction.service';
import { Account, Transaction } from '../../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <!-- Ambient blobs -->
      <div class="bg-blob" style="width:600px;height:600px;background:#4f8ef7;top:-200px;left:-200px;"></div>
      <div class="bg-blob" style="width:400px;height:400px;background:#7c5cfc;bottom:-100px;right:-100px;"></div>

      <div class="page-content">
        <!-- Header -->
        <header class="page-header animate-fade-in">
          <div>
            <h1>Welcome back 👋</h1>
            <p class="text-secondary">Here's your financial overview for today.</p>
          </div>
          <div class="header-actions">
            <a routerLink="/assistant" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Ask AI
            </a>
          </div>
        </header>

        <!-- KPI Cards -->
        <div class="kpi-grid animate-fade-in">
          <div class="kpi-card kpi-primary">
            <div class="kpi-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-label">Total Accounts</span>
              @if (loading()) {
                <div class="skeleton" style="height:32px;width:60px;margin-top:4px;"></div>
              } @else {
                <span class="kpi-value">{{ accounts().length }}</span>
              }
            </div>
          </div>

          <div class="kpi-card kpi-success">
            <div class="kpi-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-label">Total Balance</span>
              @if (loading()) {
                <div class="skeleton" style="height:32px;width:120px;margin-top:4px;"></div>
              } @else {
                <span class="kpi-value">{{ totalBalance() | number:'1.2-2' }} <small>MAD</small></span>
              }
            </div>
          </div>

          <div class="kpi-card kpi-purple">
            <div class="kpi-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-label">Transactions</span>
              @if (loading()) {
                <div class="skeleton" style="height:32px;width:60px;margin-top:4px;"></div>
              } @else {
                <span class="kpi-value">{{ txCount() }}</span>
              }
            </div>
          </div>

          <div class="kpi-card kpi-warning">
            <div class="kpi-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-label">AI Assistant</span>
              <span class="kpi-value">Online <span class="status-dot"></span></span>
            </div>
          </div>
        </div>

        <div class="bottom-grid">
          <!-- Accounts List -->
          <div class="card animate-fade-in">
            <div class="section-header">
              <h3>Recent Accounts</h3>
              <a routerLink="/accounts" class="btn btn-ghost" style="padding:8px 16px;font-size:0.8rem;">View all</a>
            </div>
            @if (loading()) {
              @for (i of [1,2,3]; track i) {
                <div class="skeleton" style="height:72px;margin-bottom:12px;border-radius:12px;"></div>
              }
            } @else if (accounts().length === 0) {
              <div class="empty-state">
                <p>No accounts found.</p>
                <a routerLink="/accounts" class="btn btn-primary" style="margin-top:12px;">Create Account</a>
              </div>
            } @else {
              @for (acc of accounts().slice(0, 5); track acc.id) {
                <div class="account-row">
                  <div class="account-avatar" [class]="'avatar-' + acc.type.toLowerCase()">
                    {{ acc.ownerName.charAt(0).toUpperCase() }}
                  </div>
                  <div class="account-info">
                    <span class="account-name">{{ acc.ownerName }}</span>
                    <span class="account-iban font-mono">{{ acc.iban }}</span>
                  </div>
                  <div class="account-right">
                    <span class="account-balance">{{ acc.balance | number:'1.2-2' }}</span>
                    <span [class]="'badge badge-' + (acc.status === 'ACTIVE' ? 'success' : 'danger')">{{ acc.status }}</span>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Recent Transactions -->
          <div class="card animate-fade-in">
            <div class="section-header">
              <h3>Recent Transactions</h3>
              <a routerLink="/transactions" class="btn btn-ghost" style="padding:8px 16px;font-size:0.8rem;">View all</a>
            </div>
            @if (loading()) {
              @for (i of [1,2,3,4]; track i) {
                <div class="skeleton" style="height:56px;margin-bottom:10px;border-radius:10px;"></div>
              }
            } @else if (recentTx().length === 0) {
              <div class="empty-state"><p>No transactions yet.</p></div>
            } @else {
              @for (tx of recentTx(); track tx.id) {
                <div class="tx-row">
                  <div class="tx-icon" [class]="'tx-' + tx.type.toLowerCase()">
                    @if (tx.type === 'CREDIT') {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    } @else if (tx.type === 'DEBIT') {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                    } @else {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                    }
                  </div>
                  <div class="tx-info">
                    <span class="tx-desc">{{ tx.description }}</span>
                    <span class="tx-date text-muted">{{ tx.date | date:'MMM d, HH:mm' }}</span>
                  </div>
                  <span class="tx-amount" [class]="tx.type === 'CREDIT' ? 'text-success' : 'text-danger'">
                    {{ tx.type === 'CREDIT' ? '+' : '-' }}{{ tx.amount | number:'1.2-2' }}
                  </span>
                </div>
              }
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { position: relative; min-height: 100vh; }
    .page-content { max-width: 1280px; margin: 0 auto; padding: 32px 24px; position: relative; z-index: 1; }
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 32px; flex-wrap: wrap; gap: 16px;
    }
    .page-header h1 { font-size: 2rem; }
    .header-actions { display: flex; gap: 10px; }

    /* KPI */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    @media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px)  { .kpi-grid { grid-template-columns: 1fr; } }

    .kpi-card {
      background: var(--bg-card); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg); padding: 22px;
      display: flex; align-items: center; gap: 18px;
      transition: var(--transition);
    }
    .kpi-card:hover { background: var(--bg-card-hover); transform: translateY(-2px); box-shadow: var(--shadow-card); }
    .kpi-icon {
      width: 48px; height: 48px; border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .kpi-primary .kpi-icon  { background: rgba(79,142,247,0.12);  color: var(--accent-primary);  }
    .kpi-success .kpi-icon  { background: rgba(34,211,165,0.12);  color: var(--accent-success);  }
    .kpi-purple  .kpi-icon  { background: rgba(124,92,252,0.12);  color: var(--accent-secondary); }
    .kpi-warning .kpi-icon  { background: rgba(245,166,35,0.12);  color: var(--accent-warning);  }

    .kpi-body { display: flex; flex-direction: column; gap: 4px; }
    .kpi-label { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
    .kpi-value { font-size: 1.7rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .kpi-value small { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent-success); box-shadow: 0 0 6px var(--accent-success); margin-left: 6px; animation: pulse-glow 2s infinite; }

    /* Bottom grid */
    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 900px) { .bottom-grid { grid-template-columns: 1fr; } }

    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .section-header h3 { font-size: 1.05rem; }

    /* Account row */
    .account-row {
      display: flex; align-items: center; gap: 14px; padding: 14px;
      border-radius: var(--radius-md); transition: var(--transition); margin-bottom: 6px;
    }
    .account-row:hover { background: rgba(255,255,255,0.03); }
    .account-avatar {
      width: 42px; height: 42px; border-radius: 12px; font-size: 1.1rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .avatar-checking { background: rgba(79,142,247,0.15); color: var(--accent-primary); }
    .avatar-savings  { background: rgba(34,211,165,0.15); color: var(--accent-success); }
    .avatar-business { background: rgba(124,92,252,0.15); color: var(--accent-secondary); }

    .account-info { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .account-name { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .account-iban { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .account-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
    .account-balance { font-weight: 700; font-size: 0.95rem; font-family: 'JetBrains Mono', monospace; }

    /* TX row */
    .tx-row {
      display: flex; align-items: center; gap: 14px; padding: 12px;
      border-radius: var(--radius-md); transition: var(--transition); margin-bottom: 4px;
    }
    .tx-row:hover { background: rgba(255,255,255,0.03); }
    .tx-icon {
      width: 36px; height: 36px; border-radius: 10px; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .tx-credit   { background: rgba(34,211,165,0.12); color: var(--accent-success); }
    .tx-debit    { background: rgba(244,91,105,0.12);  color: var(--accent-danger); }
    .tx-transfer { background: rgba(79,142,247,0.12);  color: var(--accent-primary); }

    .tx-info { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .tx-desc { font-weight: 500; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-date { font-size: 0.75rem; }
    .tx-amount { font-weight: 700; font-size: 0.9rem; font-family: 'JetBrains Mono', monospace; white-space: nowrap; }

    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 32px; color: var(--text-muted); }
  `]
})
export class DashboardComponent implements OnInit {
  private accountSvc = inject(AccountService);
  private txSvc = inject(TransactionService);

  accounts = signal<Account[]>([]);
  recentTx  = signal<Transaction[]>([]);
  loading   = signal(true);
  totalBalance = signal(0);
  txCount   = signal(0);

  ngOnInit() {
    this.accountSvc.getAccounts(0, 10).subscribe({
      next: res => {
        const list = res.content ?? (res as any) as Account[];
        this.accounts.set(list);
        this.totalBalance.set(list.reduce((s, a) => s + (a.balance ?? 0), 0));
      },
      error: () => {},
      complete: () => this.loading.set(false)
    });

    this.txSvc.getTransactions(0, 5).subscribe({
      next: res => {
        const list = res.content ?? (res as any) as Transaction[];
        this.recentTx.set(list);
        this.txCount.set(res.page?.totalElements ?? list.length);
      },
      error: () => { this.loading.set(false); }
    });
  }
}
