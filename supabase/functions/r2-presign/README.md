# Edge Function: `r2-presign`

Issues short-lived presigned PUT URLs for direct-to-R2 media uploads. Implements the upload half of [ADR 0001](../../../docs/adr/0001-media-storage.md).

## Flow

```
client → invoke('r2-presign', { kind, filename, contentType, sizeBytes })
       ← { uploadUrl, key, expiresIn }
client → PUT uploadUrl (file body, direct to R2)
client → store `key` in the DB row (e.g. set_logs.form_video_s3_key)
```

R2 credentials live only as function secrets — they never reach the browser. The user id is taken from the verified Supabase JWT, so a caller can only write under their own prefix (`<kind>/<user-id>/<uuid><ext>`).

## Setup

1. **Create an R2 bucket** (private) and an R2 API token (Access Key ID + Secret).

2. **Set the function secrets:**
   ```bash
   supabase secrets set \
     R2_ACCOUNT_ID=<cloudflare-account-id> \
     R2_ACCESS_KEY_ID=<r2-access-key-id> \
     R2_SECRET_ACCESS_KEY=<r2-secret> \
     R2_BUCKET=<bucket-name>
   ```

3. **Deploy:**
   ```bash
   supabase functions deploy r2-presign
   ```

4. **Configure R2 bucket CORS** to allow browser PUTs from the app origin:
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:5173", "https://<your-domain>"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

## Notes

- The size/content-type policy here mirrors `src/lib/storage/policy.ts` — keep both in sync.
- This function covers **uploads** only. Reading private media back needs a companion presigned **GET** (same pattern, `method: 'GET'`) — the natural next step.
