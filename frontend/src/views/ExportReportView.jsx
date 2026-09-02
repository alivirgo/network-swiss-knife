import React, { useState } from 'react';
import { FileText, Download, CheckCircle } from 'lucide-react';

export default function ExportReportView() {
  const [reportFormat, setReportFormat] = useState('markdown');
  const [includeIsp, setIncludeIsp] = useState(true);
  const [includeLan, setIncludeLan] = useState(true);
  const [includeVpn, setIncludeVpn] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');

  const generateReport = async () => {
    setGenerating(true);
    setGeneratedText('');

    try {
      const promises = [];
      if (includeIsp) promises.push(fetch('/api/ping/isp').then(r => r.json()).catch(() => null));
      else promises.push(Promise.resolve(null));

      if (includeLan) promises.push(fetch('/api/lan/scan').then(r => r.json()).catch(() => null));
      else promises.push(Promise.resolve(null));

      if (includeVpn) promises.push(fetch('/api/vpn/audit').then(r => r.json()).catch(() => null));
      else promises.push(Promise.resolve(null));

      const [isp, lan, vpn] = await Promise.all(promises);

      const timestamp = new Date().toISOString();
      let output = '';

      if (reportFormat === 'json') {
        output = JSON.stringify({ timestamp, isp, lan, vpn }, null, 2);
      } else {
        output = `# NETWORK SWISS KNIFE (NSK) AUDIT REPORT\n`;
        output += `Generated At: ${timestamp}\n\n`;

        if (isp) {
          output += `## 1. ISP & GATEWAY HEALTH\n`;
          output += `- Gateway: ${isp.gateway} (Avg: ${isp.gateway_ping?.avg_ms} ms, Loss: ${isp.gateway_ping?.packet_loss_pct}%)\n`;
          output += `- ISP Hop Target: ${isp.isp_target} (Avg: ${isp.isp_ping?.avg_ms} ms, Jitter: ±${isp.isp_ping?.jitter_ms} ms)\n`;
          output += `- Overall Quality: ${isp.quality}\n\n`;
        }

        if (lan && lan.hosts) {
          output += `## 2. LAN DISCOVERY & ACTIVE NODES (${lan.online_count} online)\n`;
          output += `| IP | Hostname | MAC | Vendor | Role |\n`;
          output += `|---|---|---|---|---|\n`;
          lan.hosts.forEach(h => {
            output += `| ${h.ip} | ${h.hostname} | ${h.mac} | ${h.vendor} | ${h.device_type} |\n`;
          });
          output += `\n`;
        }

        if (vpn) {
          output += `## 3. VPN & TUNNEL AUDIT\n`;
          output += `- Local Machine VPN Adapters: ${vpn.local_vpn_adapters?.length || 0}\n`;
          output += `- Suspected LAN VPN Users: ${vpn.suspected_vpn_users_count || 0}\n`;
          if (vpn.lan_endpoints_with_vpn_ports?.length > 0) {
            vpn.lan_endpoints_with_vpn_ports.forEach(h => {
              output += `  * Host ${h.ip} (${h.hostname}): ${h.detected_vpn_ports.map(p => p.service).join(', ')}\n`;
            });
          }
          output += `\n`;
        }
      }

      setGeneratedText(output);
    } catch (e) {
      setGeneratedText('Error generating report: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!generatedText) return;
    const ext = reportFormat === 'json' ? 'json' : 'md';
    const mime = reportFormat === 'json' ? 'application/json' : 'text/markdown';
    const blob = new Blob([generatedText], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network_audit_report_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <FileText size={18} color="#38bdf8" />
          Network Audit & Diagnostic Report Generator
        </div>
        <div className="card-desc">
          Generate comprehensive audit logs for infrastructure assessments, penetration test documentation, or compliance.
        </div>

        <div className="form-row" style={{ marginBottom: 16 }}>
          <div style={{ flex: '0 0 140px' }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Report Format</label>
            <select className="input" value={reportFormat} onChange={e => setReportFormat(e.target.value)}>
              <option value="markdown">Markdown (.md)</option>
              <option value="json">Raw JSON (.json)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={includeIsp} onChange={e => setIncludeIsp(e.target.checked)} />
              ISP / Gateway Telemetry
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={includeLan} onChange={e => setIncludeLan(e.target.checked)} />
              LAN Nodes & MACs
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={includeVpn} onChange={e => setIncludeVpn(e.target.checked)} />
              VPN User Findings
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={generateReport} disabled={generating}>
            <FileText size={14} />
            {generating ? 'Compiling Audit Telemetry...' : 'Generate Audit Report'}
          </button>
          {generatedText && (
            <button className="btn btn-secondary" onClick={downloadReport}>
              <Download size={14} /> Download File
            </button>
          )}
        </div>
      </div>

      {generatedText && (
        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
            REPORT PREVIEW
          </div>
          <pre className="input mono" style={{ height: 280, overflowY: 'auto', whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
            {generatedText}
          </pre>
        </div>
      )}
    </div>
  );
}
