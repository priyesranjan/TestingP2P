import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, DollarSign, Phone, TrendingUp, Plus, RefreshCw } from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:8003/api';
const ADMIN_KEY = 'admin_secret_change_in_production';

function App() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [coinsAmount, setCoinsAmount] = useState('');
  const [videoMinutes, setVideoMinutes] = useState('');
  const [audioMinutes, setAudioMinutes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/users`, {
          headers: { 'x-admin-key': ADMIN_KEY }
        }),
        axios.get(`${API_URL}/admin/stats`, {
          headers: { 'x-admin-key': ADMIN_KEY }
        })
      ]);
      setUsers(usersRes.data.users);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch data');
    }
    setLoading(false);
  };

  const handleAddCoins = async () => {
    if (!selectedUser || !coinsAmount) {
      alert('Please select user and enter amount');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/admin/add-coins`,
        {
          user_id: selectedUser.id,
          amount: parseInt(coinsAmount),
          admin_email: 'admin@connecto.com'
        },
        {
          headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' }
        }
      );
      alert(`Successfully added ${coinsAmount} coins to ${selectedUser.name}`);
      setCoinsAmount('');
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      console.error('Error adding coins:', error);
      alert('Failed to add coins');
    }
  };

  const handleAddMinutes = async () => {
    if (!selectedUser || (!audioMinutes && !videoMinutes)) {
      alert('Please select user and enter minutes');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/admin/add-minutes`,
        {
          user_id: selectedUser.id,
          audio_minutes: audioMinutes ? parseInt(audioMinutes) : 0,
          video_minutes: videoMinutes ? parseInt(videoMinutes) : 0,
          admin_email: 'admin@connecto.com'
        },
        {
          headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' }
        }
      );
      alert(`Successfully added minutes to ${selectedUser.name}`);
      setAudioMinutes('');
      setVideoMinutes('');
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      console.error('Error adding minutes:', error);
      alert('Failed to add minutes');
    }
  };

  const quickAddCoins = async (user, amount) => {
    try {
      await axios.post(
        `${API_URL}/admin/add-coins`,
        {
          user_id: user.id,
          amount: amount,
          admin_email: 'admin@connecto.com'
        },
        {
          headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' }
        }
      );
      alert(`Added ${amount} coins to ${user.name}`);
      fetchData();
    } catch (error) {
      alert('Failed to add coins');
    }
  };

  return (
    <div className=\"App\">
      <header className=\"header\">
        <h1>🎯 Connecto Admin Panel</h1>
        <button onClick={fetchData} className=\"refresh-btn\" disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </header>

      {stats && (
        <div className=\"stats-grid\">
          <div className=\"stat-card\">
            <Users className=\"stat-icon\" />
            <div>
              <div className=\"stat-value\">{stats.total_users}</div>
              <div className=\"stat-label\">Total Users</div>
            </div>
          </div>
          <div className=\"stat-card\">
            <DollarSign className=\"stat-icon\" />
            <div>
              <div className=\"stat-value\">{stats.total_coins}</div>
              <div className=\"stat-label\">Total Coins</div>
            </div>
          </div>
          <div className=\"stat-card\">
            <Phone className=\"stat-icon\" />
            <div>
              <div className=\"stat-value\">{stats.total_calls}</div>
              <div className=\"stat-label\">Total Calls</div>
            </div>
          </div>
          <div className=\"stat-card\">
            <TrendingUp className=\"stat-icon\" />
            <div>
              <div className=\"stat-value\">{stats.total_video_minutes}m</div>
              <div className=\"stat-label\">Video Minutes</div>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className=\"add-credits-panel\">
          <h2>Add Credits to {selectedUser.name}</h2>
          <div className=\"credits-form\">
            <div className=\"form-group\">
              <label>Coins</label>
              <input
                type=\"number\"
                value={coinsAmount}
                onChange={(e) => setCoinsAmount(e.target.value)}
                placeholder=\"Enter coins amount\"
              />
              <button onClick={handleAddCoins} className=\"btn-primary\">
                <Plus size={18} /> Add Coins
              </button>
            </div>
            <div className=\"form-group\">
              <label>Audio Minutes</label>
              <input
                type=\"number\"
                value={audioMinutes}
                onChange={(e) => setAudioMinutes(e.target.value)}
                placeholder=\"Audio minutes\"
              />
            </div>
            <div className=\"form-group\">
              <label>Video Minutes</label>
              <input
                type=\"number\"
                value={videoMinutes}
                onChange={(e) => setVideoMinutes(e.target.value)}
                placeholder=\"Video minutes\"
              />
              <button onClick={handleAddMinutes} className=\"btn-primary\">
                <Plus size={18} /> Add Minutes
              </button>
            </div>
          </div>
          <button onClick={() => setSelectedUser(null)} className=\"btn-cancel\">
            Cancel
          </button>
        </div>
      )}

      <div className=\"users-section\">
        <h2>Users Management</h2>
        <div className=\"users-table\">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Coins</th>
                <th>Audio Min</th>
                <th>Video Min</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.phone}</td>
                  <td className=\"coins\">{user.wallet?.coins || 0}</td>
                  <td>{user.wallet?.audio_minutes || 0}</td>
                  <td>{user.wallet?.video_minutes || 0}</td>
                  <td>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className=\"btn-action\"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => quickAddCoins(user, 100)}
                      className=\"btn-quick\"
                    >
                      +100
                    </button>
                    <button
                      onClick={() => quickAddCoins(user, 500)}
                      className=\"btn-quick\"
                    >
                      +500
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
