import React, { useState } from 'react';
import { Calculator, Check } from 'lucide-react';

export default function SubnetCalculatorView() {
  const [cidr, setCidr] = useState('192.168.1.0/24');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const calculate = async (e) => {
    if (e) e.preventDefault();
    setError('');

    try {
      const res = await fetch(`/api/subnet/calculate?cidr=${encodeURIComponent(cidr)}`);
      const json = await res.json();
      if (!json.valid) {
        setError(json.error);
      } else {
        setResult(json);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Calculator size={18} color="#38bdf8" />
          IP & CIDR Subnet Calculator
        </div>
        <div className="card-desc">
          IPv4/IPv6 VLSM subnet calculation, usable host addresses, netmask, wildcard, and binary bit representation.
        </div>

        <form onSubmit={calculate}>
          <div className="form-row">
            <div style={{ flex: '1 1 260px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>IP / CIDR Block</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={cidr}
                onChange={e => setCidr(e.target.value)}
                placeholder="e.g. 10.0.0.0/16 or 192.168.1.50/24"
                required
              />
            </div>

            <div style={{ paddingTop: 18 }}>
              <button className="btn btn-primary" type="submit">
                Calculate Subnet
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

      {result && result.version === 'IPv4' && (
        <div>
          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Usable Host Capacity</div>
              <div className="metric-val mono" style={{ color: '#38bdf8' }}>{result.usable_hosts.toLocaleString()} hosts</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Subnet Mask</div>
              <div className="metric-val mono" style={{ fontSize: 16 }}>{result.netmask}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Network Class</div>
              <div className="metric-val">Class {result.ip_class}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Address Scope</div>
              <div className="metric-val">
                <span className={`badge ${result.is_private ? 'badge-neutral' : 'badge-warning'}`}>
                  {result.is_private ? 'Private RFC1918' : 'Public Internet'}
                </span>
              </div>
            </div>
          </div>

          <div className="data-table-container" style={{ marginBottom: 16 }}>
            <table className="data-table">
              <tbody>
                <tr>
                  <td style={{ width: 160, fontWeight: 600, color: '#f1f5f9' }}>Network Address</td>
                  <td className="mono" style={{ color: '#38bdf8', fontWeight: 600 }}>{result.network_address}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>Broadcast Address</td>
                  <td className="mono">{result.broadcast_address}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>Usable Host Range</td>
                  <td className="mono">{result.first_usable_ip} &mdash; {result.last_usable_ip}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>Wildcard Mask</td>
                  <td className="mono">{result.wildcard_mask}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>Binary Net ID</td>
                  <td className="mono" style={{ fontSize: 12, color: '#94a3b8' }}>{result.binary_network}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {result.split_examples && result.split_examples.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                NEXT-TIER SUBNET SPLIT (VLSM)
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {result.split_examples.map((s, idx) => (
                  <span key={idx} className="badge badge-neutral mono" style={{ fontSize: 12, padding: '6px 12px' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
