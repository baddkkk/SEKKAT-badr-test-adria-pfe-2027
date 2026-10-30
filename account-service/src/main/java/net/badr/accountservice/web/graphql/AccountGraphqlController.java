package net.badr.accountservice.web.graphql;

import net.badr.accountservice.domain.Account;
import net.badr.accountservice.domain.AccountStatus;
import net.badr.accountservice.service.AccountService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Controller
public class AccountGraphqlController {
    private final AccountService accountService;

    public AccountGraphqlController(AccountService accountService) {
        this.accountService = accountService;
    }

    @QueryMapping
    public List<Account> accounts() {
        return accountService.findAll();
    }

    @QueryMapping
    public Account account(@Argument UUID id) {
        return accountService.findById(id);
    }

    @MutationMapping
    public Account createAccount(
            @Argument String customerReference,
            @Argument String currency,
            @Argument Double initialBalance
    ) {
        return accountService.create(
                customerReference,
                currency,
                initialBalance == null ? null : BigDecimal.valueOf(initialBalance)
        );
    }

    @MutationMapping
    public Account updateAccountStatus(@Argument UUID id, @Argument AccountStatus status) {
        return accountService.updateStatus(id, status);
    }
}
