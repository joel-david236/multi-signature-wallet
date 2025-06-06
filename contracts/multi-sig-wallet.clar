;; Multi-Signature Wallet Contract
;; A wallet that requires multiple owners to approve transactions before execution

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-owner (err u101))
(define-constant err-invalid-threshold (err u102))
(define-constant err-transaction-not-found (err u103))
(define-constant err-already-approved (err u104))
(define-constant err-insufficient-approvals (err u105))
(define-constant err-transaction-already-executed (err u106))
(define-constant err-insufficient-balance (err u107))
(define-constant err-invalid-amount (err u108))

;; Data Variables
(define-data-var next-transaction-id uint u1)
(define-data-var approval-threshold uint u2)

;; Data Maps
(define-map owners principal bool)
(define-map owner-count uint uint)
(define-map transactions
  uint
  {
    recipient: principal,
    amount: uint,
    memo: (string-utf8 256),
    executed: bool,
    approvals: uint,
    created-by: principal
  }
)
(define-map transaction-approvals {transaction-id: uint, owner: principal} bool)

;; Initialize contract with initial owners and threshold
(define-private (initialize-owners (initial-owners (list 10 principal)) (threshold uint))
  (begin
    (var-set approval-threshold threshold)
    (map set-owner initial-owners)
    (map-set owner-count u0 (len initial-owners))
  )
)

;; Helper function to set an owner
(define-private (set-owner (owner principal))
  (map-set owners owner true)
)

;; Initialize the contract (called once during deployment)
(begin
  (map-set owners contract-owner true)
  (map-set owner-count u0 u1)
)

;; Public Functions

;; Add a new owner (only existing owners can add)
(define-public (add-owner (new-owner principal))
  (let ((current-count (default-to u0 (map-get? owner-count u0))))
    (asserts! (is-owner tx-sender) err-not-owner)
    (asserts! (not (is-owner new-owner)) err-owner-only)
    (map-set owners new-owner true)
    (map-set owner-count u0 (+ current-count u1))
    (ok true)
  )
)

;; Remove an owner (only existing owners can remove)
(define-public (remove-owner (owner-to-remove principal))
  (let ((current-count (default-to u0 (map-get? owner-count u0))))
    (asserts! (is-owner tx-sender) err-not-owner)
    (asserts! (is-owner owner-to-remove) err-not-owner)
    (asserts! (> current-count u1) err-invalid-threshold)
    (map-delete owners owner-to-remove)
    (map-set owner-count u0 (- current-count u1))
    (ok true)
  )
)

;; Update approval threshold
(define-public (update-threshold (new-threshold uint))
  (let ((current-count (default-to u0 (map-get? owner-count u0))))
    (asserts! (is-owner tx-sender) err-not-owner)
    (asserts! (and (> new-threshold u0) (<= new-threshold current-count)) err-invalid-threshold)
    (var-set approval-threshold new-threshold)
    (ok true)
  )
)

;; Propose a new transaction
(define-public (propose-transaction (recipient principal) (amount uint) (memo (string-utf8 256)))
  (let ((transaction-id (var-get next-transaction-id)))
    (asserts! (is-owner tx-sender) err-not-owner)
    (asserts! (> amount u0) err-invalid-amount)
    (map-set transactions transaction-id {
      recipient: recipient,
      amount: amount,
      memo: memo,
      executed: false,
      approvals: u0,
      created-by: tx-sender
    })
    (var-set next-transaction-id (+ transaction-id u1))
    (ok transaction-id)
  )
)

;; Approve a transaction
(define-public (approve-transaction (transaction-id uint))
  (let (
    (transaction (unwrap! (map-get? transactions transaction-id) err-transaction-not-found))
    (already-approved (default-to false (map-get? transaction-approvals {transaction-id: transaction-id, owner: tx-sender})))
  )
    (asserts! (is-owner tx-sender) err-not-owner)
    (asserts! (not (get executed transaction)) err-transaction-already-executed)
    (asserts! (not already-approved) err-already-approved)

    (map-set transaction-approvals {transaction-id: transaction-id, owner: tx-sender} true)
    (map-set transactions transaction-id (merge transaction {approvals: (+ (get approvals transaction) u1)}))
    (ok true)
  )
)

;; Execute a transaction (if it has enough approvals)
(define-public (execute-transaction (transaction-id uint))
  (let (
    (transaction (unwrap! (map-get? transactions transaction-id) err-transaction-not-found))
    (contract-balance (stx-get-balance (as-contract tx-sender)))
  )
    (asserts! (is-owner tx-sender) err-not-owner)
    (asserts! (not (get executed transaction)) err-transaction-already-executed)
    (asserts! (>= (get approvals transaction) (var-get approval-threshold)) err-insufficient-approvals)
    (asserts! (>= contract-balance (get amount transaction)) err-insufficient-balance)

    (try! (as-contract (stx-transfer? (get amount transaction) tx-sender (get recipient transaction))))
    (map-set transactions transaction-id (merge transaction {executed: true}))
    (ok true)
  )
)

;; Deposit STX to the wallet
(define-public (deposit (amount uint))
  (stx-transfer? amount tx-sender (as-contract tx-sender))
)

;; Read-only functions

;; Check if an address is an owner
(define-read-only (is-owner (address principal))
  (default-to false (map-get? owners address))
)

;; Get transaction details
(define-read-only (get-transaction (transaction-id uint))
  (map-get? transactions transaction-id)
)

;; Get current approval threshold
(define-read-only (get-approval-threshold)
  (var-get approval-threshold)
)

;; Get owner count
(define-read-only (get-owner-count)
  (default-to u0 (map-get? owner-count u0))
)

;; Get contract balance
(define-read-only (get-balance)
  (stx-get-balance (as-contract tx-sender))
)

;; Check if owner has approved a transaction
(define-read-only (has-approved (transaction-id uint) (owner principal))
  (default-to false (map-get? transaction-approvals {transaction-id: transaction-id, owner: owner}))
)

;; Get next transaction ID
(define-read-only (get-next-transaction-id)
  (var-get next-transaction-id)
)
