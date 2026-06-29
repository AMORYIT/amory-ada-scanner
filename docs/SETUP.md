# Setup Guide

## 1. Upload files to GitHub

In your `amory-ada-scanner` repository:

1. Click **Add file**.
2. Click **Upload files**.
3. Drag all files and folders from this ZIP into the upload area.
4. Click **Commit changes**.

If GitHub says a file already exists, choose to replace it.

## 2. Add email secrets

Go to:

```text
Settings → Secrets and variables → Actions → New repository secret
```

Create these:

```text
SENDGRID_API_KEY
REPORT_FROM
REPORT_TO
```

Example:

```text
REPORT_FROM=ada-reports@amoryschools.com
REPORT_TO=tdickerson@amoryschools.com
```

`REPORT_FROM` must be a sender address verified in SendGrid.

## 3. Run the scan

Go to:

```text
Actions → Weekly ADA Accessibility Scan → Run workflow
```

## 4. Find the report

After the run finishes, open the workflow run and download:

```text
ada-accessibility-reports
```

## 5. Adjust scanned pages

Edit:

```text
config/scan-config.json
```

Add or remove URLs under:

```json
"priorityUrls": []
```

## 6. Change the schedule

Edit:

```text
.github/workflows/ada-scan.yml
```

The current schedule is:

```yaml
- cron: "0 13 * * 1"
```

That means Monday at 13:00 UTC.
