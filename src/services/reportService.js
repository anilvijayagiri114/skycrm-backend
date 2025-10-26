import pdf from "html-pdf-node";

export async function generateManagerReport(managerData, teamsData, fromDate, toDate) {
  // ===== 1. Compute stats =====
  let totalLeads = 0;
  const totalStatusCount = {};

  teamsData.forEach((team) => {
    totalLeads += team.leadsAssigned?.length || 0;
    team.leadsAssigned?.forEach((lead) => {
      const name = lead.status?.name || lead.status || "Unknown";
      totalStatusCount[name] = (totalStatusCount[name] || 0) + 1;
    });
  });

  const overallProgress = (
    ((totalStatusCount["Enrolled"] || 0) / (totalLeads || 1)) *
    100
  ).toFixed(2);

  // ===== 2. Status badges =====
  const statusBadgesHTML = Object.entries(totalStatusCount)
    .map(([status, count]) => `<div class="badge">${status}: ${count}</div>`)
    .join("");

  // ===== 3. Stats summary =====
  const statsHTML = `
    <div class="section">
      <h2 class="section-heading">Overall Team Statistics</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <p class="stat-title">Total Teams</p>
          <p class="stat-value">${teamsData.length}</p>
        </div>
        <div class="stat-card">
          <p class="stat-title">Total Leads</p>
          <p class="stat-value">${totalLeads}</p>
        </div>
        <div class="stat-card">
          <p class="stat-title">Overall Progress</p>
          <p class="stat-value">${overallProgress}%</p>
        </div>
      </div>
      <div class="status-breakdown">
        <h3>Status Breakdown</h3>
        <div class="status-grid">${statusBadgesHTML}</div>
      </div>
    </div>
  `;

  // ===== 4. Teams section =====
  const teamsHTML = `
    <div class="section">
      <h2 class="section-heading">Individual Team Statistics</h2>
      ${teamsData
        .map((team) => {
          const statusCount = {};
          team.leadsAssigned?.forEach((lead) => {
            const name = lead.status?.name || lead.status || "Unknown";
            statusCount[name] = (statusCount[name] || 0) + 1;
          });

          const teamProgress = (
            ((statusCount["Enrolled"] || 0) / (team.leadsAssigned?.length || 1)) *
            100
          ).toFixed(2);

          const teamStatusHTML = Object.entries(statusCount)
            .map(([status, count]) => `<div class="badge">${status}: ${count}</div>`)
            .join("");

          return `
            <div class="team-card">
              <h3>${team.name}</h3>
              <div class="team-details">
                <p><strong>Members:</strong> ${team.members?.length || 0}</p>
                <p><strong>Leads Assigned:</strong> ${team.leadsAssigned?.length || 0}</p>
                <p><strong>Progress:</strong> ${teamProgress}%</p>
              </div>
              <div class="team-status">
                <h4>Status Breakdown</h4>
                <div class="status-grid">${teamStatusHTML}</div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  // ===== Format Dates =====
  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formattedFrom = fromDate ? formatDate(fromDate) : "N/A";
  const formattedTo = toDate ? formatDate(toDate) : "N/A";
  const generatedOn = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // ===== 5. Full HTML =====
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Manager Report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; background: #f8fafc; margin:0; padding:0; color:#1f2937; display:flex; flex-direction:column; min-height:100vh; }
  main { flex:1; padding:30px; }
  h1 { text-align:center; color:#4338ca; font-size:24px; margin-bottom:6px; }
  p { margin:4px 0; font-size:13px; color:#374151; }
  .header-info { text-align:center; font-size:13px; color:#6b7280; margin-bottom:20px; }
  .section { margin-bottom:35px; }
  .section-heading { text-align:center; color:#2563eb; font-size:18px; font-weight:600; margin-bottom:18px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #c7d2fe; display:inline-block; padding-bottom:4px; }
  .stats-grid { display:flex; justify-content:center; gap:15px; flex-wrap:wrap; margin-bottom:25px; }
  .stat-card { background:white; border-radius:10px; padding:14px 20px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.08); border:1px solid #e5e7eb; width:160px; }
  .stat-title { color:#6b7280; font-size:12px; margin-bottom:5px; }
  .stat-value { font-size:20px; font-weight:bold; color:#111827; }
  .status-breakdown h3 { text-align:center; color:#1d4ed8; font-size:15px; font-weight:600; margin-bottom:12px; }
  .status-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(120px,1fr)); gap:8px; justify-items:center; }
  .badge { background:#e0e7ff; color:#312e81; border-radius:6px; font-size:12px; font-weight:500; padding:6px 10px; width:90%; text-align:center; box-shadow:0 1px 2px rgba(0,0,0,0.05); }
  .team-card { background:white; border-radius:12px; padding:15px 20px; margin-bottom:20px; box-shadow:0 2px 4px rgba(0,0,0,0.08); border:1px solid #e5e7eb; page-break-inside:avoid; }
  .team-card h3 { font-size:16px; color:#4338ca; margin-bottom:8px; }
  .team-details p { font-size:12px; color:#374151; margin-bottom:4px; }
  .team-status h4 { margin:10px 0 8px 0; color:#2563eb; font-size:13px; text-align:left; }
  footer { text-align:center; font-size:11px; color:#9ca3af; margin-top:auto; padding:15px 0; border-top:1px solid #e5e7eb; background:#f9fafb; }
</style>
</head>
<body>
<main>
<h1>Manager Report: ${managerData.name}</h1>
<div class="header-info">
<p>Email: ${managerData.email}</p>
<p><strong>Report Period:</strong> ${formattedFrom} → ${formattedTo}</p>
</div>
${statsHTML}
${teamsHTML}
</main>
<footer>© SkyCRM ${new Date().getFullYear()} — Auto-generated on ${generatedOn}</footer>
</body>
</html>`;

  // ===== 6. Generate PDF using html-pdf-node =====
  const file = { content: htmlContent };
  const options = {
    format: "A4",
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    printBackground: true
  };

  return new Promise((resolve, reject) => {
    pdf.generatePdf(file, options).then(buffer => resolve(buffer)).catch(err => reject(err));
  });
}
