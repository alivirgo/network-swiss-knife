import React, { useState, useEffect } from 'react';
import { Send, Radio, Play, Square, FileText, CheckCircle, Copy } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import { useToast } from '../components/Toast';

export default function PacketCrafterView() {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState(80);
  const [protocol, setProtocol] = useState('TCP');
  const [payloadType, setPayloadType] = useState('TEXT');
  const [payload, setPayload] = useState('GET / HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n');
  
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState(null);

  // Listener state
  const [listenerPort, setListenerPort] = useState(9999);
  const [listenerProto, setListenerProto] = useState('TCP');
  const [listenerRunning, setListenerRunning] = useState(false);
  const [listenerLogs, setListenerLogs] = useState([]);

  const addToast = useToast();

  useEffect(() => {
    fetch('/api/packet/templates')
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(() => {});
  }, []);

  const handleTemplateChange = (tmplId) => {
    setSelectedTemplate(tmplId);
    const tmpl = templates.find(t => t.id === tmplId);
    if (tmpl) {
      setProtocol(tmpl.protocol);
      setPort(tmpl.default_port);
      setPayloadType(tmpl.type);
      setPayload(tmpl.payload);
      addToast(`Loaded preset template: ${tmpl.name}`);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setResponse(null);

    try {
      const res = await fetch('/api/packet/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: parseInt(port, 10),
          protocol,
          payload_type: payloadType,
          payload
        })
      });
      const data = await res.json();
      setResponse(data);
      if (data.success) {
        addToast(`Packet sent successfully (${data.bytes_sent} bytes, ${data.rtt_ms}ms)`);
      } else {
        addToast(data.error || 'Failed to dispatch packet', 'error');
      }
    } catch (err) {
      setResponse({ success: false, error: err.message });
      addToast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const toggleListener = async () => {
    if (listenerRunning) {
      try {
        await fetch(`/api/listener/stop?port=${listenerPort}`, { method: 'POST' });
        setListenerRunning(false);
        addToast(`Stopped echo listener on port ${listenerPort}`);
      } catch (err) {
        addToast(err.message, 'error');
      }
    } else {
      try {
        const res = await fetch(`/api/listener/start?port=${listenerPort}&protocol=${listenerProto}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setListenerRunning(true);
          addToast(`Listener active on 0.0.0.0:${listenerPort}`);
        } else {
          addToast(data.error, 'error');
        }
      } catch (err) {
        addToast(err.message, 'error');
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    addToast('Copied payload to clipboard');
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Send size={18} color="#38bdf8" />
          Raw Packet Crafter & Socket Dispatcher
        </div>
        <div className="card-desc">
          Craft and transmit custom Layer-4 TCP/UDP frames with ASCII or Hex payloads. Test daemon responsiveness, firewall traversal, and protocol handshakes.
        </div>

        {/* Preset Templates Selector */}
        {templates.length > 0 && (
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>PROTOCOL TEMPLATES:</label>
            <select
              className="input"
              style={{ maxWidth: 300, fontSize: 12 }}
              value={selectedTemplate}
              onChange={e => handleTemplateChange(e.target.value)}
            >
              <option value="">-- Choose Protocol Template --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.protocol}:{t.default_port})</option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSend}>
          <div className="form-row">
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Target Host / IP</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="127.0.0.1"
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
              <select
                className="input"
                style={{ width: '100%' }}
                value={protocol}
                onChange={e => setProtocol(e.target.value)}
              >
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
              </select>
            </div>

            <div style={{ flex: '0 0 110px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Encoding</label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={payloadType}
                onChange={e => setPayloadType(e.target.value)}
              >
                <option value="TEXT">ASCII / UTF-8</option>
                <option value="HEX">Raw Hex</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              Payload ({payloadType === 'HEX' ? 'e.g. 48 65 6c 6c 6f' : 'Plaintext'})
            </label>
            <textarea
              className="input mono"
              style={{ width: '100%', height: 90, resize: 'vertical' }}
              value={payload}
              onChange={e => setPayload(e.target.value)}
              placeholder="Payload data..."
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={sending}>
              <Send size={14} />
              {sending ? 'Dispatching...' : 'Dispatch Packet'}
            </button>
          </div>
        </form>

        <ProgressBar loading={sending} label={`Sending ${protocol} packet to ${host}:${port}...`} />

        {response && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Transmission Result: <span className={`badge ${response.success ? 'badge-success' : 'badge-danger'}`}>
                  {response.success ? 'SUCCESS' : 'FAILED'}
                </span>
              </div>
              {response.rtt_ms !== undefined && (
                <div className="mono" style={{ fontSize: 12, color: '#38bdf8' }}>RTT: {response.rtt_ms} ms</div>
              )}
            </div>

            {response.error && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 4, fontSize: 12 }}>
                {response.error}
              </div>
            )}

            {response.success && (
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>RECEIVED SOCKET RESPONSE:</div>
                <div style={{
                  backgroundColor: '#070a12',
                  border: '1px solid #1e293b',
                  borderRadius: 6,
                  padding: 12,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#10b981',
                  maxHeight: 180,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {response.received_text || response.received_hex || '(No response data returned from remote host)'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* On-Demand Socket Listener */}
      <div className="card">
        <div className="card-title">
          <Radio size={18} color="#38bdf8" />
          On-Demand TCP Echo Listener
        </div>
        <div className="card-desc">
          Binds an ephemeral local TCP listener to verify port forwarding, router NAT, and external accessibility.
        </div>

        <div className="form-row" style={{ alignItems: 'center' }}>
          <div style={{ width: 140 }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Listen Port</label>
            <input
              type="number"
              className="input mono"
              style={{ width: '100%' }}
              value={listenerPort}
              onChange={e => setListenerPort(e.target.value)}
              disabled={listenerRunning}
            />
          </div>

          <div style={{ paddingTop: 18 }}>
            <button
              className={`btn ${listenerRunning ? 'btn-danger' : 'btn-secondary'}`}
              onClick={toggleListener}
            >
              {listenerRunning ? <Square size={14} /> : <Play size={14} />}
              {listenerRunning ? `Stop Listener (Port ${listenerPort})` : `Start Listener on Port ${listenerPort}`}
            </button>
          </div>
        </div>

        {listenerRunning && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} className="spin" />
            <span>Listening on <strong>0.0.0.0:{listenerPort}</strong> &mdash; Send TCP data to verify connectivity!</span>
          </div>
        )}
      </div>
    </div>
  );
}
