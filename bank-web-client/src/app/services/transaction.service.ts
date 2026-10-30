import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transaction } from '../models/models';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private base = '/api/transactions';

  constructor(private http: HttpClient) {}

  getTransactions(page = 0, size = 20): Observable<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<any>(this.base, { params });
  }

  getAccountTransactions(accountId: number, page = 0, size = 20): Observable<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<any>(`${this.base}/account/${accountId}`, { params });
  }

  getTransaction(id: number): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.base}/${id}`);
  }

  createTransaction(tx: Partial<Transaction>): Observable<Transaction> {
    return this.http.post<Transaction>(this.base, tx);
  }
}
