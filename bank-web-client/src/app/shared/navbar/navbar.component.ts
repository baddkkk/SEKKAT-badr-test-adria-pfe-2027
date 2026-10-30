import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="nav-inner">
        <a routerLink="/" class="nav-brand">
          <div class="brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span class="brand-name">BankOS <span class="brand-tag">AI</span></span>
        </a>

        <div class="nav-links" [class.open]="menuOpen()">
          <a routerLink="/dashboard" routerLinkActive="active" (click)="menuOpen.set(false)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a routerLink="/accounts" routerLinkActive="active" (click)="menuOpen.set(false)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            Accounts
          </a>
          <a routerLink="/transactions" routerLinkActive="active" (click)="menuOpen.set(false)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
            Transactions
          </a>
          <a routerLink="/assistant" routerLinkActive="active" (click)="menuOpen.set(false)" class="ai-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            AI Assistant
            <span class="pulse-dot"></span>
          </a>
        </div>

        <button class="hamburger btn-icon" (click)="menuOpen.update(v => !v)" aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      position: sticky; top: 0; z-index: 100;
      background: var(--bg-glass);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-subtle);
    }
    .nav-inner {
      max-width: 1280px; margin: 0 auto; padding: 0 24px;
      height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 24px;
    }
    .nav-brand {
      display: flex; align-items: center; gap: 10px; text-decoration: none;
    }
    .brand-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: var(--accent-gradient);
      display: flex; align-items: center; justify-content: center;
      color: #fff; box-shadow: var(--shadow-button);
      flex-shrink: 0;
    }
    .brand-name {
      font-size: 1.1rem; font-weight: 800; color: var(--text-primary);
      letter-spacing: -0.03em;
    }
    .brand-tag {
      background: var(--accent-gradient); -webkit-background-clip: text;
      background-clip: text; -webkit-text-fill-color: transparent;
    }
    .nav-links {
      display: flex; align-items: center; gap: 4px; flex: 1; justify-content: center;
    }
    .nav-links a {
      display: flex; align-items: center; gap: 7px; padding: 8px 16px;
      border-radius: var(--radius-md); text-decoration: none;
      font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);
      transition: var(--transition); position: relative;
    }
    .nav-links a:hover { color: var(--text-primary); background: var(--bg-card); }
    .nav-links a.active { color: var(--accent-primary); background: rgba(79,142,247,0.1); }
    .ai-link { position: relative; }
    .pulse-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--accent-success);
      box-shadow: 0 0 6px var(--accent-success);
      animation: pulse-glow 2s infinite;
      margin-left: 2px;
    }
    .hamburger { display: none; }
    @media (max-width: 768px) {
      .hamburger { display: flex; }
      .nav-links {
        position: fixed; top: 64px; left: 0; right: 0;
        flex-direction: column; padding: 16px; gap: 8px;
        background: var(--bg-secondary); border-bottom: 1px solid var(--border-subtle);
        display: none; align-items: flex-start;
      }
      .nav-links.open { display: flex; }
      .nav-links a { width: 100%; }
    }
  `]
})
export class NavbarComponent {
  menuOpen = signal(false);
}
