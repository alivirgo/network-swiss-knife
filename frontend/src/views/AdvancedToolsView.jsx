import React, { useState, useEffect } from 'react';
import { Zap, ShieldAlert, Clock, Maximize2, HardDrive, Plus, Trash2, CheckCircle, Power } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import { useToast } from '../components/Toast';

export default function AdvancedToolsView() {
  const [activeTool, setActiveTool] = useState('wol');
  const addToast = useToast();

  // WoL State & Inventory
  const [mac, setMac] = useState('AA:BB:CC:DD:EE:FF');
  const [broadcastIp, setBroadcastIp] = useState('255.255.255.255');
  const [wolDevices, setWolDevices] = useState([
    { id: 1, name: 'Home NAS / Media Server', mac: '00:11:32:45:67:89', ip: '192.168.1.200' },
    { id: 2, name: 'Workstation Rig', mac: 'B4:2E:99:A1:C2:E0', ip: '192.168.1.150' }
  ]);
  const [newDevName, setNewDevName] = useState('');
  const [newDevMac, setNewDevMac] = useState('');

  // ARP Spoof State
  const [arpLoading, setArpLoading] = useState(false);
  const [arpResult, setArpResult] = useState(null);

  // MTU State
  const [mtuTarget, setMtuTarget] = useState('1.1.1.1');
  const [mtuLoading, setMtuLoading] = useState(false);
  const [mtuResult, setMtuResult] = useState(null);

  // NTP State
  const [ntpLoading, setNtpLoading] = useState(false);
  const [ntpResult, setNtpResult] = useState(null);

  // Load saved devices from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nsk_wol_devices');
      if (saved) setWolDevices(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const saveWolDevice = () => {
    if (!newDevName || !newDevMac) return;
    const updated = [...wolDevices, { id: Date.now(), name: newDevName, mac: newDevMac, ip: '255.255.255.255' }];
    setWolDevices(updated);
    localStorage.setItem('nsk_wol_devices', JSON.stringify(updated));
    setNewDevName('');
    setNewDevMac('');
    addToast(`Saved device "${newDevName}" to inventory`);
  };

  const removeWolDevice = (id) => {
    const updated = wolDevices.filter(d => d.id !== id);
    setWolDevices(updated);
    localStorage.setItem('nsk_wol_devices', JSON.stringify(updated));
    addToast('Removed device from inventory');
  };

  const sendWolPacket = async (targetMac, targetBcast) => {
    try {
      const res = await fetch('/api/tools/wol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac: targetMac || mac, broadcast_ip: targetBcast || broadcastIp })
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Wake-on-LAN magic packet dispatched to ${targetMac || mac}`);
      } else {
        addToast(data.error || 'Failed to dispatch WoL packet', 'error');
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const checkArp = async () => {
    setArpLoading(true);
    try {
      const res = await fetch('/api/tools/arp-spoof-check');
      const data = await res.json();
      setArpResult(data);
      addToast(`ARP analysis complete: ${data.verdict}`);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setArpLoading(false);
    }
  };

  const findMtu = async () => {
    setMtuLoading(true);
    try {
      const res = await fetch(`/api/tools/optimal-mtu?target=${encodeURIComponent(mtuTarget)}`);
      const data = await res.json();
      setMtuResult(data);
      addToast(`Optimal Path MTU to ${mtuTarget} is ${data.optimal_mtu} bytes`);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setMtuLoading(false);
    }
  };

  const checkNtp = async () => {
    setNtpLoading(true);
    try {
      const res = await fetch('/api/tools/ntp-drift');
      const data = await res.json();
      setNtpResult(data);
      addToast(`NTP Drift: ${data.drift_ms} ms against atomic clock`);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setNtpLoading(false);
    }
  };

  return (
    <div>
      {/* Tool Selector Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { id: 'wol', label: 'Wake-on-LAN (WoL)' },
          { id: 'arp', label: 'ARP Spoof / MITM Detector' },
          { id: 'mtu', label: 'Path MTU Discovery' },
          { id: 'ntp', label: 'NTP Atomic Clock Drift' }
        ].map(t => (
          <button
            key={t.id}
            className={`btn ${activeTool === t.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 12px', fontSize: 12 }}
            onClick={() => setActiveTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. Wake-on-LAN */}
      {activeTool === 'wol' && (
        <div>
          <div className="card">
            <div className="card-title">
              <Zap size={18} color="#38bdf8" />
              Wake-on-LAN (WoL) Magic Packet Dispatcher
            </div>
            <div className="card-desc">
              Broadcasts Layer-2/Layer-3 UDP magic frames (6x FF + 16x Target MAC) to remotely power on ACPI-compliant systems.
            </div>

            <div className="form-row">
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Target MAC Address</label>
                <input
                  className="input mono"
                  style={{ width: '100%' }}
                  value={mac}
                  onChange={e => setMac(e.target.value)}
                  placeholder="AA:BB:CC:DD:EE:FF"
                />
              </div>

              <div style={{ flex: '1 1 180px' }}>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Broadcast IP</label>
                <input
                  className="input mono"
                  style={{ width: '100%' }}
                  value={broadcastIp}
                  onChange={e => setBroadcastIp(e.target.value)}
                  placeholder="255.255.255.255"
                />
              </div>

              <div style={{ paddingTop: 18 }}>
                <button className="btn btn-primary" onClick={() => sendWolPacket()}>
                  <Power size={14} /> Dispatch Magic Packet
                </button>
              </div>
            </div>
          </div>

          {/* Saved Device Inventory */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HardDrive size={16} color="#38bdf8" />
              Saved Devices Inventory (1-Click Wake)
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: '1 1 180px', fontSize: 12 }}
                value={newDevName}
                onChange={e => setNewDevName(e.target.value)}
                placeholder="Friendly Device Name"
              />
              <input
                className="input mono"
                style={{ flex: '1 1 180px', fontSize: 12 }}
                value={newDevMac}
                onChange={e => setNewDevMac(e.target.value)}
                placeholder="MAC: 00:11:22:33:44:55"
              />
              <button className="btn btn-secondary" onClick={saveWolDevice}>
                <Plus size={14} /> Add Device
              </button>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Device Name</th>
                    <th>MAC Address</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {wolDevices.map((dev) => (
                    <tr key={dev.id}>
                      <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{dev.name}</td>
                      <td className="mono">{dev.mac}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '3px 10px', fontSize: 11 }}
                            onClick={() => sendWolPacket(dev.mac, dev.ip)}
                          >
                            <Power size={12} /> Wake Device
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => removeWolDevice(dev.id)}
                          >
                            <Trash2 size={12} color="#ef4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. ARP Spoof Check */}
      {activeTool === 'arp' && (
        <div className="card">
          <div className="card-title">
            <ShieldAlert size={18} color="#38bdf8" />
            ARP Cache Poisoning & Man-in-the-Middle (MITM) Auditor
          </div>
          <div className="card-desc">
            Audits kernel ARP table for duplicate hardware MAC addresses, conflicting gateway mappings, and gratuitous ARP poisoning attempts.
          </div>

          <div>
            <button className="btn btn-primary" onClick={checkArp} disabled={arpLoading}>
              {arpLoading ? 'Auditing ARP Cache...' : 'Audit Kernel ARP Cache'}
            </button>
          </div>

          <ProgressBar loading={arpLoading} label="Analyzing system ARP mappings..." />

          {arpResult && (
            <div style={{ marginTop: 16 }}>
              <div className="metrics-row">
                <div className="metric-box">
                  <div className="metric-label">Security Verdict</div>
                  <div className="metric-val">
                    <span className={`badge ${arpResult.is_spoofed ? 'badge-danger' : 'badge-success'}`}>
                      {arpResult.verdict}
                    </span>
                  </div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Total Cache Entries</div>
                  <div className="metric-val mono">{arpResult.total_entries}</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Duplicate Hardware MACs</div>
                  <div className="metric-val mono" style={{ color: arpResult.duplicate_macs_found > 0 ? '#ef4444' : '#10b981' }}>
                    {arpResult.duplicate_macs_found}
                  </div>
                </div>
              </div>

              {arpResult.duplicate_mac_details && Object.keys(arpResult.duplicate_mac_details).length > 0 && (
                <div style={{ marginTop: 12, padding: 12, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 6, fontSize: 12, color: '#fca5a5' }}>
                  <strong>Warning: Conflicting MAC detected across multiple IPs:</strong>
                  {Object.entries(arpResult.duplicate_mac_details).map(([mac, ips]) => (
                    <div key={mac} style={{ marginTop: 4 }}>
                      MAC <span className="mono">{mac}</span> is mapped to: {ips.join(', ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Optimal MTU Discovery */}
      {activeTool === 'mtu' && (
        <div className="card">
          <div className="card-title">
            <Maximize2 size={18} color="#38bdf8" />
            Path Maximum Transmission Unit (MTU) Discovery
          </div>
          <div className="card-desc">
            Performs unfragmented binary search ping probes with Don't Fragment (DF) bit set to determine maximum non-fragmented frame capacity.
          </div>

          <div className="form-row">
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Target Host</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={mtuTarget}
                onChange={e => setMtuTarget(e.target.value)}
              />
            </div>
            <div style={{ paddingTop: 18 }}>
              <button className="btn btn-primary" onClick={findMtu} disabled={mtuLoading}>
                {mtuLoading ? 'Discovering...' : 'Discover Path MTU'}
              </button>
            </div>
          </div>

          <ProgressBar loading={mtuLoading} label={`Executing DF boundary sweep against ${mtuTarget}...`} />

          {mtuResult && (
            <div style={{ marginTop: 16 }}>
              <div className="metrics-row">
                <div className="metric-box">
                  <div className="metric-label">Optimal Path MTU</div>
                  <div className="metric-val mono" style={{ color: '#38bdf8' }}>{mtuResult.optimal_mtu} Bytes</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Max ICMP Payload</div>
                  <div className="metric-val mono">{mtuResult.max_icmp_payload} Bytes</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Header Overhead</div>
                  <div className="metric-val mono">28 Bytes (20B IP + 8B ICMP)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. NTP Atomic Drift */}
      {activeTool === 'ntp' && (
        <div className="card">
          <div className="card-title">
            <Clock size={18} color="#38bdf8" />
            NTP Atomic Clock Sync & Time Drift Analysis
          </div>
          <div className="card-desc">
            Queries global Stratum-1 atomic time servers (`pool.ntp.org`) to calculate local system clock drift and precision offset.
          </div>

          <div>
            <button className="btn btn-primary" onClick={checkNtp} disabled={ntpLoading}>
              {ntpLoading ? 'Querying Atomic Server...' : 'Check System Clock Drift'}
            </button>
          </div>

          <ProgressBar loading={ntpLoading} label="Querying Stratum-1 NTP server..." />

          {ntpResult && (
            <div style={{ marginTop: 16 }}>
              <div className="metrics-row">
                <div className="metric-box">
                  <div className="metric-label">System Clock Drift</div>
                  <div className="metric-val mono" style={{ color: Math.abs(ntpResult.drift_ms) < 50 ? '#10b981' : '#fbbf24' }}>
                    {ntpResult.drift_ms} ms
                  </div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Reference Server</div>
                  <div className="metric-val mono" style={{ fontSize: 14 }}>{ntpResult.server}</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Stratum Level</div>
                  <div className="metric-val mono">Stratum {ntpResult.stratum}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
