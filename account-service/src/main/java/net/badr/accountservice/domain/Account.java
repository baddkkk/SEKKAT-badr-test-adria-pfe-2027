package net.badr.accountservice.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "accounts")
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String customerReference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountStatus status;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    private double balance;

    protected Account() {
    }

    public Account(String customerReference, String currency, double balance) {
        this.customerReference = customerReference;
        this.status = AccountStatus.ACTIVE;
        this.currency = currency;
        this.balance = balance;
    }

    public UUID getId() {
        return id;
    }

    public String getCustomerReference() {
        return customerReference;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public String getCurrency() {
        return currency;
    }

    public double getBalance() {
        return balance;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    public void debit(BigDecimal amount) {
        this.balance = BigDecimal.valueOf(balance).subtract(amount).doubleValue();
    }

    public void credit(BigDecimal amount) {
        this.balance = BigDecimal.valueOf(balance).add(amount).doubleValue();
    }
}
