# Amory School District ADA Accessibility Scanner

This repository runs a scheduled automated accessibility scan of the Amory School District website.

It is designed for **ADA Title II / WCAG 2.1 Level AA monitoring**. Automated scans do not prove full legal compliance, but they are useful for finding many common issues and documenting ongoing monitoring.

## What it does

- Runs manually or every Monday morning.
- Scans priority district pages.
- Optionally discovers more pages from the sitemap.
- Tests against WCAG 2.1 AA using Pa11y.
- Generates:
  - `reports/ada-report.json`
  - `reports/ada-summary.html`
  - `reports/ada-summary.md`
- Uploads reports as GitHub Actions artifacts.
- Emails a summary and attaches the HTML/JSON reports when email secrets are configured.

## Quick setup

1. Upload this project to your GitHub repository.
2. Go to **Settings → Secrets and variables → Actions**.
3. Add these repository secrets:
   - `SENDGRID_API_KEY`
   - `REPORT_FROM`
   - `REPORT_TO`
4. Go to **Actions → Weekly ADA Accessibility Scan → Run workflow**.
5. Download the report artifact or check your email.

## Required email secrets

| Secret | Example | Notes |
|---|---|---|
| `SENDGRID_API_KEY` | `SG.xxxxx` | Create in SendGrid. |
| `REPORT_FROM` | `ada-reports@amoryschools.com` | Must be verified in SendGrid. |
| `REPORT_TO` | `tdickerson@amoryschools.com` | Can be one address or comma-separated addresses. |

If email is not configured, the scan still runs and uploads the reports as artifacts.

## Configuration

Edit:

```text
config/scan-config.json
```

Common changes:
- add more URLs
- change email subject text
- change max sitemap URLs
- exclude URLs from scanning
- change schedule in `.github/workflows/ada-scan.yml`

## Manual verification still required

Automated tools cannot fully evaluate:

- keyboard navigation
- screen-reader usability
- meaningful alternative text
- PDF tagging and reading order
- video captions and transcripts
- form error handling
- third-party embedded tools
- whether linked documents are accessible

Use this scanner as an ongoing monitoring tool, not as the only ADA compliance activity.
