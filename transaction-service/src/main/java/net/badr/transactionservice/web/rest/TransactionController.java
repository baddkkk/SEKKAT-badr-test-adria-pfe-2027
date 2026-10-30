package net.badr.transactionservice.web.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import net.badr.transactionservice.domain.Transaction;
import net.badr.transactionservice.domain.TransactionStatus;
import net.badr.transactionservice.service.TransactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> transfer(@Valid @RequestBody CreateTransactionRequest request) {
        Transaction transaction = transactionService.transfer(request.sourceAccountId(), request.destinationAccountId(),
                request.amount(), request.currency().toUpperCase());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}")
                .buildAndExpand(transaction.getId()).toUri();
        return ResponseEntity.created(location).body(TransactionResponse.from(transaction));
    }

    @GetMapping
    public List<TransactionResponse> findAll(@RequestParam(required = false) UUID accountId) {
        List<Transaction> transactions = accountId == null ? transactionService.findAll()
                : transactionService.findByAccountId(accountId);
        return transactions.stream().map(TransactionResponse::from).toList();
    }

    @GetMapping("/{id}")
    public TransactionResponse findById(@PathVariable UUID id) {
        return TransactionResponse.from(transactionService.findById(id));
    }

    public record CreateTransactionRequest(
            @NotNull UUID sourceAccountId,
            @NotNull UUID destinationAccountId,
            @NotNull @DecimalMin(value = "0.00", inclusive = false) @Digits(integer = 17, fraction = 2) BigDecimal amount,
            @NotBlank String currency
    ) { }

    public record TransactionResponse(UUID id, UUID sourceAccountId, UUID destinationAccountId, BigDecimal amount,
                                      String currency, Instant createdAt, TransactionStatus status) {
        public static TransactionResponse from(Transaction transaction) {
            return new TransactionResponse(transaction.getId(), transaction.getSourceAccountId(),
                    transaction.getDestinationAccountId(), transaction.getAmount(), transaction.getCurrency(),
                    transaction.getCreatedAt(), transaction.getStatus());
        }
    }
}
