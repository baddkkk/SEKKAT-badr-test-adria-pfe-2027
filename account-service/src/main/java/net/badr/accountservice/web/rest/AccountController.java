package net.badr.accountservice.web.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import net.badr.accountservice.domain.Account;
import net.badr.accountservice.domain.AccountStatus;
import net.badr.accountservice.service.AccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {
    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    public ResponseEntity<AccountResponse> create(@Valid @RequestBody CreateAccountRequest request) {
        Account account = accountService.create(
                request.customerReference(),
                request.currency(),
                request.initialBalance()
        );
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(account.getId())
                .toUri();
        return ResponseEntity.created(location).body(AccountResponse.from(account));
    }

    @GetMapping
    public List<AccountResponse> findAll() {
        return accountService.findAll().stream().map(AccountResponse::from).toList();
    }

    @GetMapping("/{id}")
    public AccountResponse findById(@PathVariable UUID id) {
        return AccountResponse.from(accountService.findById(id));
    }

    @PatchMapping("/{id}/status")
    public AccountResponse updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAccountStatusRequest request
    ) {
        return AccountResponse.from(accountService.updateStatus(id, request.status()));
    }

    @PostMapping("/{id}/debit")
    public AccountResponse debit(@PathVariable UUID id, @Valid @RequestBody BalanceAdjustmentRequest request) {
        return AccountResponse.from(accountService.debit(id, request.amount(), request.currency()));
    }

    @PostMapping("/{id}/credit")
    public AccountResponse credit(@PathVariable UUID id, @Valid @RequestBody BalanceAdjustmentRequest request) {
        return AccountResponse.from(accountService.credit(id, request.amount(), request.currency()));
    }

    public record CreateAccountRequest(
            @NotBlank String customerReference,
            @NotBlank String currency,
            @DecimalMin("0.00") @Digits(integer = 17, fraction = 2) BigDecimal initialBalance
    ) {
    }

    public record UpdateAccountStatusRequest(@NotNull AccountStatus status) {
    }

    public record BalanceAdjustmentRequest(
            @NotNull @DecimalMin(value = "0.00", inclusive = false) @Digits(integer = 17, fraction = 2)
            BigDecimal amount,
            @NotBlank String currency
    ) {
    }

    public record AccountResponse(
            UUID id,
            String customerReference,
            AccountStatus status,
            String currency,
            double balance
    ) {
        private static AccountResponse from(Account account) {
            return new AccountResponse(
                    account.getId(),
                    account.getCustomerReference(),
                    account.getStatus(),
                    account.getCurrency(),
                    account.getBalance()
            );
        }
    }
}
