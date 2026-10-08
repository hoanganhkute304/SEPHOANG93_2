# Security Specification for APK & EXE Hub Firestore

## 1. Data Invariants
- Each app document in `/apps/{appId}` must contain valid `id`, `name`, `platform`, `downloadUrl`, and `createdAt`.
- Valid platforms are strictly: `'windows'`, `'android'`, or `'cross'`.
- String lengths must adhere to boundaries defined in `firebase-blueprint.json` (e.g. name <= 100, description <= 2000).
- Document IDs must match the `isValidId` primitive (`^[a-zA-Z0-9_\-]+$`, size <= 128).
- Downloads counter increment must be positive.
- Anyone can read the apps collection (public download store).
- Writing and updating app items requires meeting data schema validation.

## 2. The Dirty Dozen Payloads
1. Payload with 2MB name string (Denial of Wallet attack).
2. Payload missing required `id` field.
3. Payload with invalid platform `'ios_fake'`.
4. Payload with negative downloadsCount (-999).
5. Payload with malicious script injection in downloadUrl.
6. Payload missing `createdAt`.
7. Payload injecting arbitrary unauthorized top-level fields (Shadow field injection).
8. Payload with oversized description (> 50,000 chars).
9. Update payload attempting to alter immutable `id` or `createdAt`.
10. Payload with junk characters in path appId.
11. Payload with invalid types (e.g. downloadsCount as string).
12. Unauthenticated destructive delete.
