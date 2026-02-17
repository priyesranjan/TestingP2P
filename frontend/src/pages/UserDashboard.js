import { useRazorpay } from 'react-razorpay';

export default function UserDashboard() {
    const { Razorpay } = useRazorpay();
    const navigate = useNavigate();
    // ... (existing state)

    // ... (existing functions)

    const handleRecharge = async () => {
        const amountStr = prompt('Enter amount to add (Min ₹50):', '100');
        if (!amountStr) return;
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount < 50) return toast.error('Minimum amount is ₹50');

        setLoading(true);
        try {
            // 1. Create Order
            const orderRes = await fetch(`${BASE}/api/payments/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount })
            });

            const orderJson = await orderRes.json();
            if (!orderJson.success) throw new Error(orderJson.error || 'Order creation failed');

            // 2. Open Razorpay
            const options = {
                key: orderJson.keyId,
                amount: orderJson.amount,
                currency: orderJson.currency,
                name: 'Connecto Wallet',
                description: 'Add Balance to Wallet',
                order_id: orderJson.orderId,
                handler: async (response) => {
                    // 3. Verify Payment
                    try {
                        const verifyRes = await fetch(`${BASE}/api/payments/verify`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(response)
                        });
                        const verifyJson = await verifyRes.json();
                        if (verifyJson.success) {
                            toast.success('Recharge Successful!');
                            fetchData(); // Refresh wallet
                        } else {
                            toast.error('Payment Verification Failed');
                        }
                    } catch (e) {
                        toast.error('Verification Error');
                    }
                },
                prefill: {
                    name: user?.name || 'User',
                    contact: user?.phone
                },
                theme: {
                    color: '#6366f1'
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Payment failed');
        }
        setLoading(false);
    };

    // ... (rest of the component)

    // Update button in render
    // <button onClick={handleRecharge} style={{ ...S.btn }}>+ Add Money</button>
    const [user, setUser] = useState(null);
    const [experts, setExperts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('experts'); // experts | history | wallet

    // Auth State
    const [token, setToken] = useState(localStorage.getItem('userToken'));
    const [authStep, setAuthStep] = useState('login'); // login | otp
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');

    const userId = localStorage.getItem('chat_user_id'); // From ChatPage logic

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [dashRes, expRes] = await Promise.all([
                fetch(`${API}/dashboard`, { headers }),
                fetch(`${API}/experts`, { headers })
            ]);

            if (dashRes.ok) {
                const dash = await dashRes.json();
                setUser(dash);
            } else if (dashRes.status === 401) {
                logout();
            }

            if (expRes.ok) {
                const exp = await expRes.json();
                setExperts(exp);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load dashboard data');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const logout = () => {
        localStorage.removeItem('userToken');
        setToken(null);
        setUser(null);
        setAuthStep('login');
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (phone.length < 10) return toast.error('Enter valid phone number');
        setLoading(true);
        try {
            const res = await fetch(`${AUTH_API}/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const json = await res.json();
            if (json.success) {
                toast.success('OTP Sent!');
                setAuthStep('otp');
            } else {
                toast.error(json.error || 'Failed to send OTP');
            }
        } catch (err) {
            toast.error('Network Error');
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length < 6) return toast.error('Enter valid OTP');
        setLoading(true);
        try {
            const res = await fetch(`${AUTH_API}/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp })
            });
            const json = await res.json();
            if (json.success) {
                toast.success('Login Successful!');
                localStorage.setItem('userToken', json.token);
                setToken(json.token);
                // Also update user info if possible
            } else {
                toast.error(json.error || 'Invalid OTP');
            }
        } catch (err) {
            toast.error('Login Failed');
        }
        setLoading(false);
    };

    const S = {
        page: {
            minHeight: '100vh', background: '#0f0f23', color: '#fff', fontFamily: "'Space Grotesk', sans-serif",
            paddingBottom: 80, display: 'flex', flexDirection: 'column'
        },
        header: {
            padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.08)',
            position: 'sticky', top: 0, zIndex: 10
        },
        card: {
            background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, margin: '0 20px 16px',
            border: '1px solid rgba(255,255,255,0.08)'
        },
        input: {
            width: '100%', padding: '14px', borderRadius: 8, background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginBottom: 16, fontSize: 16
        },
        statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 20px 16px' },
        statItem: {
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
            borderRadius: 12, padding: 16, border: '1px solid rgba(99,102,241,0.2)'
        },
        sectionTitle: { margin: '24px 20px 12px', fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.9)' },
        expertCard: {
            display: 'flex', alignItems: 'center', gap: 16, padding: 16,
            background: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 12,
            border: '1px solid rgba(255,255,255,0.05)'
        },
        badge: (tier) => ({
            fontSize: 10, padding: '2px 8px', borderRadius: 10, marginLeft: 8,
            background: tier === 'Gold' ? '#fbbf24' : tier === 'Silver' ? '#94a3b8' : '#d97706',
            color: '#000', fontWeight: 'bold'
        }),
        btn: {
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', padding: '14px 20px',
            borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', width: '100%'
        },
        bottomNav: {
            position: 'fixed', bottom: 0, left: 0, right: 0, height: 70, background: '#1a1a3e',
            display: 'flex', justifyContent: 'space-around', alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 20
        }
    };

    if (!token) {
        return (
            <div style={{ ...S.page, justifyContent: 'center', padding: 24 }}>
                <Toaster position="top-center" theme="dark" />
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Secure Login</h1>
                    <p style={{ opacity: 0.6 }}>Access your Wallet & History</p>
                </div>

                <div style={S.card}>
                    {authStep === 'login' ? (
                        <form onSubmit={handleSendOtp}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, opacity: 0.7 }}>Phone Number</label>
                            <input
                                style={S.input}
                                type="tel"
                                placeholder="9876543210"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                minLength={10}
                                required
                            />
                            <button type="submit" style={S.btn} disabled={loading}>
                                {loading ? 'Sending...' : 'Send OTP'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, opacity: 0.7 }}>Enter OTP</label>
                            <input
                                style={S.input}
                                type="text"
                                placeholder="123456"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                maxLength={6}
                                required
                            />
                            <button type="submit" style={S.btn} disabled={loading}>
                                {loading ? 'Verifying...' : 'Login'}
                            </button>
                            <div
                                onClick={() => setAuthStep('login')}
                                style={{ textAlign: 'center', marginTop: 16, fontSize: 13, opacity: 0.5, cursor: 'pointer' }}
                            >
                                Change Phone Number
                            </div>
                        </form>
                    )}
                </div>
                <button
                    onClick={() => navigate('/')}
                    style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.4, marginTop: 24, cursor: 'pointer' }}
                >
                    ← Back to Chat
                </button>
            </div>
        );
    }

    return (
        <div style={S.page}>
            <Toaster position="top-center" theme="dark" />
            <div style={S.header}>
                <h1 style={{ margin: 0, fontSize: 20 }}>My Dashboard</h1>
                <button onClick={logout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Logout</button>
            </div>

            {/* Wallet Card */}
            <div style={S.card}>
                <div style={{ opacity: 0.7, fontSize: 14, marginBottom: 4 }}>Wallet Balance</div>
                <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>₹{user?.balance || '0.00'}</div>
                <button onClick={handleRecharge} style={{ ...S.btn }}>+ Add Money</button>
            </div>

            {/* Stats */}
            <div style={S.statGrid}>
                <div style={S.statItem}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.recentCalls?.length || 0}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Recent Calls</div>
                </div>
                <div style={S.statItem}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.recentTransactions?.length || 0}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Transactions</div>
                </div>
            </div>

            {/* Content Switch */}
            {tab === 'experts' && (
                <>
                    <h3 style={S.sectionTitle}>Find Experts</h3>
                    <div style={{ padding: '0 20px' }}>
                        {loading ? <p style={{ opacity: 0.5 }}>Loading experts...</p> : experts.map(e => (
                            <div key={e.id} style={S.expertCard}>
                                <div style={{ width: 48, height: 48, borderRadius: 24, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                    {e.user?.name?.[0] || 'E'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                        {e.user?.name}
                                        {e.tier && <span style={S.badge(e.tier)}>{e.tier}</span>}
                                    </div>
                                    <div style={{ fontSize: 13, opacity: 0.7 }}>{e.specialization} • ₹{e.ratePerMin}/min</div>
                                    <div style={{ fontSize: 11, color: '#facc15' }}>
                                        {e.badges?.map(b => `🏆 ${b} `)}
                                    </div>
                                </div>
                                <button style={{ ...S.btn, width: 'auto', padding: '8px 16px', fontSize: 13 }}>Call</button>
                            </div>
                        ))}
                        {experts.length === 0 && !loading && <p style={{ opacity: 0.5, textAlign: 'center' }}>No experts available.</p>}
                    </div>
                </>
            )}

            {tab === 'history' && (
                <>
                    <h3 style={S.sectionTitle}>Call History</h3>
                    <div style={{ padding: '0 20px' }}>
                        {user?.recentCalls?.map(c => (
                            <div key={c.id} style={S.expertCard}>
                                <div>📞</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{c.expert?.name || 'Expert'}</div>
                                    <div style={{ fontSize: 12, opacity: 0.6 }}>{new Date(c.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#f87171', fontWeight: 600 }}>-₹{c.cost}</div>
                                    <div style={{ fontSize: 11, opacity: 0.6 }}>{c.duration}s</div>
                                </div>
                            </div>
                        ))}
                        {(!user?.recentCalls?.length) && <p style={{ opacity: 0.5, textAlign: 'center' }}>No recent calls</p>}
                    </div>
                </>
            )}

            {tab === 'wallet' && (
                <>
                    <h3 style={S.sectionTitle}>Transactions</h3>
                    <div style={{ padding: '0 20px' }}>
                        {user?.recentTransactions?.map(t => (
                            <div key={t.id} style={S.expertCard}>
                                <div>{t.type === 'credit' ? '⬇️' : '⬆️'}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{t.description || 'Transaction'}</div>
                                    <div style={{ fontSize: 12, opacity: 0.6 }}>{new Date(t.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div style={{ color: t.type === 'credit' ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                                    {t.type === 'credit' ? '+' : '-'}₹{t.amount}
                                </div>
                            </div>
                        ))}
                        {(!user?.recentTransactions?.length) && <p style={{ opacity: 0.5, textAlign: 'center' }}>No transactions</p>}
                    </div>
                </>
            )}

            {/* Bottom Nav */}
            <div style={S.bottomNav}>
                <div onClick={() => setTab('experts')} style={{ opacity: tab === 'experts' ? 1 : 0.5, textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ fontSize: 20 }}>🎧</div>
                    <div style={{ fontSize: 10 }}>Experts</div>
                </div>
                <div onClick={() => navigate('/')} style={{ opacity: 0.5, textAlign: 'center', cursor: 'pointer', transform: 'translateY(-15px)', background: '#06b6d4', width: 50, height: 50, borderRadius: 25, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(6,182,212,0.5)' }}>
                    <div style={{ fontSize: 24, color: '#fff' }}>🤖</div>
                </div>
                <div onClick={() => setTab('history')} style={{ opacity: tab === 'history' ? 1 : 0.5, textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ fontSize: 20 }}>🕒</div>
                    <div style={{ fontSize: 10 }}>History</div>
                </div>
                <div onClick={() => setTab('wallet')} style={{ opacity: tab === 'wallet' ? 1 : 0.5, textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ fontSize: 20 }}>💰</div>
                    <div style={{ fontSize: 10 }}>Wallet</div>
                </div>
            </div>
        </div>
    );
}
