import { Routes } from '@angular/router';
import { DashboardComponent }    from './pages/dashboard/dashboard.component';
import { AccountsComponent }     from './pages/accounts/accounts.component';
import { TransactionsComponent } from './pages/transactions/transactions.component';
import { AssistantComponent }    from './pages/assistant/assistant.component';

export const routes: Routes = [
  { path: '',            redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',  component: DashboardComponent },
  { path: 'accounts',   component: AccountsComponent },
  { path: 'transactions', component: TransactionsComponent },
  { path: 'assistant',  component: AssistantComponent },
  { path: '**',         redirectTo: 'dashboard' }
];
