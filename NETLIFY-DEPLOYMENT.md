# Deployment target: islandtaste.netlify.app

This release publishes the original Island Taste visual design with the new **demonstration ordering system**. PayPal and real-order submission remain disabled. No real payment is collected. The website has not yet been published by this task.

## Required account configuration

1. In this cloud environment's secure settings, supply `NETLIFY_AUTH_TOKEN` for the saved requirement. Its allowed HTTPS destination is `api.netlify.com`. Review/save the environment changes and publish the environment configuration so the binding and network access can become available. Do not paste the token into chat or put it in Git. The target site is **islandtaste**, not superlative-lokum-b1e2be.
2. In the **islandtaste** site's Netlify environment variables, configure a hosted PostgreSQL connection as `DATABASE_URL` (available to **Builds and Functions**). A pooled connection URL is recommended. Alternatively, enable Netlify Database and ensure `NETLIFY_DATABASE_URL` is available to builds and functions. TLS certificate verification stays enabled. The local `.data` database must not be uploaded and cannot be used by serverless functions.
3. In Netlify's build environment only, set `STAFF_USERNAME` and a strong `STAFF_PASSWORD` of at least 12 characters. These create the first hosted staff account. Existing accounts and passwords are preserved on later builds. Remove the bootstrap password from build settings after the first successful deployment if desired. Never use the local demo-access file as a deployment asset.
4. `netlify.toml` sets the build command to `npm run build:netlify`, the publish directory to `dist`, Node 24, and the intended origin to `https://islandtaste.netlify.app`. These replace the legacy static-root deployment. Additional custom domains require adding their exact origin to the Astro allowed-domain configuration and rebuilding.

## What the deployment does

`build:netlify` first applies idempotent schema migration/seed operations to the hosted PostgreSQL database and provisions the initial account when needed. PostgreSQL transaction advisory locks serialize schema initialization and matching checkout idempotency keys across function instances. Each instance uses a small TLS-verified connection pool. If credentials or the database are missing, the build fails; existing live Netlify deploys remain in place. Runtime Netlify/Lambda deployments refuse to fall back to an ephemeral local database.

The Astro Netlify adapter generates the SSR function, static assets and routing rules. The published `dist` directory and generated functions are the deploy artifacts; the source directory, `.env` files, `.data`, test orders and local staff credentials are excluded. Do not drag the source folder into Netlify Drop. Use a connected Git build after pushing the source changes, or the Netlify CLI build/deploy workflow authenticated to the existing site. Validate the account/site identity before the production upload.

## Release verification

Before upload: `npm run check`, `npm test`, and `NETLIFY=true npm run build` verify types, domain behavior, and the function artifact. The full `npm run build:netlify` also passed against the separate TLS PostgreSQL test instance, including migrations and repeatable staff bootstrap. The direct Astro build verifies compilation only; the full `npm run build:netlify` additionally needs the real database and initial account settings.

During preparation, the local Node runtime was tested against a separate real PostgreSQL 17 instance using a locally trusted test CA and strict TLS verification. Customer E2E, staff workflow, API safety checks, concurrent idempotency and recovery after Node restart passed against that database. This does not establish connectivity to your hosted database or a live Netlify deployment. The original disk-backed local development database remains available when neither hosted connection variable is set.

After upload, check HTTPS homepage/assets, menu API, staff authentication, one clearly labeled test order, dashboard receipt and status transitions, unauthenticated admin rejection, and disabled live-payment endpoints. Confirm orders survive across function invocations. Retain the previous Netlify deploy for rollback. Do not enable real ordering or payments as part of this demonstration release.

## Current blocker

Netlify authorization and the hosted database configuration are not available to this task yet. No deployment ID or successful live-site verification has been produced. Once the secure settings are supplied, resume by verifying the Netlify account/site and database readiness, then build, publish, and verify the live release.
