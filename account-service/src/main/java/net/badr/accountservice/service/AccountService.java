package net.badr.accountservice.service;

import net.badr.accountservice.domain.Account;
import net.badr.accountservice.domain.AccountStatus;
import net.badr.accountservice.repository.AccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class AccountService {
    private final AccountRepository accountRepository;

    public AccountService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Transactional
    public Account create(String customerReference, String currency, BigDecimal initialBalance) {
        if (customerReference == null || customerReference.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer reference is required");
        }
        if (currency == null || currency.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Currency is required");
        }
        if (initialBalance != null && initialBalance.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Opening balance cannot be negative");
        }
        return accountRepository.save(new Account(
                customerReference,
                currency,
                initialBalance == null ? 0.0 : initialBalance.doubleValue()
        ));
    }

    @Transactional(readOnly = true)
    public List<Account> findAll() {
        return accountRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Account findById(UUID id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    @Transactional
    public Account updateStatus(UUID id, AccountStatus status) {
        Account account = findForUpdate(id);
        account.setStatus(status);
        return account;
    }

    @Transactional
    public Account debit(UUID id, BigDecimal amount, String currency) {
        Account account = findForUpdate(id);
        validateTransactionAccount(account, currency);
        if (BigDecimal.valueOf(account.getBalance()).compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient account balance");
        }
        account.debit(amount);
        return account;
    }

    @Transactional
    public Account credit(UUID id, BigDecimal amount, String currency) {
        Account account = findForUpdate(id);
        validateTransactionAccount(account, currency);
        account.credit(amount);
        return account;
    }

    private Account findForUpdate(UUID id) {
        return accountRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    private void validateTransactionAccount(Account account, String currency) {
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account is not active");
        }
        if (!account.getCurrency().equals(currency)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Transaction currency does not match account currency");
        }
    }
}
