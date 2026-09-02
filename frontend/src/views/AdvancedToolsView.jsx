import React, { useState } from 'react';
import { Wrench, Power, ShieldAlert, Cpu, Clock, RefreshCw, Layers } from 'lucide-react';

export default function AdvancedToolsView() {
  // WoL State
  const [wolMac, setWolMac] = useState('00:11:22:33:44:55');
  const [wolResult, setWolResult] = useState(null);

  // ARP Spoof State
  const [arpData, setArpData] = useState(null);
  const [checkingArp, setCheckingArp] = useState(false);

  // MTU State
  const [mtuTarget, setMtuTarget] = useState('8.8.8.8');
  const [mtuData, setMtuData] = useState(null);
  const [checkingMtu, setCheckingMtu] = useState(false);

  // NTP State
  const [ntpServer, setNtpServer] = useState('pool.ntp.org');
  const [ntpData, setNtpData] = useState(null);
  const [checkingNtp, setCheckingNtp] = useState(false);

  // Interface State
  const [ifaces, setIfaces] = useState(null);
  const [loadingIfaces, setLoadingIfaces] = useState(false);

  const sendWol = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tools/wol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac: wolMac })
      });
      const data = await res.json();
      setWolResult(data);
    } catch (err) {
      setWolResult({ success: false, error: err.message });
    }
  };

  const checkArpSpoof = async () => {
    setCheckingArp(true);
    try {
      const res = await fetch('/api/tools/arp-spoof-check');
      const data = await res.json();
      setArpData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingArp(false);
    }
  };

  const checkMtu = async () => {
    setCheckingMtu(true);
    try {
      const res = await fetch(`/api/tools/mtu?target=${encodeURIComponent(mtuTarget)}`);
      const data = await res.json();
      setMtuData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingMtu(false);
    }
  };

  const checkNtp = async () => {
    setCheckingNtp(true);
    try {
      const res = await fetch(`/api/tools/ntp?server=${encodeURIComponent(ntpServer)}`);
      const data = await res.json();
      setNtpData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingNtp(false);
    }
  };

  const loadInterfaces = async () => {
    setLoadingIfaces(true);
    try {
      const res = await fetch('/api/tools/interfaces');
      const data = await res.json();
      setIfaces(data.interfaces);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIfaces(false);
    }
  };

  return (
    <div>
      {/* 1. Wake-on-LAN */}
      <div className="card">
        <div className="card-title">
          <Power size={18} color="#38bdf8" />
          Wake-on-LAN (WoL) Transmitter
        </div>
        <div className="card-desc">
          Dispatch raw UDP magic packets to wake networked workstations and servers by MAC address.
        </div>
        <form onSubmit={sendWol} className="form-row">
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Target MAC Address</label>
            <input
              className="input mono"
              style={{ width: '100%' }}
              value={wolMac}
              onChange={e => setWolMac(e.target.value)}
              placeholder="00:11:22:33:44:55"
              required
            />
          </div>
          <div style={{ paddingTop: 18 }}>
            <button className="btn btn-primary" type="submit">
              Send Magic Packet
            </button>
          </div>
        </form>
        {wolResult && (
          <div style={{ marginTop: 10 }}>
            {wolResult.success ? (
              <span className="badge badge-success">Magic packet dispatched to {wolResult.target_mac} via UDP:9</span>
            ) : (
              <span className="badge badge-danger">{wolResult.error}</span>
            )}
          </div>
        )}
      </div>

      {/* 2. ARP Poisoning / Spoofing Detector */}
      <div className="card">
        <div className="card-title">
          <ShieldAlert size={18} color="#38bdf8" />
          ARP Poisoning & Gateway MITM Detector
        </div>
        <div className="card-desc">
          Audits the operating system ARP cache for duplicate MAC addresses or fraudulent gateway replies indicating a Man-in-the-Middle attack.
        </div>
        <div style={{ marginBottom: 12 }}>
          <button className="btn btn-secondary" onClick={checkArpSpoof} disabled={checkingArp}>
            <RefreshCw size={14} className={checkingArp ? 'spin' : ''} />
            {checkingArp ? 'Auditing ARP Cache...' : 'Audit ARP Cache'}
          </button>
        </div>
        {arpData && (
          <div>
            <div className="form-row" style={{ fontSize: 13, marginBottom: 8 }}>
              <div>Gateway IP: <span className="mono" style={{ color: '#38bdf8' }}>{arpData.gateway_ip}</span></div>
              <div>Gateway MAC: <span className="mono" style={{ color: '#cbd5e1' }}>{arpData.gateway_mac}</span></div>
              <div>Verdict: <span className={`badge ${arpData.is_spoofed ? 'badge-danger' : 'badge-success'}`}>{arpData.verdict}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Optimal MTU Path Finder */}
      <div className="card">
        <div className="card-title">
          <Layers size={18} color="#38bdf8" />
          Optimal Path MTU Finder (Avoid Fragmentation)
        </div>
        <div className="card-desc">
          Tests maximum unfragmented packet payload (Don't Fragment bit) to calculate exact network MTU.
        </div>
        <div className="form-row">
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Target</label>
            <input className="input mono" style={{ width: '100%' }} value={mtuTarget} onChange={e => setMtuTarget(e.target.value)} />
          </div>
          <div style={{ paddingTop: 18 }}>
            <button className="btn btn-secondary" onClick={checkMtu} disabled={checkingMtu}>
              {checkingMtu ? 'Testing Path...' : 'Find Optimal MTU'}
            </button>
          </div>
        </div>
        {mtuData && (
          <div style={{ marginTop: 10, fontSize: 13 }}>
            Optimal MTU: <span className="mono" style={{ fontWeight: 600, color: '#38bdf8' }}>{mtuData.optimal_mtu} bytes</span> (ICMP Data: {mtuData.optimal_icmp_payload} bytes) &mdash; {mtuData.status}
          </div>
        )}
      </div>

      {/* 4. NTP Clock Drift Analyzer */}
      <div className="card">
        <div className="card-title">
          <Clock size={18} color="#38bdf8" />
          NTP Time Sync & Atomic Clock Drift
        </div>
        <div className="card-desc">
          Calculates millisecond clock offset and stratum against precision network time protocol servers.
        </div>
        <div className="form-row">
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>NTP Server</label>
            <input className="input mono" style={{ width: '100%' }} value={ntpServer} onChange={e => setNtpServer(e.target.value)} />
          </div>
          <div style={{ paddingTop: 18 }}>
            <button className="btn btn-secondary" onClick={checkNtp} disabled={checkingNtp}>
              {checkingNtp ? 'Querying Stratum...' : 'Measure Clock Offset'}
            </button>
          </div>
        </div>
        {ntpData && (
          <div style={{ marginTop: 10, fontSize: 13 }}>
            {ntpData.status === 'SUCCESS' ? (
              <div className="form-row">
                <div>Stratum: <span className="mono" style={{ color: '#38bdf8' }}>{ntpData.stratum}</span></div>
                <div>Clock Offset: <span className="mono" style={{ color: Math.abs(ntpData.clock_offset_ms) < 50 ? '#10b981' : '#f59e0b' }}>{ntpData.clock_offset_ms} ms</span></div>
                <div>Roundtrip Delay: <span className="mono">{ntpData.round_trip_delay_ms} ms</span></div>
              </div>
            ) : (
              <span className="badge badge-danger">{ntpData.error}</span>
            )}
          </div>
        )}
      </div>

      {/* 5. Network Interface Hardware & Traffic */}
      <div className="card">
        <div className="card-title">
          <Cpu size={18} color="#38bdf8" />
          Hardware Interfaces & Throughput Counters
        </div>
        <div className="card-desc">
          Real-time interface hardware status, MAC, IPv4, transmitted/received megabytes and drop statistics.
        </div>
        <div style={{ marginBottom: 12 }}>
          <button className="btn btn-secondary" onClick={loadInterfaces} disabled={loadingIfaces}>
            <RefreshCw size={14} className={loadingIfaces ? 'spin' : ''} />
            {loadingIfaces ? 'Reading Interfaces...' : 'Read Interface Stats'}
          </button>
        </div>
        {ifaces && (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Interface</th>
                  <th>IP Address</th>
                  <th>MAC Address</th>
                  <th>Speed</th>
                  <th>Bytes In (RX)</th>
                  <th>Bytes Out (TX)</th>
                  <th>Packet Drops</th>
                </tr>
              </thead>
              <tbody>
                {ifaces.map((i) => (
                  <tr key={i.name}>
                    <td className="mono" style={{ fontWeight: 600, color: '#f1f5f9' }}>{i.name}</td>
                    <td className="mono">{i.ipv4}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{i.mac}</td>
                    <td>{i.speed_mbps ? `${i.speed_mbps} Mbps` : '-'}</td>
                    <td className="mono">{(i.bytes_recv / (1024 * 1024)).toFixed(1)} MB</td>
                    <td className="mono">{(i.bytes_sent / (1024 * 1024)).toFixed(1)} MB</td>
                    <td className="mono" style={{ color: (i.dropin + i.dropout) > 0 ? '#f59e0b' : '#94a3b8' }}>
                      {i.dropin + i.dropout}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
