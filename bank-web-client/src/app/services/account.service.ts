import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Account, AccountsPage } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private base = '/api/accounts';

  constructor(private http: HttpClient) {}

  getAccounts(page = 0, size = 10): Observable<AccountsPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<AccountsPage>(this.base, { params });
  }

  getAccount(id: number): Observable<Account> {
    return this.http.get<Account>(`${this.base}/${id}`);
  }

  createAccount(account: Partial<Account>): Observable<Account> {
    return this.http.post<Account>(this.base, account);
  }

  updateAccount(id: number, account: Partial<Account>): Observable<Account> {
    return this.http.put<Account>(`${this.base}/${id}`, account);
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
