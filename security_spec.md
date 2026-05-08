# Security Specification for SESI PE Enrollments

## Data Invariants
1. **Schools & Courses**: Publicly readable, but only writeable by Admins.
2. **School Offers**: Publicly listing only active offers. Creation and deletion by Admins or assigned School Operators.
3. **Leads**: Public creation is allowed. Read access is restricted to Admins and assigned School Operators of the specific school.
4. **User Roles**: Strictly restricted. Users can read their own roles. Only Admins can modify roles.
5. **Settings**: Publicly readable (for banner info), writeable only by Admins.
6. **Lead Phones**: Used for duplicate prevention. Public creation and lookup allowed.

## The "Dirty Dozen" Payloads (Denial Expected)

1. **Identity Spoofing**: Attempt to create a lead with a different user's ID/email as owner (if ownership existed).
2. **Elevated Privilege**: Attempt to set `role: 'Admin'` in `userRoles` by a non-admin.
3. **Ghost Fields**: Attempt to add `verified: true` to a school document.
4. **Illegal Transition**: Attempt to change a lead's `schoolId` during an update.
5. **Terminal State Bypass**: Attempt to edit a lead after its status is `Enrolled` (if terminal locking is implemented).
6. **Large Document**: Attempt to send a 1MB string for a school name.
7. **Relational Orphan**: Attempt to create an offer for a non-existent school ID.
8. **PII Leak**: Attempt to list all leads as an unauthenticated user.
9. **Resource Exhaustion**: Use invalid characters in document IDs to attempt poisoning.
10. **Query Scraper**: Attempt to list `schoolOffers` without the `active == true` filter as a public user.
11. **Timestamp Spoof**: Attempt to set `createdAt` to a past date in a lead.
12. **Unauthorized Mutation**: Attempt to increment `enrolledCount` by more than 1 in an offer.

## Test Runner (Conceptual)
All the above payloads must return `PERMISSION_DENIED` at the rule level.
