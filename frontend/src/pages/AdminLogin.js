import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE = window.location.hostname === 'localhost' ? 'http://localhost:8001' : 'https://call.appdost.com';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${BASE}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (data.success && data.token) {
                localStorage.setItem('adminToken', data.token);
                navigate('/admin/dashboard');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Server unreachable — try Demo Mode');
        }
        setLoading(false);
    };

    const handleDemoMode = () => {
        localStorage.setItem('adminToken', 'demo-mode-token');
        localStorage.setItem('adminDemoMode', 'true');
        navigate('/admin/dashboard');
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
            fontFamily: "'Segoe UI', system-ui, sans-serif"
        }}>
            <div style={{
                background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: '48px 40px',
                width: 400, backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
                    <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: 0 }}>
                        Admin Panel
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>
                        Connecto Platform v2.0
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    <input
                        type="password" placeholder="Admin Password"
                        value={password} onChange={e => setPassword(e.target.value)}
                        style={{
                            width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)',
                            background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 16, outline: 'none',
                            boxSizing: 'border-box', marginBottom: 16,
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                    />
                    {error && <p style={{ color: '#f87171', fontSize: 14, margin: '0 0 16px', textAlign: 'center' }}>{error}</p>}
                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                        fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 12,
                        opacity: loading ? 0.6 : 1, transition: 'all 0.2s'
                    }}>
                        {loading ? '⏳ Logging in...' : '🚀 Login'}
                    </button>
                </form>

                <div style={{ position: 'relative', margin: '20px 0' }}>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0 20px' }} />
                    <span style={{
                        position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                        background: '#16162e', padding: '0 12px', color: 'rgba(255,255,255,0.4)', fontSize: 12
                    }}>OR</span>
                </div>

                <button onClick={handleDemoMode} style={{
                    width: '100%', padding: '14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(16,185,129,0.1)', color: '#10b981',
                    fontSize: 16, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
                    onMouseEnter={e => { e.target.style.background = 'rgba(16,185,129,0.2)'; e.target.style.borderColor = '#10b981'; }}
                    onMouseLeave={e => { e.target.style.background = 'rgba(16,185,129,0.1)'; e.target.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                >
                    🧪 Demo Mode (Mock Data)
                </button>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                    Test the dashboard with sample data
                </p>
            </div>
        </div>
    );
}
