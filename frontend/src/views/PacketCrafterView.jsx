import React, { useState } from 'react';
import { Send, Radio, CheckCircle, AlertTriangle } from 'lucide-react';

export default function PacketCrafterView() {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState(80);
  const [protocol, setProtocol] = useState('TCP');
  const [payloadType, setPayloadType] = useState('TEXT');
  const [payload, setPayload] = useState('HEAD / HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState(null);

  // Echo Listener State
  const [listenPort, setListenPort] = useState(9999);
  const [listenStatus, setListenStatus] = useState('Stopped');

  const sendPacket = async (e) => {
    e.preventDefault();
    setSending(true);
    setResponse(null);

    try {
      const res = await fetch('/api/packet/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: parseInt(port),
          protocol,
          payload_type: payloadType,
          payload
        })
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({ success: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  const toggleListener = async () => {
    if (listenStatus === 'Running') {
      await fetch(`/api/listener/stop?port=${listenPort}`, { method: 'POST' });
      setListenStatus('Stopped');
    } else {
      const res = await fetch(`/api/listener/start?port=${listenPort}&protocol=TCP`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'started' || data.status === 'already_running') {
        setListenStatus('Running');
      } else {
        alert('Error starting listener: ' + data.error);
      }
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Send size={18} color="#38bdf8" />
          Raw Packet Crafter & Socket Dispatcher
        </div>
        <div className="card-desc">
          Dispatch custom ASCII or Hex payloads over TCP/UDP and inspect stream replies.
        </div>

        <form onSubmit={sendPacket}>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Destination Host / IP</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={host}
                onChange={e => setHost(e.target.value)}
                required
              />
            </div>

            <div style={{ flex: '0 0 100px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Port</label>
              <input
                type="number"
                className="input mono"
                style={{ width: '100%' }}
                value={port}
                onChange={e => setPort(e.target.value)}
                required
              />
            </div>

            <div style={{ flex: '0 0 100px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Protocol</label>
              <select className="input" value={protocol} onChange={e => setProtocol(e.target.value)}>
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
              </select>
            </div>

            <div style={{ flex: '0 0 110px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Encoding</label>
              <select className="input" value={payloadType} onChange={e => setPayloadType(e.target.value)}>
                <option value="TEXT">Plain Text / ASCII</option>
                <option value="HEX">Raw Hex</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Payload Data</label>
            <textarea
              className="input mono"
              style={{ width: '100%', height: 75, resize: 'vertical' }}
              value={payload}
              onChange={e => setPayload(e.target.value)}
              placeholder="e.g. GET / HTTP/1.1 or 48656c6c6f"
            />
          </div>

          <div>
            <button className="btn btn-primary" type="submit" disabled={sending}>
              <Send size={14} />
              {sending ? 'Sending Packet...' : 'Transmit Packet'}
            </button>
          </div>
        </form>
      </div>

      {response && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>TRANSMISSION RESULT</span>
            {response.latency_ms && <span className="mono">{response.latency_ms} ms</span>}
          </div>

          {response.success ? (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span className="badge badge-success">Bytes Sent: {response.bytes_sent}</span>
                <span className="badge badge-neutral">Bytes Received: {response.bytes_received}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>SERVER RESPONSE STREAM</div>
              <pre className="input mono" style={{ height: 'auto', minHeight: 60, whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
                {response.response_text || '(No reply returned before timeout)'}
              </pre>
            </div>
          ) : (
            <div style={{ padding: 10, background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 4, fontSize: 12 }}>
              {response.error}
            </div>
          )}
        </div>
      )}

      {/* Echo & Listener Diagnostic Tool */}
      <div className="card">
        <div className="card-title">
          <Radio size={18} color="#38bdf8" />
          On-Demand Inbound Echo Socket Listener
        </div>
        <div className="card-desc">
          Spin up a temporary local TCP listener to test port forwarding, NAT, and inbound firewall reachability from other devices.
        </div>

        <div className="form-row">
          <div style={{ flex: '0 0 140px' }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Listening Port</label>
            <input
              type="number"
              className="input mono"
              style={{ width: '100%' }}
              value={listenPort}
              onChange={e => setListenPort(e.target.value)}
              disabled={listenStatus === 'Running'}
            />
          </div>

          <div style={{ paddingTop: 18 }}>
            <button
              className={`btn ${listenStatus === 'Running' ? 'btn-danger' : 'btn-secondary'}`}
              onClick={toggleListener}
            >
              {listenStatus === 'Running' ? 'Stop Listener' : `Bind & Listen on 0.0.0.0:${listenPort}`}
            </button>
          </div>

          <div style={{ paddingTop: 22 }}>
            <span className={`badge ${listenStatus === 'Running' ? 'badge-success' : 'badge-neutral'}`}>
              STATUS: {listenStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
