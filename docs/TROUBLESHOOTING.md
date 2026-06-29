# Troubleshooting

## The workflow does not appear

Confirm this file exists:

```text
.github/workflows/ada-scan.yml
```

Then go to the repository's **Actions** tab.

## The scan runs but email does not arrive

Check that these secrets exist:

```text
SENDGRID_API_KEY
REPORT_FROM
REPORT_TO
```

Also confirm `REPORT_FROM` is verified in SendGrid.

## The scan fails on some pages

Some pages may block automated browsers, require sign-in, redirect, or load slowly. Those URLs will appear as scan errors and should be checked manually.

## Too many pages are scanned

Edit:

```text
config/scan-config.json
```

Lower this value:

```json
"maxSitemapUrls": 75
```

## I only want priority pages

Set:

```json
"includeSitemap": false
```
