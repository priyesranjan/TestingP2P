import React, { useState, useEffect } from 'react';

const BASE = window.location.hostname === 'localhost' ? 'http://localhost:8001' : 'https://call.appdost.com';
const API = `${BASE}/api/admin`;
const isDemoMode = () => localStorage.getItem('adminDemoMode') === 'true';

// ─── Mock Data for Demo Mode ───
const MOCK = {
    stats: {
        totalUsers: 1247, totalExperts: 38, totalCalls: 5621, totalRevenue: 284500,
        pendingApps: 7, pendingReports: 12,
        recentUsers: [
            { id: '1', name: 'Priya Sharma', phone: '9876543210', role: 'user', createdAt: '2024-02-15T10:30:00Z' },
            { id: '2', name: 'Rahul Verma', phone: '9876543211', role: 'user', createdAt: '2024-02-14T08:20:00Z' },
            { id: '3', name: 'Ankit Gupta', phone: '9876543212', role: 'listener', createdAt: '2024-02-13T14:45:00Z' },
        ]
    },
    users: [
        { id: '1', name: 'Priya Sharma', phone: '9876543210', role: 'user', balance: 150, isOnline: true, isBanned: false, createdAt: '2024-01-10T10:30:00Z' },
        { id: '2', name: 'Rahul Verma', phone: '9876543211', role: 'user', balance: 320, isOnline: false, isBanned: false, createdAt: '2024-01-12T08:20:00Z' },
        { id: '3', name: 'Ankit Gupta', phone: '9876543212', role: 'listener', balance: 4500, isOnline: true, isBanned: false, createdAt: '2024-01-15T14:45:00Z' },
        { id: '4', name: 'Sneha Patel', phone: '9876543213', role: 'user', balance: 50, isOnline: false, isBanned: true, createdAt: '2024-01-20T09:00:00Z' },
        { id: '5', name: 'Vikram Singh', phone: '9876543214', role: 'listener', balance: 8700, isOnline: true, isBanned: false, createdAt: '2024-02-01T11:30:00Z' },
    ],
    experts: [
        { id: 'e1', userId: '3', user: { name: 'Ankit Gupta' }, specialization: 'Mental Health', ratePerMin: 10, totalCalls: 342, avgRating: 4.7, isAvailable: true, tier: 'Silver', badges: ['Top Rated'] },
        { id: 'e2', userId: '5', user: { name: 'Vikram Singh' }, specialization: 'Career Guidance', ratePerMin: 15, totalCalls: 189, avgRating: 4.5, isAvailable: true, tier: 'Bronze', badges: [] },
        { id: 'e3', userId: '6', user: { name: 'Dr. Meera Joshi' }, specialization: 'Relationship', ratePerMin: 20, totalCalls: 567, avgRating: 4.9, isAvailable: false, tier: 'Gold', badges: ['1000 Mins', 'Staff Pick'] },
    ],
    applications: [
        { id: 'a1', user: { name: 'Ravi Kumar', phone: '9876543220' }, realName: 'Ravi Kumar', expertise: 'Psychology', experience: '5 years counseling', status: 'pending', createdAt: '2024-02-14T10:00:00Z' },
        { id: 'a2', user: { name: 'Neha Agarwal', phone: '9876543221' }, realName: 'Neha Agarwal', expertise: 'Life Coach', experience: '3 years coaching', status: 'pending', createdAt: '2024-02-13T14:30:00Z' },
    ],
    reports: [
        { id: 'r1', reporter: { name: 'Priya Sharma' }, reported: { name: 'Unknown User' }, reason: 'Inappropriate language during call', status: 'pending', createdAt: '2024-02-15T09:00:00Z' },
        { id: 'r2', reporter: { name: 'Rahul Verma' }, reported: { name: 'Fake Expert' }, reason: 'Pretending to be a doctor', status: 'pending', createdAt: '2024-02-14T16:00:00Z' },
    ],
    transactions: [
        { id: 't1', user: { name: 'Priya Sharma' }, type: 'credit', amount: 500, status: 'completed', createdAt: '2024-02-15T10:00:00Z' },
        { id: 't2', user: { name: 'Rahul Verma' }, type: 'credit', amount: 1000, status: 'completed', createdAt: '2024-02-14T08:00:00Z' },
        { id: 't3', user: { name: 'Ankit Gupta' }, type: 'debit', amount: 4500, status: 'completed', createdAt: '2024-02-13T18:00:00Z' },
    ],
    payouts: [
        { id: 'p1', expert: { displayName: 'Ankit Gupta', upiId: 'ankit@upi' }, amount: 2000, status: 'requested', createdAt: '2024-02-16T10:00:00Z' },
        { id: 'p2', expert: { displayName: 'Vikram Singh', upiId: 'vikram@upi' }, amount: 5000, status: 'completed', createdAt: '2024-02-15T14:00:00Z' },
    ],
    'audit-log': [
        { id: 'l1', action: 'approve_expert', targetType: 'application', targetId: 'a1', admin: { name: 'Admin' }, createdAt: '2024-02-16T09:00:00Z', details: { userId: 'u1' } },
        { id: 'l2', action: 'ban_user', targetType: 'user', targetId: 'u4', admin: { name: 'Admin' }, createdAt: '2024-02-15T11:00:00Z', details: { reason: 'Abuse' } },
    ],
    'delete-requests': [
        { id: 'd1', user: { name: 'Sneha Patel', phone: '9876543213' }, reason: 'Not using the app anymore', status: 'pending', createdAt: '2024-02-12T11:00:00Z' },
    ]
};

export default function AdminDashboard() {
    const [tab, setTab] = useState('stats');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [testResults, setTestResults] = useState(null);
    const [customMethod, setCustomMethod] = useState('GET');
    const [customPath, setCustomPath] = useState('/api/health');
    const [customBody, setCustomBody] = useState('');
    const [customResult, setCustomResult] = useState(null);
    const [demoMode] = useState(isDemoMode());
    const token = localStorage.getItem('adminToken');

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchData = async (endpoint) => {
        setLoading(true);
        if (demoMode) {
            await new Promise(r => setTimeout(r, 400));
            setData(MOCK[endpoint] || null);
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`${API}/${endpoint}`, { headers });
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
            setData(MOCK[endpoint] || null);
        }
        setLoading(false);
    };

    useEffect(() => { if (tab !== 'test-api') fetchData(tab); }, [tab]);

    const runAutoTest = async () => {
        setLoading(true);
        if (demoMode) {
            await new Promise(r => setTimeout(r, 1000));
            setTestResults({
                summary: { total: 12, passed: 10, failed: 2 },
                results: [
                    { endpoint: 'GET /api/health', status: 'PASS', time: 12, statusCode: 200 },
                    { endpoint: 'GET /api/online', status: 'PASS', time: 8, statusCode: 200 },
                    { endpoint: 'POST /api/admin/login', status: 'PASS', time: 145, statusCode: 200 },
                    { endpoint: 'GET /api/admin/stats', status: 'PASS', time: 230, statusCode: 200 },
                    { endpoint: 'GET /api/admin/users', status: 'PASS', time: 180, statusCode: 200 },
                    { endpoint: 'GET /api/admin/experts', status: 'PASS', time: 165, statusCode: 200 },
                    { endpoint: 'GET /api/admin/applications', status: 'PASS', time: 120, statusCode: 200 },
                    { endpoint: 'GET /api/admin/reports', status: 'PASS', time: 135, statusCode: 200 },
                    { endpoint: 'GET /api/admin/transactions', status: 'PASS', time: 142, statusCode: 200 },
                    { endpoint: 'GET /api/admin/delete-requests', status: 'PASS', time: 98, statusCode: 200 },
                    { endpoint: 'POST /api/auth/send-otp', status: 'FAIL', time: 0, error: 'SMS provider not configured' },
                    { endpoint: 'POST /api/payments/create-order', status: 'FAIL', time: 0, error: 'Razorpay test keys needed' },
                ]
            });
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`${API}/test-api`, { headers });
            const json = await res.json();
            setTestResults(json);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const runCustomTest = async () => {
        setLoading(true);
        try {
            const opts = { method: customMethod, headers };
            if (customMethod !== 'GET' && customBody) opts.body = customBody;
            const start = Date.now();
            const res = await fetch(`${BASE}${customPath}`, opts);
            const time = Date.now() - start;
            const contentType = res.headers.get('content-type') || '';
            let body;
            if (contentType.includes('json')) body = await res.json();
            else body = await res.text();
            setCustomResult({ status: res.status, time, body, ok: res.ok });
        } catch (err) {
            setCustomResult({ status: 0, time: 0, body: err.message, ok: false });
        }
        setLoading(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminDemoMode');
        window.location.href = '/admin';
    };

    const tabs = [
        { key: 'stats', icon: '📊', label: 'Dashboard' },
        { key: 'users', icon: '👥', label: 'Users' },
        { key: 'experts', icon: '🎧', label: 'Experts' },
        { key: 'applications', icon: '📋', label: 'Applications' },
        { key: 'payouts', icon: '💸', label: 'Payouts' },
        { key: 'reports', icon: '🚨', label: 'Reports' },
        { key: 'transactions', icon: '💰', label: 'Transactions' },
        { key: 'audit-log', icon: '📝', label: 'Audit Log' },
        { key: 'delete-requests', icon: '🗑️', label: 'Delete Req' },
        { key: 'test-api', icon: '🧪', label: 'API Test' },
    ];

    const S = {
        page: {
            minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
            fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#fff'
        },
        header: {
            background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        },
        nav: { display: 'flex', gap: 4, overflowX: 'auto', padding: '12px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
        tabBtn: (active) => ({
            padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s',
            background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
            color: active ? '#fff' : 'rgba(255,255,255,0.6)'
        }),
        card: {
            background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24,
            border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16
        },
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' },
        td: { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14 },
        badge: (color) => ({
            display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: color === 'green' ? 'rgba(16,185,129,0.15)' : color === 'red' ? 'rgba(239,68,68,0.15)' : color === 'yellow' ? 'rgba(234,179,8,0.15)' : 'rgba(99,102,241,0.15)',
            color: color === 'green' ? '#10b981' : color === 'red' ? '#ef4444' : color === 'yellow' ? '#eab308' : '#6366f1'
        }),
        statCard: (gradient) => ({
            background: `linear-gradient(135deg, ${gradient})`, borderRadius: 16, padding: '24px 28px',
            flex: 1, minWidth: 180
        }),
        btn: (color = '#6366f1') => ({
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, background: color, color: '#fff', transition: 'all 0.2s'
        }),
    };

    const renderStats = () => {
        if (!data) return null;
        const stats = [
            { label: 'Total Users', value: data.totalUsers, icon: '👥', gradient: '#6366f1, #8b5cf6' },
            { label: 'Experts', value: data.totalExperts, icon: '🎧', gradient: '#10b981, #34d399' },
            { label: 'Total Calls', value: data.totalCalls, icon: '📞', gradient: '#f59e0b, #fbbf24' },
            { label: 'Revenue (₹)', value: `₹${(data.totalRevenue || 0).toLocaleString()}`, icon: '💰', gradient: '#ef4444, #f87171' },
            { label: 'Pending Apps', value: data.pendingApps, icon: '📋', gradient: '#8b5cf6, #a78bfa' },
            { label: 'Pending Reports', value: data.pendingReports, icon: '🚨', gradient: '#ec4899, #f472b6' },
        ];
        return (
            <>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                    {stats.map(s => (
                        <div key={s.label} style={S.statCard(s.gradient)}>
                            <div style={{ fontSize: 32, marginBottom: 4 }}>{s.icon}</div>
                            <div style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
                            <div style={{ fontSize: 13, opacity: 0.8 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
                {data.recentUsers && (
                    <div style={S.card}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>🕐 Recent Signups</h3>
                        <table style={S.table}>
                            <thead><tr><th style={S.th}>Name</th><th style={S.th}>Phone</th><th style={S.th}>Role</th><th style={S.th}>Joined</th></tr></thead>
                            <tbody>{data.recentUsers.map(u => (
                                <tr key={u.id}><td style={S.td}>{u.name}</td><td style={S.td}>{u.phone}</td><td style={S.td}><span style={S.badge('blue')}>{u.role}</span></td><td style={S.td}>{new Date(u.createdAt).toLocaleDateString()}</td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </>
        );
    };

    const renderUsers = () => {
        if (!data || !Array.isArray(data)) return <p style={{ opacity: 0.5 }}>No users found</p>;
        return (
            <div style={S.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>👥 All Users ({data.length})</h3>
                <table style={S.table}>
                    <thead><tr><th style={S.th}>Name</th><th style={S.th}>Phone</th><th style={S.th}>Role</th><th style={S.th}>Balance</th><th style={S.th}>Status</th><th style={S.th}>Actions</th></tr></thead>
                    <tbody>{data.map(u => (
                        <tr key={u.id}>
                            <td style={S.td}>{u.name || 'N/A'}</td>
                            <td style={S.td}>{u.phone}</td>
                            <td style={S.td}><span style={S.badge('blue')}>{u.role}</span></td>
                            <td style={S.td}>₹{u.balance || 0}</td>
                            <td style={S.td}>{u.isOnline ? <span style={S.badge('green')}>Online</span> : <span style={S.badge('red')}>Offline</span>}</td>
                            <td style={S.td}>
                                <button style={S.btn(u.isBanned ? '#10b981' : '#ef4444')}>{u.isBanned ? 'Unban' : 'Ban'}</button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        );
    };

    const renderExperts = () => {
        if (!data || !Array.isArray(data)) return <p style={{ opacity: 0.5 }}>No experts found</p>;
        return (
            <div style={S.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>🎧 Expert Profiles ({data.length})</h3>
                <table style={S.table}>
                    <thead><tr><th style={S.th}>Name</th><th style={S.th}>Tier</th><th style={S.th}>Specialization</th><th style={S.th}>Rate/min</th><th style={S.th}>Badges</th><th style={S.th}>Calls</th><th style={S.th}>Rating</th><th style={S.th}>Status</th></tr></thead>
                    <tbody>{data.map(e => (
                        <tr key={e.id}>
                            <td style={S.td}>{e.user?.name || 'N/A'}</td>
                            <td style={S.td}>
                                <span style={{
                                    ...S.badge(e.tier === 'Platinum' ? 'blue' : e.tier === 'Gold' ? 'yellow' : 'red'),
                                    background: e.tier === 'Platinum' ? 'linear-gradient(135deg, #e0e7ff, #a5b4fc)' : e.tier === 'Gold' ? 'linear-gradient(135deg, #fef3c7, #fcd34d)' : 'rgba(255,255,255,0.1)',
                                    color: '#000'
                                }}>{e.tier || 'Bronze'}</span>
                            </td>
                            <td style={S.td}>{e.specialization}</td>
                            <td style={S.td}>₹{e.ratePerMin}</td>
                            <td style={S.td}>{e.badges && e.badges.length > 0 ? e.badges.map(b => <span key={b} style={{ fontSize: 10, marginRight: 4, opacity: 0.7 }}>🏆 {b}</span>) : '-'}</td>
                            <td style={S.td}>{e.totalCalls}</td>
                            <td style={S.td}>⭐ {e.avgRating}</td>
                            <td style={S.td}>{e.isAvailable ? <span style={S.badge('green')}>Online</span> : <span style={S.badge('red')}>Offline</span>}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        );
    };

    const renderApplications = () => {
        if (!data || !Array.isArray(data)) return <p style={{ opacity: 0.5 }}>No applications</p>;
        return (
            <div style={S.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>📋 Expert Applications ({data.length})</h3>
                <table style={S.table}>
                    <thead><tr><th style={S.th}>Name</th><th style={S.th}>Expertise</th><th style={S.th}>Experience</th><th style={S.th}>Status</th><th style={S.th}>Actions</th></tr></thead>
                    <tbody>{data.map(a => (
                        <tr key={a.id} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }} onClick={() => setSelectedApp(a)}>
                            <td style={S.td}>{a.realName}</td>
                            <td style={S.td}>{a.expertise}</td>
                            <td style={S.td}>{a.experience || '-'}</td>
                            <td style={S.td}><span style={S.badge(a.status === 'approved' ? 'green' : a.status === 'rejected' ? 'red' : 'yellow')}>{a.status}</span></td>
                            <td style={S.td}>
                                <button style={S.btn('#6366f1')}>👁️ View Details</button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        );
    };

    const renderReports = () => {
        if (!data || !Array.isArray(data)) return <p style={{ opacity: 0.5 }}>No reports</p>;
        return (
            <div style={S.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>🚨 Reports ({data.length})</h3>
                <table style={S.table}>
                    <thead><tr><th style={S.th}>Reporter</th><th style={S.th}>Reported</th><th style={S.th}>Reason</th><th style={S.th}>Status</th><th style={S.th}>Actions</th></tr></thead>
                    <tbody>{data.map(r => (
                        <tr key={r.id}>
                            <td style={S.td}>{r.reporter?.name}</td>
                            <td style={S.td}>{r.reported?.name}</td>
                            <td style={S.td}>{r.reason}</td>
                            <td style={S.td}><span style={S.badge(r.status === 'resolved' ? 'green' : 'yellow')}>{r.status}</span></td>
                            <td style={S.td}>
                                {r.status === 'pending' && <button style={S.btn('#10b981')}>✅ Resolve</button>}
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        );
    };

    const renderTransactions = () => {
        if (!data || !Array.isArray(data)) return <p style={{ opacity: 0.5 }}>No transactions</p>;
        return (
            <div style={S.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>💰 Transactions ({data.length})</h3>
                <table style={S.table}>
                    <thead><tr><th style={S.th}>User</th><th style={S.th}>Type</th><th style={S.th}>Amount</th><th style={S.th}>Status</th><th style={S.th}>Date</th></tr></thead>
                    <tbody>{data.map(t => (
                        <tr key={t.id}>
                            <td style={S.td}>{t.user?.name}</td>
                            <td style={S.td}><span style={S.badge(t.type === 'credit' ? 'green' : 'red')}>{t.type}</span></td>
                            <td style={S.td}>₹{t.amount}</td>
                            <td style={S.td}><span style={S.badge(t.status === 'completed' ? 'green' : 'yellow')}>{t.status}</span></td>
                            <td style={S.td}>{new Date(t.createdAt).toLocaleString()}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        );
    };

    const renderDeleteRequests = () => {
        if (!data || !Array.isArray(data)) return <p style={{ opacity: 0.5 }}>No delete requests</p>;
        return (
            <div style={S.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>🗑️ Delete Requests ({data.length})</h3>
                <table style={S.table}>
                    <thead><tr><th style={S.th}>User</th><th style={S.th}>Phone</th><th style={S.th}>Reason</th><th style={S.th}>Status</th><th style={S.th}>Actions</th></tr></thead>
                    <tbody>{data.map(d => (
                        <tr key={d.id}>
                            <td style={S.td}>{d.user?.name}</td>
                            <td style={S.td}>{d.user?.phone}</td>
                            <td style={S.td}>{d.reason}</td>
                            <td style={S.td}><span style={S.badge(d.status === 'approved' ? 'green' : 'yellow')}>{d.status}</span></td>
                            <td style={S.td}>
                                {d.status === 'pending' && <>
                                    <button style={{ ...S.btn('#ef4444'), marginRight: 8 }}>🗑️ Delete User</button>
                                    <button style={S.btn('#6366f1')}>❌ Reject</button>
                                </>}
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        );
    };

    const handleProcessPayout = async (id) => {
        if (!window.confirm('Mark this payout as processed?')) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/payouts/${id}/process`, { method: 'POST', headers });
            const json = await res.json();
            if (json.success) {
                alert('Payout processed successfully');
                fetchData('payouts');
            } else {
                alert('Failed: ' + json.error);
            }
        } catch (err) {
            alert('Error processing payout');
        }
        setLoading(false);
    };

    const renderPayouts = () => {
        if (!data || !Array.isArray(data)) return <p style={{ opacity: 0.5 }}>No payouts found</p>;
        return (
            <div style={S.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>💸 Payout Requests ({data.length})</h3>
                <table style={S.table}>
                    <thead><tr><th style={S.th}>Expert</th><th style={S.th}>Amount</th><th style={S.th}>UPI ID</th><th style={S.th}>Status</th><th style={S.th}>Date</th><th style={S.th}>Actions</th></tr></thead>
                    <tbody>{data.map(p => (
                        <tr key={p.id}>
                            <td style={S.td}>{p.expert?.displayName || 'Unknown'}</td>
                            <td style={S.td}>₹{p.amount}</td>
                            <td style={S.td}>{p.upiId}</td>
                            <td style={S.td}><span style={S.badge(p.status === 'completed' ? 'green' : p.status === 'requested' ? 'yellow' : 'red')}>{p.status}</span></td>
                            <td style={S.td}>{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td style={S.td}>
                                {p.status === 'requested' && (
                                    <button onClick={() => handleProcessPayout(p.id)} style={S.btn('#10b981')}>✅ Process</button>
                                )}
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        );
    };

    const renderAuditLog = () => {
        if (!data || !Array.isArray(data)) return <p style={{ opacity: 0.5 }}>No logs found</p>;
        return (
            <div style={S.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>📝 Audit Log ({data.length})</h3>
                <table style={S.table}>
                    <thead><tr><th style={S.th}>Admin</th><th style={S.th}>Action</th><th style={S.th}>Target</th><th style={S.th}>Details</th><th style={S.th}>Date</th></tr></thead>
                    <tbody>{data.map(l => (
                        <tr key={l.id}>
                            <td style={S.td}>{l.admin?.name || 'System'}</td>
                            <td style={S.td}><span style={S.badge('blue')}>{l.action}</span></td>
                            <td style={S.td}>{l.targetType} #{l.targetId}</td>
                            <td style={S.td}><pre style={{ margin: 0, fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 4 }}>{JSON.stringify(l.details || {}, null, 1).replace(/[\{\}"]/g, '')}</pre></td>
                            <td style={S.td}>{new Date(l.createdAt).toLocaleString()}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        );
    };

    const renderApiTest = () => (
        <>
            {/* Auto Test */}
            <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>⚡ Auto Test — All Endpoints</h3>
                    <button onClick={runAutoTest} disabled={loading} style={S.btn('#6366f1')}>
                        {loading ? '⏳ Testing...' : '▶ Run All Tests'}
                    </button>
                </div>
                {testResults && (
                    <>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                            <div style={{ ...S.statCard('#10b981, #34d399'), padding: '16px 20px', flex: 'none' }}>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>{testResults.summary?.passed || 0}</div>
                                <div style={{ fontSize: 12 }}>Passed</div>
                            </div>
                            <div style={{ ...S.statCard('#ef4444, #f87171'), padding: '16px 20px', flex: 'none' }}>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>{testResults.summary?.failed || 0}</div>
                                <div style={{ fontSize: 12 }}>Failed</div>
                            </div>
                            <div style={{ ...S.statCard('#6366f1, #8b5cf6'), padding: '16px 20px', flex: 'none' }}>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>{testResults.summary?.total || 0}</div>
                                <div style={{ fontSize: 12 }}>Total</div>
                            </div>
                        </div>
                        <table style={S.table}>
                            <thead><tr><th style={S.th}>Endpoint</th><th style={S.th}>Status</th><th style={S.th}>Code</th><th style={S.th}>Time</th><th style={S.th}>Error</th></tr></thead>
                            <tbody>{(testResults.results || []).map((r, i) => (
                                <tr key={i}>
                                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 13 }}>{r.endpoint}</td>
                                    <td style={S.td}><span style={S.badge(r.status === 'PASS' ? 'green' : 'red')}>{r.status}</span></td>
                                    <td style={S.td}>{r.statusCode || '-'}</td>
                                    <td style={S.td}>{r.time}ms</td>
                                    <td style={{ ...S.td, color: '#f87171', fontSize: 12 }}>{r.error || '-'}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </>
                )}
            </div>

            {/* Custom Endpoint Tester */}
            <div style={S.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>🔧 Custom Endpoint Tester</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    <select value={customMethod} onChange={e => setCustomMethod(e.target.value)} style={{
                        padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 14
                    }}>
                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input type="text" value={customPath} onChange={e => setCustomPath(e.target.value)}
                        placeholder="/api/health" style={{
                            flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
                            color: '#fff', fontSize: 14, fontFamily: 'monospace'
                        }} />
                    <button onClick={runCustomTest} disabled={loading} style={S.btn('#6366f1')}>
                        {loading ? '⏳' : '🚀 Send'}
                    </button>
                </div>
                {customMethod !== 'GET' && (
                    <textarea value={customBody} onChange={e => setCustomBody(e.target.value)}
                        placeholder='{"key": "value"}' rows={4} style={{
                            width: '100%', padding: '12px 14px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
                            color: '#fff', fontSize: 13, fontFamily: 'monospace', resize: 'vertical',
                            boxSizing: 'border-box', marginBottom: 16
                        }} />
                )}
                {customResult && (
                    <div style={{ ...S.card, background: 'rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                            <span style={S.badge(customResult.ok ? 'green' : 'red')}>
                                {customResult.status} {customResult.ok ? 'OK' : 'FAIL'}
                            </span>
                            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>⏱ {customResult.time}ms</span>
                        </div>
                        <pre style={{
                            background: 'rgba(0,0,0,0.4)', padding: 16, borderRadius: 8,
                            fontSize: 13, fontFamily: 'monospace', overflow: 'auto', maxHeight: 400,
                            color: '#a5f3fc', margin: 0
                        }}>{typeof customResult.body === 'object' ? JSON.stringify(customResult.body, null, 2) : customResult.body}</pre>
                    </div>
                )}
            </div>
        </>
    );

    const handleAppAction = async (id, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this application?`)) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/applications/${id}/${action}`, { method: 'POST', headers });
            const json = await res.json();
            if (json.success) {
                alert(`Application ${action}d successfully`);
                setSelectedApp(null);
                fetchData('applications');
            } else {
                alert('Failed: ' + json.error);
            }
        } catch (err) {
            alert(`Error ${action}ing application`);
        }
        setLoading(false);
    };

    const renderAppModal = () => {
        if (!selectedApp) return null;
        const a = selectedApp;
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)'
            }} onClick={() => setSelectedApp(null)}>
                <div style={{
                    background: '#1a1a3e', width: '90%', maxWidth: 800, maxHeight: '90vh',
                    borderRadius: 24, padding: 32, overflowY: 'auto', position: 'relative',
                    border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedApp(null)} style={{
                        position: 'absolute', top: 24, right: 24, background: 'none', border: 'none',
                        color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer'
                    }}>×</button>

                    <h2 style={{ margin: '0 0 8px', fontSize: 24 }}>{a.realName}</h2>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                        <span style={S.badge('blue')}>{a.expertise}</span>
                        <span style={{ opacity: 0.6, fontSize: 13, alignSelf: 'center' }}>Applied on {new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                        <div>
                            <h4 style={{ margin: '0 0 12px', opacity: 0.7 }}>Selfie</h4>
                            <div style={{
                                width: '100%', aspectRatio: '1', background: '#0f0f23', borderRadius: 12, overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {a.profileSelfieUrl ? (
                                    <img src={a.profileSelfieUrl} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : <span style={{ opacity: 0.3 }}>No Selfie</span>}
                            </div>
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 12px', opacity: 0.7 }}>ID Proof</h4>
                            <div style={{
                                width: '100%', aspectRatio: '1.6', background: '#0f0f23', borderRadius: 12, overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {a.idProofUrl ? (
                                    <img src={a.idProofUrl} alt="ID Proof" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : <span style={{ opacity: 0.3 }}>No ID Proof</span>}
                            </div>
                            <h4 style={{ margin: '24px 0 12px', opacity: 0.7 }}>Voice Intro</h4>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12 }}>
                                {a.introAudioUrl ? (
                                    <audio controls src={a.introAudioUrl} style={{ width: '100%' }} />
                                ) : <div style={{ opacity: 0.5, fontSize: 13 }}>No audio provided</div>}
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 12, marginBottom: 32 }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: 14, opacity: 0.8 }}>Bio / Experience</h4>
                        <p style={{ margin: 0, lineHeight: 1.6, opacity: 0.9 }}>{a.bio || 'No bio provided.'}</p>
                        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.6 }}>Experience: {a.experience}</div>
                        <div style={{ marginTop: 4, fontSize: 13, opacity: 0.6 }}>Language: {a.language}</div>
                    </div>

                    {a.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24 }}>
                            <button onClick={() => handleAppAction(a.id, 'approve')} style={{
                                ...S.btn('#10b981'), flex: 1, padding: '14px', fontSize: 16
                            }}>✅ Approve Expert</button>
                            <button onClick={() => handleAppAction(a.id, 'reject')} style={{
                                ...S.btn('#ef4444'), flex: 1, padding: '14px', fontSize: 16
                            }}>❌ Reject Application</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (loading && !testResults && !customResult) {
            return <div style={{ textAlign: 'center', padding: 60, fontSize: 48 }}>
                <div style={{ animation: 'spin 1s linear infinite' }}>⏳</div>
            </div>;
        }
        switch (tab) {
            case 'stats': return renderStats();
            case 'users': return renderUsers();
            case 'experts': return renderExperts();
            case 'applications': return renderApplications();
            case 'payouts': return renderPayouts();
            case 'reports': return renderReports();
            case 'transactions': return renderTransactions();
            case 'audit-log': return renderAuditLog();
            case 'delete-requests': return renderDeleteRequests();
            case 'test-api': return renderApiTest();
            default: return null;
        }
    };

    return (
        <div style={S.page}>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <div style={S.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 28 }}>⚡</span>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>Connecto Admin</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                            Platform v2.0 {demoMode && <span style={S.badge('yellow')}>DEMO MODE</span>}
                        </div>
                    </div>
                </div>
                <button onClick={handleLogout} style={{
                    padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 14,
                    fontWeight: 600, cursor: 'pointer'
                }}>🚪 Logout</button>
            </div>
            <div style={S.nav}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={S.tabBtn(tab === t.key)}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>
            <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>{renderContent()}</div>
            {renderAppModal()}
        </div>
    );
}
