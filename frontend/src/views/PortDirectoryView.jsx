import React, { useState, useEffect } from 'react';
import { BookOpen, Search } from 'lucide-react';

export default function PortDirectoryView() {
  const [query, setQuery] = useState('');
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPorts = async (searchStr) => {
    setLoading(true);
    try {
      const url = searchStr ? `/api/ports/directory?q=${encodeURIComponent(searchStr)}` : '/api/ports/directory';
      const res = await fetch(url);
      const data = await res.json();
      setPorts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPorts('');
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    fetchPorts(val);
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <BookOpen size={18} color="#38bdf8" />
          IANA Port Reference Directory & Exploit Database
        </div>
        <div className="card-desc">
          Search port assignments, common default credentials, penetration testing vectors, and protocol security profiles.
        </div>

        <div className="form-row">
          <div style={{ flex: '1 1 300px' }}>
            <input
              className="input mono"
              style={{ width: '100%' }}
              value={query}
              onChange={handleSearch}
              placeholder="Search by port number, service (e.g. 51820, Redis, SMB, WireGuard)..."
            />
          </div>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Port</th>
              <th>Service</th>
              <th>Protocol</th>
              <th>Category</th>
              <th>Risk</th>
              <th>Security Context & Exploitation Vectors</th>
            </tr>
          </thead>
          <tbody>
            {ports.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  No matching ports found in directory.
                </td>
              </tr>
            ) : (
              ports.map((p) => (
                <tr key={p.port}>
                  <td className="mono" style={{ fontWeight: 600, color: '#f1f5f9' }}>{p.port}</td>
                  <td style={{ fontWeight: 500, color: '#38bdf8' }}>{p.service}</td>
                  <td className="mono">{p.protocol}</td>
                  <td><span className="badge badge-neutral">{p.category}</span></td>
                  <td>
                    <span className={`badge ${p.risk === 'Critical' ? 'badge-danger' : (p.risk === 'High' ? 'badge-danger' : (p.risk === 'Medium' ? 'badge-warning' : 'badge-neutral'))}`}>
                      {p.risk}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#cbd5e1' }}>{p.desc}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
