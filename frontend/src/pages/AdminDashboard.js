import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const token = localStorage.getItem('adminToken');

    useEffect(() => {
        if (!token) {
            navigate('/admin');
            return;
        }
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [token, navigate]);

    const fetchData = async () => {
        try {
            // Fetch Stats
            const resStats = await fetch('https://call.appdost.com/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resStats.status === 401) return logout();
            const dataStats = await resStats.json();
            setStats(dataStats);

            // Fetch Users
            const resUsers = await fetch('https://call.appdost.com/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataUsers = await resUsers.json();
            setUsers(dataUsers);
        } catch (err) {
            setError('Failed to fetch data');
        }
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        navigate('/admin');
    };

    const handleBan = async (ip) => {
        if (!window.confirm(`Ban IP: ${ip}?`)) return;
        try {
            await fetch('https://call.appdost.com/api/admin/ban', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ip, reason: 'Admin Ban' })
            });
            alert('Banned!');
            fetchData();
        } catch (err) {
            alert('Error banning user');
        }
    };

    if (!stats) return <div style={{ color: 'white' }}>Loading...</div>;

    return (
        <div style={{ padding: '20px', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h1>Connecto Admin</h1>
                <button onClick={logout} style={{ background: 'red', color: 'white' }}>Logout</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                <div style={{ background: '#333', padding: '20px', borderRadius: '8px' }}>
                    <h3>Online Users</h3>
                    <h2>{stats.online}</h2>
                </div>
                <div style={{ background: '#333', padding: '20px', borderRadius: '8px' }}>
                    <h3>Total Users (DB)</h3>
                    <h2>{stats.totalUsers}</h2>
                </div>
                <div style={{ background: '#333', padding: '20px', borderRadius: '8px' }}>
                    <h3>Banned IPs</h3>
                    <h2>{stats.bannedCount}</h2>
                </div>
            </div>

            <h3>Recent Users</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #555' }}>
                        <th>ID</th>
                        <th>IP Address</th>
                        <th>Last Seen</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id} style={{ borderBottom: '1px solid #333' }}>
                            <td>{user.id.substring(0, 8)}...</td>
                            <td>{user.ipAddress}</td>
                            <td>{new Date(user.lastSeen).toLocaleString()}</td>
                            <td>{user.isBanned ? '🔴 Banned' : '🟢 Active'}</td>
                            <td>
                                {!user.isBanned && (
                                    <button onClick={() => handleBan(user.ipAddress)} style={{ background: 'orange' }}>Ban IP</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminDashboard;
