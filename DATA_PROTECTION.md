# Project data protection

## What is protected

The managed Replit PostgreSQL database already uses AES-256 encryption at rest and TLS for data in transit. This protects the database storage layer and Replit-managed backups.

This project also provides application-controlled encryption for database dumps and exported files using `APP_ENCRYPTION_KEY`. The encryption uses AES-256-GCM with a fresh random nonce for every file and authenticated integrity checking.

## Required secret

Configure `APP_ENCRYPTION_KEY` in the environment where backups or exports are created. Keep an offline copy in a secure password manager or key vault. If it is lost, encrypted files cannot be decrypted.

Do not print the key, commit it to Git, put it in a ZIP archive, or include it in an export.

## Encrypted database backup

Install PostgreSQL client tools so `pg_dump` is available, then run:

```bash
npm run backup:encrypted
```

The default output is a mode-600 file in `backups/`. You can choose the output path:

```bash
npm run backup:encrypted -- /secure/backups/project.sql.enc
```

The database connection string is supplied to `pg_dump` by the process and is never written into the backup filename or application logs.

## Encrypting an export file

```bash
npm run encrypt:file -- export.json export.json.enc
```

Decrypt only when needed:

```bash
npm run decrypt:file -- export.json.enc export.json
```

Delete the plaintext export after verification:

```bash
shred -u export.json
```

On filesystems where `shred` is not supported, securely delete the plaintext using the operating system’s approved secure-erasure tooling.

## Important limitation

The live website and Telegram bot must be able to decrypt data they display, deliver, or process. Therefore, this is protection against unauthorized database dumps, backup access, and lost export files—not against the running application, an administrator who is authorized to see data, or Telegram recipients. Encrypting every live database column would also remove the lookups and relationships the application relies on and requires a planned schema migration.