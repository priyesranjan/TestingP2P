import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('https://call.appdost.com/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await response.json();
            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                navigate('/admin/dashboard');
            } else {
                setError('Invalid Password');
            }
        } catch (err) {
            setError('Connection Error');
        }
    };

    return (
        <div style={{ padding: '50px', color: 'white', textAlign: 'center' }}>
            <h2>Admin Access</h2>
            <form onSubmit={handleLogin}>
                <input
                    type="password"
                    placeholder="Admin Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ padding: '10px', fontSize: '16px' }}
                />
                <br /><br />
                <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>Login</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default AdminLogin;
