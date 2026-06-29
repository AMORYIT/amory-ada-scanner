import fs from "node:fs/promises";
import path from "node:path";
import pa11y from "pa11y";

const configPath = path.join(process.cwd(), "config", "scan-config.json");
const reportsDir = path.join(process.cwd(), "reports");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function issuePriority(issue) {
  const type = String(issue.type || "").toLowerCase();
  const code = String(issue.code || "").toLowerCase();
  if (type === "error") return "High";
  if (code.includes("color")) return "Medium";
  if (type === "warning") return "Medium";
  return "Needs review";
}

function wcagHint(issue) {
  const code = String(issue.code || "");
  const matches = [...code.matchAll(/Principle\d\.Guideline\d_\d\.(\d_\d_\d)/g)].map(m => m[1].replaceAll("_", "."));
  if (matches.length) return [...new Set(matches)].join(", ");
  if (code.includes("NonTextContent")) return "1.1.1";
  if (code.includes("InfoAndRelationships")) return "1.3.1";
  if (code.includes("Contrast")) return "1.4.3";
  if (code.includes("Keyboard")) return "2.1.1";
  if (code.includes("BypassBlocks")) return "2.4.1";
  if (code.includes("PageTitled")) return "2.4.2";
  if (code.includes("FocusOrder")) return "2.4.3";
  if (code.includes("LinkPurpose")) return "2.4.4";
  if (code.includes("Headings")) return "2.4.6";
  if (code.includes("FocusVisible")) return "2.4.7";
  if (code.includes("LabelsOrInstructions")) return "3.3.2";
  if (code.includes("NameRoleValue")) return "4.1.2";
  return "Review WCAG mapping";
}

function remediationHint(issue) {
  const msg = `${issue.message || ""} ${issue.code || ""}`.toLowerCase();
  if (msg.includes("alt")) return "Add meaningful alt text or provide equivalent visible HTML text. For flyers or complex images, do not rely on alt text alone.";
  if (msg.includes("label")) return "Associate every form control with a visible label and programmatic accessible name.";
  if (msg.includes("contrast")) return "Adjust foreground/background colors to meet WCAG AA contrast thresholds.";
  if (msg.includes("heading")) return "Use semantic headings in logical order and avoid skipping structure.";
  if (msg.includes("landmark") || msg.includes("region")) return "Add semantic landmarks such as header, nav, main, and footer.";
  if (msg.includes("link")) return "Make link text meaningful out of context; include the document/page name in repeated links.";
  if (msg.includes("button")) return "Give every button a clear accessible name and correct role/state.";
  if (msg.includes("aria")) return "Fix ARIA roles, labels, states, or relationships so they match the visible UI.";
  return "Review the affected element, confirm manually, and remediate according to the mapped WCAG criterion.";
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchSitemapUrls(config) {
  if (!config.scan?.includeSitemap || !config.scan?.sitemapUrl) return [];
  try {
    const response = await fetch(config.scan.sitemapUrl);
    if (!response.ok) {
      console.warn(`Sitemap fetch failed: ${response.status} ${response.statusText}`);
      return [];
    }
    const text = await response.text();
    const urls = [...text.matchAll(/<loc>(.*?)<\/loc>/g)]
      .map(m => m[1].trim())
      .map(normalizeUrl)
      .filter(Boolean);

    return urls;
  } catch (error) {
    console.warn(`Sitemap fetch failed: ${error.message}`);
    return [];
  }
}

function shouldExclude(url, patterns) {
  return patterns.some(pattern => url.includes(pattern));
}

async function runLimited(items, limit, worker) {
  const results = [];
  let index = 0;
  async function next() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }
  const workers = Array.from({ length: Math.max(1, limit) }, next);
  await Promise.all(workers);
  return results;
}

async function main() {
  await fs.mkdir(reportsDir, { recursive: true });
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));

  const priorityUrls = (config.scan?.priorityUrls || []).map(normalizeUrl).filter(Boolean);
  const sitemapUrls = await fetchSitemapUrls(config);
  const allUrls = [...new Set([...priorityUrls, ...sitemapUrls])]
    .filter(url => url.startsWith(config.website))
    .filter(url => !shouldExclude(url, config.scan?.excludeUrlPatterns || []))
    .slice(0, config.scan?.maxSitemapUrls || 75);

  const startedAt = new Date().toISOString();

  console.log(`Scanning ${allUrls.length} URLs for ${config.districtName}`);
  console.log(`Standard: ${config.standard || "WCAG2AA"}`);

  const results = await runLimited(allUrls, config.scan?.concurrency || 2, async (url, i) => {
    console.log(`[${i + 1}/${allUrls.length}] ${url}`);
    try {
      const result = await pa11y(url, {
        standard: config.standard || "WCAG2AA",
        timeout: config.scan?.timeoutMs || 60000,
        wait: config.scan?.waitMs || 1000,
        chromeLaunchConfig: {
          args: ["--no-sandbox", "--disable-dev-shm-usage"]
        }
      });

      const issues = (result.issues || []).map(issue => ({
        type: issue.type,
        priority: issuePriority(issue),
        wcag: wcagHint(issue),
        code: issue.code,
        message: issue.message,
        selector: issue.selector,
        context: issue.context,
        remediation: remediationHint(issue)
      }));

      return {
        url,
        documentTitle: result.documentTitle,
        issueCount: issues.length,
        issues
      };
    } catch (error) {
      return {
        url,
        documentTitle: null,
        issueCount: 1,
        scanError: true,
        issues: [{
          type: "error",
          priority: "High",
          wcag: "Manual review",
          code: "SCAN_ERROR",
          message: error.message,
          selector: "",
          context: "",
          remediation: "Confirm the URL loads publicly and rerun the scan. If this page requires sign-in, test manually."
        }]
      };
    }
  });

  const totalIssues = results.reduce((sum, r) => sum + r.issueCount, 0);
  const highIssues = results.flatMap(r => r.issues).filter(i => i.priority === "High").length;
  const finishedAt = new Date().toISOString();

  const report = {
    districtName: config.districtName,
    website: config.website,
    standard: config.standard || "WCAG2AA",
    startedAt,
    finishedAt,
    scannedUrlCount: results.length,
    totalIssues,
    highIssues,
    results
  };

  await fs.writeFile(path.join(reportsDir, "ada-report.json"), JSON.stringify(report, null, 2), "utf8");

  const md = [
    `# ${config.report?.title || "ADA Accessibility Scan"}`,
    "",
    `**District:** ${config.districtName}`,
    `**Website:** ${config.website}`,
    `**Standard:** ${config.standard || "WCAG2AA"}`,
    `**Run completed:** ${finishedAt}`,
    `**URLs scanned:** ${results.length}`,
    `**Total automated findings:** ${totalIssues}`,
    `**High-priority findings:** ${highIssues}`,
    "",
    "## Highest-priority findings",
    ""
  ];

  for (const page of results.filter(r => r.issueCount > 0).slice(0, 25)) {
    md.push(`### ${page.url}`);
    md.push(`Findings: ${page.issueCount}`);
    for (const issue of page.issues.slice(0, config.scan?.maxIssuesPerPageInSummary || 20)) {
      md.push(`- **${issue.priority}** | WCAG: ${issue.wcag} | ${issue.message}`);
      if (issue.selector) md.push(`  - Selector: \`${issue.selector}\``);
      md.push(`  - Fix: ${issue.remediation}`);
    }
    md.push("");
  }

  md.push("## Manual verification still required");
  for (const item of config.report?.manualVerificationReminder || []) {
    md.push(`- ${item}`);
  }

  await fs.writeFile(path.join(reportsDir, "ada-summary.md"), md.join("\n"), "utf8");

  const rows = results.filter(r => r.issueCount > 0).map(page => {
    const issues = page.issues.slice(0, config.scan?.maxIssuesPerPageInSummary || 20).map(issue => `
      <li>
        <strong>${escapeHtml(issue.priority)}</strong>
        | WCAG: ${escapeHtml(issue.wcag)}
        <br>${escapeHtml(issue.message)}
        ${issue.selector ? `<br><code>${escapeHtml(issue.selector)}</code>` : ""}
        <br><em>Recommended fix:</em> ${escapeHtml(issue.remediation)}
      </li>`).join("");

    return `
      <section>
        <h2><a href="${escapeHtml(page.url)}">${escapeHtml(page.url)}</a></h2>
        <p><strong>Findings:</strong> ${page.issueCount}</p>
        <ol>${issues}</ol>
      </section>`;
  }).join("\n");

  const manualItems = (config.report?.manualVerificationReminder || [])
    .map(item => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(config.report?.title || "ADA Accessibility Scan")}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; max-width: 1100px; margin: 2rem auto; padding: 0 1rem; }
    code { background: #f3f3f3; padding: 0.1rem 0.25rem; }
    section { border-top: 1px solid #ddd; padding-top: 1rem; margin-top: 1rem; }
    .summary { background: #f7f7f7; padding: 1rem; border-radius: 0.5rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(config.report?.title || "ADA Accessibility Scan")}</h1>
  <div class="summary">
    <p><strong>District:</strong> ${escapeHtml(config.districtName)}</p>
    <p><strong>Website:</strong> ${escapeHtml(config.website)}</p>
    <p><strong>Standard:</strong> ${escapeHtml(config.standard || "WCAG2AA")}</p>
    <p><strong>Run completed:</strong> ${escapeHtml(finishedAt)}</p>
    <p><strong>URLs scanned:</strong> ${results.length}</p>
    <p><strong>Total automated findings:</strong> ${totalIssues}</p>
    <p><strong>High-priority findings:</strong> ${highIssues}</p>
  </div>

  <h2>Important limitation</h2>
  <p>Automated scans do not prove full ADA Title II compliance. Manual testing is still required.</p>

  <h2>Manual verification checklist</h2>
  <ul>${manualItems}</ul>

  <h2>Findings by page</h2>
  ${rows || "<p>No automated findings reported by this scan.</p>"}
</body>
</html>`;

  await fs.writeFile(path.join(reportsDir, "ada-summary.html"), html, "utf8");

  console.log(`Scan complete. URLs scanned: ${results.length}. Issues: ${totalIssues}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
