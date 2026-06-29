import fs from "node:fs/promises";
import path from "node:path";
import sgMail from "@sendgrid/mail";

const reportsDir = path.join(process.cwd(), "reports");
const configPath = path.join(process.cwd(), "config", "scan-config.json");

async function fileToAttachment(filePath, filename, type) {
  const content = await fs.readFile(filePath);
  return {
    content: content.toString("base64"),
    filename,
    type,
    disposition: "attachment"
  };
}

async function main() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.REPORT_FROM;
  const to = process.env.REPORT_TO;

  if (!apiKey || !from || !to) {
    console.log("Email secrets are not fully configured. Skipping email.");
    return;
  }

  sgMail.setApiKey(apiKey);

  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const report = JSON.parse(await fs.readFile(path.join(reportsDir, "ada-report.json"), "utf8"));

  const subject = `${config.email?.subjectPrefix || "Weekly ADA Scan"} - ${config.districtName} - ${report.totalIssues} findings`;

  const text = `
${config.report?.title || "Weekly ADA / WCAG 2.1 AA Accessibility Scan"}

District: ${report.districtName}
Website: ${report.website}
Standard: ${report.standard}
Run completed: ${report.finishedAt}

URLs scanned: ${report.scannedUrlCount}
Total automated findings: ${report.totalIssues}
High-priority findings: ${report.highIssues}

Important:
Automated scans do not prove full ADA Title II compliance. Manual verification is still required for keyboard navigation, screen-reader behavior, PDFs, forms, captions, meaningful alt text, and third-party embedded tools.

The detailed reports are attached.
`;

  const attachments = [];

  if (config.email?.attachJson !== false) {
    attachments.push(await fileToAttachment(
      path.join(reportsDir, "ada-report.json"),
      "ada-report.json",
      "application/json"
    ));
  }

  if (config.email?.attachHtml !== false) {
    attachments.push(await fileToAttachment(
      path.join(reportsDir, "ada-summary.html"),
      "ada-summary.html",
      "text/html"
    ));
  }

  await sgMail.send({
    to: to.split(",").map(v => v.trim()).filter(Boolean),
    from,
    subject,
    text,
    attachments
  });

  console.log("Email sent.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
