package net.badr.transactionservice.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import net.badr.transactionservice.client.AccountClient;
import net.badr.transactionservice.domain.Transaction;
import net.badr.transactionservice.domain.TransactionStatus;
import net.badr.transactionservice.repository.TransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class TransactionService {
    private final TransactionRepository transactionRepository;
    private final AccountClient accountClient;
    private final BigDecimal maximumAmount;

    public TransactionService(TransactionRepository transactionRepository, AccountClient accountClient,
                              @Value("${bank.transaction.max-amount:1000}") BigDecimal maximumAmount) {
        this.transactionRepository = transactionRepository;
        this.accountClient = accountClient;
        this.maximumAmount = maximumAmount;
    }

    @Transactional(readOnly = true)
    public List<Transaction> findAll() {
        return transactionRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Transaction findById(UUID id) {
        return transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
    }

    @Transactional(readOnly = true)
    public List<Transaction> findByAccountId(UUID accountId) {
        return transactionRepository.findBySourceAccountIdOrDestinationAccountIdOrderByCreatedAtDesc(accountId, accountId);
    }

    @CircuitBreaker(name = "accountService", fallbackMethod = "transferUnavailable")
    public Transaction transfer(UUID sourceAccountId, UUID destinationAccountId, BigDecimal amount, String currency) {
        validateTransfer(sourceAccountId, destinationAccountId, amount, currency);
        AccountClient.BalanceAdjustmentRequest adjustment = new AccountClient.BalanceAdjustmentRequest(amount, currency);
        accountClient.debit(sourceAccountId, adjustment);
        try {
            accountClient.credit(destinationAccountId, adjustment);
        } catch (RuntimeException creditFailure) {
            compensateDebit(sourceAccountId, adjustment, creditFailure);
            transactionRepository.save(new Transaction(sourceAccountId, destinationAccountId, amount, currency,
                    TransactionStatus.FAILED));
            throw creditFailure;
        }
        return transactionRepository.save(new Transaction(sourceAccountId, destinationAccountId, amount, currency,
                TransactionStatus.COMPLETED));
    }

    public Transaction transferUnavailable(UUID sourceAccountId, UUID destinationAccountId, BigDecimal amount,
                                           String currency, Throwable cause) {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Account service is temporarily unavailable; no transfer was completed", cause);
    }

    private void compensateDebit(UUID sourceAccountId, AccountClient.BalanceAdjustmentRequest adjustment,
                                 RuntimeException creditFailure) {
        try {
            accountClient.credit(sourceAccountId, adjustment);
        } catch (RuntimeException compensationFailure) {
            creditFailure.addSuppressed(compensationFailure);
        }
    }

    private void validateTransfer(UUID sourceAccountId, UUID destinationAccountId, BigDecimal amount, String currency) {
        if (sourceAccountId == null || destinationAccountId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Both account IDs are required");
        }
        if (sourceAccountId.equals(destinationAccountId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source and destination accounts must differ");
        }
        if (amount == null || amount.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transfer amount must be positive");
        }
        if (amount.compareTo(maximumAmount) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Transfer amount cannot exceed " + maximumAmount);
        }
        if (currency == null || !currency.matches("[A-Za-z]{3}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Currency must be a 3-letter code");
        }
    }
}
