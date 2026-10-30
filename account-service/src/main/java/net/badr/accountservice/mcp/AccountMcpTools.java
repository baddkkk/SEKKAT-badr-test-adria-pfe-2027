package net.badr.accountservice.mcp;

import net.badr.accountservice.domain.Account;
import net.badr.accountservice.domain.AccountStatus;
import net.badr.accountservice.service.AccountService;
import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.mcp.annotation.McpToolParam;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Component
public class AccountMcpTools {
    private final AccountService accountService;

    public AccountMcpTools(AccountService accountService) {
        this.accountService = accountService;
    }

    @McpTool(description = "List bank accounts")
    public List<Account> listAccounts() {
        return accountService.findAll();
    }

    @McpTool(description = "Find a bank account by its UUID")
    public Account getAccount(@McpToolParam(description = "Account UUID") UUID id) {
        return accountService.findById(id);
    }

    @McpTool(description = "Create a bank account")
    public Account createAccount(
            @McpToolParam(description = "Customer reference") String customerReference,
            @McpToolParam(description = "Account currency") String currency,
            @McpToolParam(required = false, description = "Opening balance") BigDecimal initialBalance
    ) {
        return accountService.create(customerReference, currency, initialBalance);
    }

    @McpTool(description = "Block or activate a bank account")
    public Account updateAccountStatus(
            @McpToolParam(description = "Account UUID") UUID id,
            @McpToolParam(description = "ACTIVE or BLOCKED") AccountStatus status
    ) {
        return accountService.updateStatus(id, status);
    }
}
