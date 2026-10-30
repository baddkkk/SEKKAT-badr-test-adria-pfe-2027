package net.badr.transactionservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.math.BigDecimal;
import java.util.UUID;

@FeignClient(name = "account-service", url = "${account-service.url}")
public interface AccountClient {
    @PostMapping("/api/accounts/{id}/debit")
    AccountResponse debit(@PathVariable UUID id, @RequestBody BalanceAdjustmentRequest request);

    @PostMapping("/api/accounts/{id}/credit")
    AccountResponse credit(@PathVariable UUID id, @RequestBody BalanceAdjustmentRequest request);

    record BalanceAdjustmentRequest(BigDecimal amount, String currency) { }
    record AccountResponse(UUID id, String currency, double balance) { }
}
