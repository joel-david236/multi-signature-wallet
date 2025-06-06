import { describe, it, expect, beforeEach } from "vitest";

// Mock Clarity contract interaction
class MockClarityContract {
  constructor() {
    this.owners = new Map();
    this.transactions = new Map();
    this.transactionApprovals = new Map();
    this.approvalThreshold = 2;
    this.nextTransactionId = 1;
    this.ownerCount = 0;
    this.balance = 0;
  }

  // Helper methods
  isOwner(address) {
    return this.owners.has(address) && this.owners.get(address);
  }

  addOwner(newOwner, sender) {
    if (!this.isOwner(sender)) {
      throw new Error("err-not-owner");
    }
    if (this.isOwner(newOwner)) {
      throw new Error("err-owner-only");
    }
    this.owners.set(newOwner, true);
    this.ownerCount++;
    return { success: true };
  }

  removeOwner(ownerToRemove, sender) {
    if (!this.isOwner(sender)) {
      throw new Error("err-not-owner");
    }
    if (!this.isOwner(ownerToRemove)) {
      throw new Error("err-not-owner");
    }
    if (this.ownerCount <= 1) {
      throw new Error("err-invalid-threshold");
    }
    this.owners.delete(ownerToRemove);
    this.ownerCount--;
    return { success: true };
  }

  updateThreshold(newThreshold, sender) {
    if (!this.isOwner(sender)) {
      throw new Error("err-not-owner");
    }
    if (newThreshold <= 0 || newThreshold > this.ownerCount) {
      throw new Error("err-invalid-threshold");
    }
    this.approvalThreshold = newThreshold;
    return { success: true };
  }

  proposeTransaction(recipient, amount, memo, sender) {
    if (!this.isOwner(sender)) {
      throw new Error("err-not-owner");
    }
    if (amount <= 0) {
      throw new Error("err-invalid-amount");
    }

    const transactionId = this.nextTransactionId;
    this.transactions.set(transactionId, {
      recipient,
      amount,
      memo,
      executed: false,
      approvals: 0,
      createdBy: sender,
    });
    this.nextTransactionId++;
    return { transactionId };
  }

  approveTransaction(transactionId, sender) {
    if (!this.isOwner(sender)) {
      throw new Error("err-not-owner");
    }

    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error("err-transaction-not-found");
    }
    if (transaction.executed) {
      throw new Error("err-transaction-already-executed");
    }

    const approvalKey = `${transactionId}-${sender}`;
    if (this.transactionApprovals.has(approvalKey)) {
      throw new Error("err-already-approved");
    }

    this.transactionApprovals.set(approvalKey, true);
    transaction.approvals++;
    return { success: true };
  }

  executeTransaction(transactionId, sender) {
    if (!this.isOwner(sender)) {
      throw new Error("err-not-owner");
    }

    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error("err-transaction-not-found");
    }
    if (transaction.executed) {
      throw new Error("err-transaction-already-executed");
    }
    if (transaction.approvals < this.approvalThreshold) {
      throw new Error("err-insufficient-approvals");
    }
    if (this.balance < transaction.amount) {
      throw new Error("err-insufficient-balance");
    }

    transaction.executed = true;
    this.balance -= transaction.amount;
    return { success: true };
  }

  deposit(amount) {
    this.balance += amount;
    return { success: true };
  }

  getTransaction(transactionId) {
    return this.transactions.get(transactionId) || null;
  }

  getApprovalThreshold() {
    return this.approvalThreshold;
  }

  getOwnerCount() {
    return this.ownerCount;
  }

  getBalance() {
    return this.balance;
  }

  hasApproved(transactionId, owner) {
    const approvalKey = `${transactionId}-${owner}`;
    return this.transactionApprovals.has(approvalKey);
  }
}

describe("Multi-Signature Wallet", () => {
  let contract;
  const owner1 = "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX975CN0QKK";
  const owner2 = "SP2JXKMSH007NPYAQHKJPQMAQYAD90NQGTVJVQ02B";
  const owner3 = "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9";
  const recipient = "SPBMRFRPPGCDE3F384WCJPK8PQJGZ8K9QKK7F59X";

  beforeEach(() => {
    contract = new MockClarityContract();
    // Initialize with owner1 as the initial owner
    contract.owners.set(owner1, true);
    contract.ownerCount = 1;
  });

  describe("Owner Management", () => {
    it("should allow existing owner to add new owner", () => {
      const result = contract.addOwner(owner2, owner1);
      expect(result.success).toBe(true);
      expect(contract.isOwner(owner2)).toBe(true);
      expect(contract.getOwnerCount()).toBe(2);
    });

    it("should not allow non-owner to add new owner", () => {
      expect(() => {
        contract.addOwner(owner2, owner3);
      }).toThrow("err-not-owner");
    });

    it("should not allow adding existing owner", () => {
      expect(() => {
        contract.addOwner(owner1, owner1);
      }).toThrow("err-owner-only");
    });

    it("should allow removing owner", () => {
      contract.addOwner(owner2, owner1);
      const result = contract.removeOwner(owner2, owner1);
      expect(result.success).toBe(true);
      expect(contract.isOwner(owner2)).toBe(false);
      expect(contract.getOwnerCount()).toBe(1);
    });

    it("should not allow removing last owner", () => {
      expect(() => {
        contract.removeOwner(owner1, owner1);
      }).toThrow("err-invalid-threshold");
    });
  });

  describe("Threshold Management", () => {
    beforeEach(() => {
      contract.addOwner(owner2, owner1);
      contract.addOwner(owner3, owner1);
    });

    it("should allow updating threshold", () => {
      const result = contract.updateThreshold(3, owner1);
      expect(result.success).toBe(true);
      expect(contract.getApprovalThreshold()).toBe(3);
    });

    it("should not allow threshold greater than owner count", () => {
      expect(() => {
        contract.updateThreshold(5, owner1);
      }).toThrow("err-invalid-threshold");
    });

    it("should not allow zero threshold", () => {
      expect(() => {
        contract.updateThreshold(0, owner1);
      }).toThrow("err-invalid-threshold");
    });
  });

  describe("Transaction Management", () => {
    beforeEach(() => {
      contract.addOwner(owner2, owner1);
      contract.deposit(1000);
    });

    it("should allow owner to propose transaction", () => {
      const result = contract.proposeTransaction(
        recipient,
        100,
        "Test payment",
        owner1,
      );
      expect(result.transactionId).toBe(1);

      const transaction = contract.getTransaction(1);
      expect(transaction.recipient).toBe(recipient);
      expect(transaction.amount).toBe(100);
      expect(transaction.memo).toBe("Test payment");
      expect(transaction.executed).toBe(false);
      expect(transaction.approvals).toBe(0);
    });

    it("should not allow non-owner to propose transaction", () => {
      expect(() => {
        contract.proposeTransaction(recipient, 100, "Test payment", owner3);
      }).toThrow("err-not-owner");
    });

    it("should not allow zero amount transaction", () => {
      expect(() => {
        contract.proposeTransaction(recipient, 0, "Test payment", owner1);
      }).toThrow("err-invalid-amount");
    });

    it("should allow owner to approve transaction", () => {
      const { transactionId } = contract.proposeTransaction(
        recipient,
        100,
        "Test payment",
        owner1,
      );
      const result = contract.approveTransaction(transactionId, owner1);
      expect(result.success).toBe(true);

      const transaction = contract.getTransaction(transactionId);
      expect(transaction.approvals).toBe(1);
      expect(contract.hasApproved(transactionId, owner1)).toBe(true);
    });

    it("should not allow double approval from same owner", () => {
      const { transactionId } = contract.proposeTransaction(
        recipient,
        100,
        "Test payment",
        owner1,
      );
      contract.approveTransaction(transactionId, owner1);

      expect(() => {
        contract.approveTransaction(transactionId, owner1);
      }).toThrow("err-already-approved");
    });

    it("should execute transaction with sufficient approvals", () => {
      const { transactionId } = contract.proposeTransaction(
        recipient,
        100,
        "Test payment",
        owner1,
      );
      contract.approveTransaction(transactionId, owner1);
      contract.approveTransaction(transactionId, owner2);

      const result = contract.executeTransaction(transactionId, owner1);
      expect(result.success).toBe(true);

      const transaction = contract.getTransaction(transactionId);
      expect(transaction.executed).toBe(true);
      expect(contract.getBalance()).toBe(900);
    });

    it("should not execute transaction with insufficient approvals", () => {
      const { transactionId } = contract.proposeTransaction(
        recipient,
        100,
        "Test payment",
        owner1,
      );
      contract.approveTransaction(transactionId, owner1);

      expect(() => {
        contract.executeTransaction(transactionId, owner1);
      }).toThrow("err-insufficient-approvals");
    });

    it("should not execute transaction with insufficient balance", () => {
      const { transactionId } = contract.proposeTransaction(
        recipient,
        2000,
        "Large payment",
        owner1,
      );
      contract.approveTransaction(transactionId, owner1);
      contract.approveTransaction(transactionId, owner2);

      expect(() => {
        contract.executeTransaction(transactionId, owner1);
      }).toThrow("err-insufficient-balance");
    });
  });

  describe("Deposit Functionality", () => {
    it("should allow deposits", () => {
      const result = contract.deposit(500);
      expect(result.success).toBe(true);
      expect(contract.getBalance()).toBe(500);
    });
  });
});
