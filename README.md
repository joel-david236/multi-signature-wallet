# Multi-Signature Wallet

A Clarity smart contract implementing a multi-signature wallet that requires multiple owners to approve transactions before execution. This is ideal for team-managed funds, DAOs, or any scenario requiring shared custody of digital assets.

## Features

- **Multiple Owners**: Support for multiple wallet owners with configurable approval thresholds
- **Transaction Proposals**: Any owner can propose transactions with recipient, amount, and memo
- **Approval System**: Transactions require a minimum number of owner approvals before execution
- **Owner Management**: Add or remove owners (requires existing owner approval)
- **Threshold Management**: Configurable approval threshold that can be updated
- **Balance Management**: Deposit and withdraw STX tokens with multi-signature approval

## Contract Functions

### Owner Management

- \`add-owner(new-owner: principal)\` - Add a new owner to the wallet
- \`remove-owner(owner-to-remove: principal)\` - Remove an existing owner
- \`is-owner(address: principal)\` - Check if an address is an owner

### Threshold Management

- \`update-threshold(new-threshold: uint)\` - Update the minimum approval threshold
- \`get-approval-threshold()\` - Get current approval threshold

### Transaction Management

- \`propose-transaction(recipient: principal, amount: uint, memo: string-utf8)\` - Propose a new transaction
- \`approve-transaction(transaction-id: uint)\` - Approve a pending transaction
- \`execute-transaction(transaction-id: uint)\` - Execute a transaction with sufficient approvals
- \`get-transaction(transaction-id: uint)\` - Get transaction details

### Wallet Functions

- \`deposit(amount: uint)\` - Deposit STX to the wallet
- \`get-balance()\` - Get current wallet balance

## Usage Example

1. **Deploy the contract** with initial owner
2. **Add additional owners**:
   \`\`\`clarity
   (contract-call? .multi-sig-wallet add-owner 'SP2OWNER...)
   \`\`\`

3. **Set approval threshold**:
   \`\`\`clarity
   (contract-call? .multi-sig-wallet update-threshold u2)
   \`\`\`

4. **Deposit funds**:
   \`\`\`clarity
   (contract-call? .multi-sig-wallet deposit u1000000)
   \`\`\`

5. **Propose a transaction**:
   \`\`\`clarity
   (contract-call? .multi-sig-wallet propose-transaction 'SP3RECIPIENT... u500000 u"Payment for services")
   \`\`\`

6. **Approve the transaction** (requires multiple owners):
   \`\`\`clarity
   (contract-call? .multi-sig-wallet approve-transaction u1)
   \`\`\`

7. **Execute the transaction** once threshold is met:
   \`\`\`clarity
   (contract-call? .multi-sig-wallet execute-transaction u1)
   \`\`\`

## Security Features

- **Owner-only functions**: Critical functions restricted to wallet owners
- **Approval tracking**: Prevents double-approval from the same owner
- **Balance validation**: Ensures sufficient funds before execution
- **Execution protection**: Prevents re-execution of completed transactions

## Error Codes

- \`u100\` - Owner only operation
- \`u101\` - Not an owner
- \`u102\` - Invalid threshold
- \`u103\` - Transaction not found
- \`u104\` - Already approved
- \`u105\` - Insufficient approvals
- \`u106\` - Transaction already executed
- \`u107\` - Insufficient balance
- \`u108\` - Invalid amount

## Testing

The contract includes comprehensive tests using Vitest. Run tests with:

\`\`\`bash
npm test
\`\`\`

## Deployment

1. Ensure you have the Stacks CLI installed
2. Deploy using Clarinet or directly to the Stacks blockchain
3. Initialize with your desired owners and threshold

## License

MIT License - see LICENSE file for details.
