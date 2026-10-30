package net.badr.transactionservice.web.graphql;

import net.badr.transactionservice.domain.Transaction;
import net.badr.transactionservice.service.TransactionService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Controller
public class TransactionGraphqlController {
    private final TransactionService transactionService;

    public TransactionGraphqlController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @QueryMapping
    public List<Transaction> transactions(@Argument UUID accountId) {
        return accountId == null ? transactionService.findAll() : transactionService.findByAccountId(accountId);
    }

    @QueryMapping
    public Transaction transaction(@Argument UUID id) {
        return transactionService.findById(id);
    }

    @MutationMapping
    public Transaction createTransaction(@Argument UUID sourceAccountId, @Argument UUID destinationAccountId,
                                         @Argument Double amount, @Argument String currency) {
        return transactionService.transfer(sourceAccountId, destinationAccountId, BigDecimal.valueOf(amount),
                currency.toUpperCase());
    }
}
