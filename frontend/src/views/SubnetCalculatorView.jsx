import React, { useState, useEffect } from 'react';
import { Calculator, Split, Copy, Plus, Trash2, CheckCircle } from 'lucide-react';
import BitmaskSelector from '../components/BitmaskSelector';
import { useToast } from '../components/Toast';

export default function SubnetCalculatorView() {
  const [activeTab, setActiveTab] = useState('cidr'); // 'cidr' | 'vlsm'
  const [inputCidr, setInputCidr] = useState('192.168.1.0/24');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // VLSM Planner State
  const [vlsmRoot, setVlsmRoot] = useState('10.0.0.0/24');
  const [requirements, setRequirements] = useState([
    { id: 1, name: 'Engineering', hosts: 50 },
    { id: 2, name: 'Sales & Support', hosts: 25 },
    { id: 3, name: 'Guest Wi-Fi', hosts: 12 },
    { id: 4, name: 'Server Management', hosts: 6 }
  ]);
  const [vlsmResult, setVlsmResult] = useState(null);
  const [vlsmLoading, setVlsmLoading] = useState(false);

  const addToast = useToast();

  const calculate = async (cidrVal) => {
    setError('');
    try {
      const res = await fetch(`/api/subnet/calculate?cidr=${encodeURIComponent(cidrVal || inputCidr)}`);
      const json = await res.json();
      if (!json.valid) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    calculate('192.168.1.0/24');
  }, []);

  const handlePrefixChange = (newPrefix) => {
    const baseIp = inputCidr.split('/')[0] || '192.168.1.0';
    const updated = `${baseIp}/${newPrefix}`;
    setInputCidr(updated);
    calculate(updated);
  };

  const copyToClipboard = (text, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    addToast(`${label}: ${text}`);
  };

  // VLSM logic
  const handleVlsmSubmit = async (e) => {
    e.preventDefault();
    setVlsmLoading(true);
    try {
      const res = await fetch('/api/subnet/vlsm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root_cidr: vlsmRoot,
          requirements: requirements.map(r => ({ name: r.name, hosts: parseInt(r.hosts, 10) || 1 }))
        })
      });
      const json = await res.json();
      if (!json.valid) {
        addToast(json.error, 'error');
      } else {
        setVlsmResult(json);
        addToast(`Successfully allocated ${json.allocated_subnets.length} VLSM subnets (${json.utilization_pct}% address utilization)`);
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setVlsmLoading(false);
    }
  };

  const addRequirement = () => {
    setRequirements([...requirements, { id: Date.now(), name: 'New Subnet', hosts: 10 }]);
  };

  const removeRequirement = (id) => {
    if (requirements.length > 1) {
      setRequirements(requirements.filter(r => r.id !== id));
    }
  };

  return (
    <div>
      {/* Navigation Mode Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className={`btn ${activeTab === 'cidr' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('cidr')}
        >
          <Calculator size={14} /> CIDR & Bitmask Inspector
        </button>
        <button
          className={`btn ${activeTab === 'vlsm' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('vlsm')}
        >
          <Split size={14} /> VLSM Subnet Allocation Planner
        </button>
      </div>

      {activeTab === 'cidr' && (
        <>
          <div className="card">
            <div className="card-title">
              <Calculator size={18} color="#38bdf8" />
              IPv4 / IPv6 CIDR & Subnet Calculator
            </div>
            <div className="card-desc">
              Computes usable IP address ranges, broadcast addresses, wildcard masks, binary representation, and prefix hierarchy.
            </div>

            <form onSubmit={(e) => { e.preventDefault(); calculate(); }}>
              <div className="form-row">
                <div style={{ flex: '1 1 300px' }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>CIDR Notation / IP Address</label>
                  <input
                    className="input mono"
                    style={{ width: '100%' }}
                    value={inputCidr}
                    onChange={e => setInputCidr(e.target.value)}
                    placeholder="e.g. 192.168.1.0/24 or 10.0.0.0/16"
                    required
                  />
                </div>

                <div style={{ paddingTop: 18 }}>
                  <button className="btn btn-primary" type="submit">
                    Calculate
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 4, fontSize: 12, marginTop: 10 }}>
                {error}
              </div>
            )}
          </div>

          {data && data.version === 'IPv4' && (
            <div>
              {/* Interactive 32-bit Bitmask */}
              <BitmaskSelector
                prefix={data.prefix_length}
                onChangePrefix={handlePrefixChange}
              />

              <div className="metrics-row">
                <div className="metric-box">
                  <div className="metric-label">Usable Host Range</div>
                  <div
                    className="metric-val mono"
                    style={{ fontSize: 13, cursor: 'pointer', color: '#38bdf8' }}
                    onClick={() => copyToClipboard(`${data.first_usable_ip} - ${data.last_usable_ip}`, 'Host Range')}
                    title="Click to copy"
                  >
                    {data.first_usable_ip} - {data.last_usable_ip}
                  </div>
                </div>

                <div className="metric-box">
                  <div className="metric-label">Usable Hosts / Total</div>
                  <div className="metric-val mono">
                    {data.usable_hosts.toLocaleString()} <span style={{ fontSize: 13, color: '#64748b' }}>/ {data.total_addresses.toLocaleString()}</span>
                  </div>
                </div>

                <div className="metric-box">
                  <div className="metric-label">Subnet Mask</div>
                  <div className="metric-val mono" style={{ fontSize: 15 }}>{data.netmask}</div>
                </div>

                <div className="metric-box">
                  <div className="metric-label">Network Class</div>
                  <div className="metric-val mono">Class {data.ip_class}</div>
                </div>
              </div>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Value</th>
                      <th>Copy</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Network Address</td>
                      <td className="mono">{data.network_address}</td>
                      <td><button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => copyToClipboard(data.network_address, 'Network')}><Copy size={11} /></button></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Broadcast Address</td>
                      <td className="mono">{data.broadcast_address}</td>
                      <td><button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => copyToClipboard(data.broadcast_address, 'Broadcast')}><Copy size={11} /></button></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Wildcard Mask</td>
                      <td className="mono">{data.wildcard_mask}</td>
                      <td><button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => copyToClipboard(data.wildcard_mask, 'Wildcard')}><Copy size={11} /></button></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Binary Representation</td>
                      <td className="mono" style={{ color: '#38bdf8', fontSize: 12 }}>{data.binary_network}</td>
                      <td><button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => copyToClipboard(data.binary_network, 'Binary')}><Copy size={11} /></button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* VLSM Subnet Planner Tab */}
      {activeTab === 'vlsm' && (
        <div className="card">
          <div className="card-title">
            <Split size={18} color="#38bdf8" />
            Variable Length Subnet Masking (VLSM) Dynamic Allocator
          </div>
          <div className="card-desc">
            Enter department host requirements and automatically compute the optimal, collision-free subnet boundaries with minimal address waste.
          </div>

          <form onSubmit={handleVlsmSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Root Network CIDR Block</label>
              <input
                className="input mono"
                style={{ width: '100%', maxWidth: 300 }}
                value={vlsmRoot}
                onChange={e => setVlsmRoot(e.target.value)}
                placeholder="10.0.0.0/24"
                required
              />
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
              DEPARTMENT HOST ALLOCATIONS:
            </div>

            {requirements.map((req, idx) => (
              <div key={req.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  className="input"
                  style={{ flex: '1 1 200px' }}
                  value={req.name}
                  onChange={e => {
                    const copy = [...requirements];
                    copy[idx].name = e.target.value;
                    setRequirements(copy);
                  }}
                  placeholder="Subnet / Department Name"
                  required
                />
                <input
                  type="number"
                  className="input mono"
                  style={{ width: 120 }}
                  value={req.hosts}
                  onChange={e => {
                    const copy = [...requirements];
                    copy[idx].hosts = e.target.value;
                    setRequirements(copy);
                  }}
                  placeholder="Hosts needed"
                  min="1"
                  max="10000"
                  required
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>hosts</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 8px' }}
                  onClick={() => removeRequirement(req.id)}
                  title="Remove requirement"
                >
                  <Trash2 size={13} color="#ef4444" />
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={addRequirement}>
                <Plus size={14} /> Add Subnet Requirement
              </button>
              <button type="submit" className="btn btn-primary" disabled={vlsmLoading}>
                {vlsmLoading ? 'Computing Subnets...' : 'Calculate Optimal VLSM Allocation'}
              </button>
            </div>
          </form>

          {vlsmResult && (
            <div style={{ marginTop: 20 }}>
              <div className="metrics-row" style={{ marginBottom: 14 }}>
                <div className="metric-box">
                  <div className="metric-label">Address Utilization</div>
                  <div className="metric-val mono" style={{ color: '#10b981' }}>{vlsmResult.utilization_pct}%</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Allocated Addresses</div>
                  <div className="metric-val mono">{vlsmResult.allocated_addresses} / {vlsmResult.root_total_addresses}</div>
                </div>
              </div>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subnet Name</th>
                      <th>Needed</th>
                      <th>Allocated</th>
                      <th>CIDR Block</th>
                      <th>Netmask</th>
                      <th>Usable IP Range</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vlsmResult.allocated_subnets.map((s, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{s.name}</td>
                        <td className="mono">{s.needed_hosts}</td>
                        <td className="mono" style={{ color: '#38bdf8' }}>{s.allocated_hosts}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{s.cidr}</td>
                        <td className="mono">{s.netmask}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{s.usable_range}</td>
                        <td>
                          <span className={`badge ${s.status === 'ALLOCATED' ? 'badge-success' : 'badge-danger'}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
