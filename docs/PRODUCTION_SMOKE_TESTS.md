# Production Smoke Tests

Run these after CI and deployment are green:

1. Register/login and refresh session.
2. View services and service details.
3. Create a small order with sufficient balance.
4. Confirm exactly one wallet debit and one order.
5. Confirm queue/provider submission produces at most one provider order ID.
6. Confirm provider status sync updates the order correctly.
7. Confirm failed/partial order refund cannot be applied twice.
8. Create a deposit request and verify admin approval credits exactly once.
9. Create a withdrawal and verify funds are reserved/deducted immediately.
10. Reject withdrawal and verify exactly one reversal.
11. Confirm normal users cannot execute admin RPCs successfully.
12. Confirm normal users cannot directly write financial tables.
13. Verify Vercel production build and browser console.
