import fs from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

const reportsDir = path.join(process.cwd(), "reports");
const configPath = path.join(process.cwd(), "config", "scan-config.json");

async function main() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const reportTo = process.env.REPORT_TO;

  if (!gmailUser || !gmailAppPassword || !reportTo) {
    console.log("Gmail secrets are not fully configured. Skipping email.");
    return;
  }

  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const report = JSON.parse(
    await fs.readFile(path.join(reportsDir, "ada-report.json"), "utf8")
  );

  const reportUrl = "https://amoryit.github.io/amory-ada-scanner/";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword
    }
  });

  await transporter.sendMail({
    from: gmailUser,
    to: reportTo
      .split(",")
      .map(email => email.trim())
      .filter(Boolean),
    subject: `Weekly ADA Scan - ${config.districtName} - ${report.totalIssues} findings`,
    text: `
Weekly ADA / WCAG 2.1 AA Accessibility Scan

District: ${report.districtName}
Website: ${report.website}
Standard: ${report.standard}
Run completed: ${report.finishedAt}

URLs scanned: ${report.scannedUrlCount}
Total automated findings: ${report.totalIssues}
High-priority findings: ${report.highIssues}

View the report:
${reportUrl}

Important:
Automated scans do not prove full ADA Title II compliance. Manual verification is still required for keyboard navigation, screen readers, PDFs, forms, captions, third-party tools, and meaningful alt text.
`
  });

  console.log(`Gmail report email sent with link: ${reportUrl}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
