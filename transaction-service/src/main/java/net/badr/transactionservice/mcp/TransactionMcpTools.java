package net.badr.transactionservice.mcp;

import net.badr.transactionservice.domain.Transaction;
import net.badr.transactionservice.service.TransactionService;
import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.mcp.annotation.McpToolParam;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Component
public class TransactionMcpTools {
    private final TransactionService transactionService;

    public TransactionMcpTools(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @McpTool(description = "List all bank transactions")
    public List<Transaction> listTransactions() {
        return transactionService.findAll();
    }

    @McpTool(description = "List transactions for a bank account")
    public List<Transaction> listTransactionsForAccount(@McpToolParam(description = "Account UUID") UUID accountId) {
        return transactionService.findByAccountId(accountId);
    }

    @McpTool(description = "Transfer money between two active accounts in the same currency")
    public Transaction transfer(
            @McpToolParam(description = "Source account UUID") UUID sourceAccountId,
            @McpToolParam(description = "Destination account UUID") UUID destinationAccountId,
            @McpToolParam(description = "Positive transfer amount") BigDecimal amount,
            @McpToolParam(description = "Three-letter currency code") String currency
    ) {
        return transactionService.transfer(sourceAccountId, destinationAccountId, amount, currency.toUpperCase());
    }
}
