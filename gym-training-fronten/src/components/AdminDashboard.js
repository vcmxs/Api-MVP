import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, BASE_URL } from '../config/api';

function AdminDashboard({ token, userId, userRole }) {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [activeTab, setActiveTab] = useState('users');
    const [referralStats, setReferralStats] = useState(null);
    const [earnings, setEarnings] = useState([]);

    useEffect(() => {
        loadUsers();
        loadStats();
        if (activeTab === 'referrals') {
            loadReferralStats();
            loadEarnings();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, activeTab]);

    const loadUsers = async () => {
        if (activeTab !== 'users') return;
        try {
            const response = await axios.get(`${API_URL}/admin/users`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setUsers(response.data.users);
            setLoading(false);
        } catch (err) {
            console.error('Error loading users:', err);
            // alert('Error loading users: ' + (err.response?.data?.message || err.message));
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data.stats);
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    };

    const loadReferralStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/referrals/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReferralStats(response.data);
        } catch (err) {
            console.error('Error loading referral stats:', err);
        }
    };

    const loadEarnings = async () => {
        try {
            const response = await axios.get(`${API_URL}/referrals/admin/earnings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEarnings(response.data);
        } catch (err) {
            console.error('Error loading earnings:', err);
        }
    };

    const markAsPaid = async (earningId) => {
        if (!window.confirm('Mark this commission as PAID?')) return;
        try {
            await axios.patch(
                `${API_URL}/referrals/admin/earnings/${earningId}/status`,
                { status: 'paid' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            loadEarnings(); // Refresh list
            loadReferralStats(); // Refresh totals
            alert('Status updated!');
        } catch (err) {
            alert('Error updating status: ' + (err.response?.data?.message || err.message));
        }
    };



    const viewUserDetails = async (targetUserId) => {
        try {
            const response = await axios.get(
                `${API_URL}/admin/users/${targetUserId}/details`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUserDetails(response.data.user);
            setSelectedUser(targetUserId);
        } catch (err) {
            alert('Error loading user details: ' + (err.response?.data?.message || err.message));
        }
    };

    const closeUserDetails = () => {
        setSelectedUser(null);
        setUserDetails(null);
    };

    const [isEditingPlan, setIsEditingPlan] = useState(false);
    const [newPlan, setNewPlan] = useState('starter');

    const savePlanChange = async () => {
        try {
            await axios.patch(
                `${API_URL}/admin/users/${selectedUser}/subscription`,
                { tier: newPlan, status: 'active' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Subscription updated successfully!');
            setIsEditingPlan(false);
            viewUserDetails(selectedUser); // Refresh details
            loadUsers(); // Refresh main list
        } catch (err) {
            alert('Error updating plan: ' + (err.response?.data?.message || err.message));
        }
    };

    const blockUser = async (targetUserId, currentStatus) => {
        const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
        const action = newStatus === 'blocked' ? 'block' : 'unblock';

        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await axios.patch(
                `${API_URL}/admin/users/${targetUserId}/block`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert(`User ${action}ed successfully!`);
            loadUsers();
            if (selectedUser === targetUserId) {
                closeUserDetails();
            }
        } catch (err) {
            alert('Error updating user status: ' + (err.response?.data?.message || err.message));
        }
    };

    const deleteUser = async (targetUserId) => {
        if (!window.confirm('Are you sure you want to DELETE this user? This action cannot be undone!')) return;

        try {
            await axios.delete(
                `${API_URL}/admin/users/${targetUserId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('User deleted successfully!');
            loadUsers();
            loadStats();
            if (selectedUser === targetUserId) {
                closeUserDetails();
            }
        } catch (err) {
            alert('Error deleting user: ' + (err.response?.data?.message || err.message));
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getPlanColor = (tier) => {
        const colors = {
            starter: '#a0a0a0',
            bronze: '#cd7f32',
            silver: '#c0c0c0',
            gold: '#ffd700',
            olympian: '#85a9f7ff'
        };
        return colors[tier?.toLowerCase()] || '#a0a0a0';
    };

    if (loading && activeTab === 'users') {
        return <div className="dashboard"><h2>Loading...</h2></div>;
    }

    return (
        <div className="dashboard admin-dashboard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>🔧 Admin Dashboard</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`btn-${activeTab === 'users' ? 'primary' : 'secondary'}`}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('referrals')}
                        className={`btn-${activeTab === 'referrals' ? 'primary' : 'secondary'}`}
                    >
                        Referrals
                    </button>
                </div>
            </div>

            {activeTab === 'users' && (
                <>
                    {stats && (
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>{stats.total_users}</h3>
                                <p>Total Users</p>
                            </div>
                            <div className="stat-card">
                                <h3>{stats.total_coaches}</h3>
                                <p>Coaches</p>
                            </div>
                            <div className="stat-card">
                                <h3>{stats.total_trainees}</h3>
                                <p>Trainees</p>
                            </div>
                            <div className="stat-card">
                                <h3>{stats.total_admins}</h3>
                                <p>Admins</p>
                            </div>
                            <div className="stat-card">
                                <h3>{stats.active_subscriptions}</h3>
                                <p>Active Subscriptions</p>
                            </div>
                            <div className="stat-card">
                                <h3>{stats.free_users}</h3>
                                <p>Free Users</p>
                            </div>
                        </div>
                    )}

                    {selectedUser && userDetails ? (
                        <div className="user-details-panel">
                            {/* ... (User Details Logic remains same) ... */}
                            {/* To save tokens, I'm just re-rendering the user details panel structure roughly or relying on context match. 
                                Actually, I should use the exact content if I use ReplaceFileContent.
                                Since I am replacing the entire return block, I MUST provide the full valid JSX.
                             */}
                            <div className="detail-header">
                                <h3>User Details</h3>
                                <button onClick={closeUserDetails} className="btn-back">← Back to List</button>
                            </div>

                            <div className="detail-section">
                                <h4>Profile Information</h4>
                                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                    <img
                                        src={userDetails.profile_pic_url ? `${BASE_URL}${userDetails.profile_pic_url}` : 'https://via.placeholder.com/150'}
                                        alt={userDetails.name}
                                        className="profile-pic"
                                    />
                                </div>
                                <div className="profile-info-grid">
                                    <div><strong>Name:</strong> {userDetails.name}</div>
                                    <div><strong>Email:</strong> {userDetails.email}</div>
                                    <div><strong>Role:</strong> <span className={`role-badge role-${userDetails.role}`}>{userDetails.role}</span></div>
                                    <div><strong>Status:</strong> <span className={`status-badge status-${userDetails.status}`}>{userDetails.status}</span></div>
                                    <div><strong>Age:</strong> {userDetails.age || 'N/A'}</div>
                                    <div><strong>Sex:</strong> {userDetails.sex || 'N/A'}</div>
                                    <div><strong>Phone:</strong> {userDetails.phone || 'N/A'}</div>
                                    <div><strong>Gym:</strong> {userDetails.gym || 'N/A'}</div>
                                    <div><strong>Created:</strong> {formatDate(userDetails.createdAt)}</div>
                                </div>
                                {userDetails.notes && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <strong>Notes:</strong> <p>{userDetails.notes}</p>
                                    </div>
                                )}
                            </div>

                            {userDetails.role === 'coach' && (
                                <>
                                    <div className="detail-section">
                                        <h4>Subscription Information</h4>
                                        <div className="profile-info-grid">
                                            <div>
                                                <strong>Tier:</strong>
                                                {isEditingPlan ? (
                                                    <div style={{ display: 'inline-flex', gap: '5px', marginLeft: '5px' }}>
                                                        <select
                                                            value={newPlan}
                                                            onChange={(e) => setNewPlan(e.target.value)}
                                                            className="plan-selector"
                                                        >
                                                            <option value="starter">STARTER</option>
                                                            <option value="bronze">BRONZE</option>
                                                            <option value="silver">SILVER</option>
                                                            <option value="gold">GOLD</option>
                                                            <option value="olympian">OLYMPIAN</option>
                                                        </select>
                                                        <button onClick={savePlanChange} style={{ background: '#00C851', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>💾</button>
                                                        <button onClick={() => setIsEditingPlan(false)} style={{ background: '#ff4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>❌</button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span style={{ color: getPlanColor(userDetails.subscriptionTier), fontWeight: 'bold' }}>
                                                            {(userDetails.subscriptionTier || 'STARTER').toUpperCase()}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setNewPlan(userDetails.subscriptionTier || 'starter');
                                                                setIsEditingPlan(true);
                                                            }}
                                                            style={{
                                                                marginLeft: '10px', background: 'none', border: 'none',
                                                                cursor: 'pointer', fontSize: '1rem'
                                                            }}
                                                            title="Edit Plan"
                                                        >
                                                            ✏️
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            <div><strong>Activated:</strong> {formatDate(userDetails.subscriptionStartDate)}</div>
                                        </div>
                                    </div>
                                    <div className="detail-section">
                                        <h4>Trainees ({userDetails.traineeCount || 0})</h4>
                                        {userDetails.trainees && userDetails.trainees.length > 0 ? (
                                            <div className="trainees-list-admin">
                                                {userDetails.trainees.map(trainee => (
                                                    <div key={trainee.id} className="trainee-item-admin">
                                                        <span>{trainee.name}</span>
                                                        <span className="trainee-email">{trainee.email}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="no-data">No trainees assigned</p>
                                        )}
                                    </div>
                                </>
                            )}
                            {userDetails.role === 'trainee' && userDetails.assignedCoach && (
                                <div className="detail-section">
                                    <h4>Assigned Coach</h4>
                                    <div className="profile-info-grid">
                                        <div><strong>Name:</strong> {userDetails.assignedCoach.name}</div>
                                        <div><strong>Email:</strong> {userDetails.assignedCoach.email}</div>
                                    </div>
                                </div>
                            )}

                            <div className="detail-actions">
                                <button
                                    onClick={() => blockUser(userDetails.id, userDetails.status)}
                                    className={userDetails.status === 'blocked' ? 'btn-unblock' : 'btn-block'}
                                >
                                    {userDetails.status === 'blocked' ? '🔓 Unblock User' : '🔒 Block User'}
                                </button>
                                <button
                                    onClick={() => deleteUser(userDetails.id)}
                                    className="btn-delete"
                                >
                                    🗑️ Delete User
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="users-section">
                            <h3>All Users ({users.length})</h3>
                            <div className="table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Plan</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(user => (
                                            <tr key={user.id}>
                                                <td>{user.id}</td>
                                                <td>{user.name}</td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <span className={`role-badge role-${user.role}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge status-${user.status}`}>
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {user.role === 'coach' ? (
                                                        <span style={{ color: getPlanColor(user.subscriptionTier), fontWeight: 'bold' }}>
                                                            {(user.subscriptionTier || 'STARTER').toUpperCase()}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#888' }}>-</span>
                                                    )}
                                                </td>
                                                <td>{formatDate(user.createdAt)}</td>
                                                <td className="action-buttons">
                                                    <button
                                                        onClick={() => viewUserDetails(user.id)}
                                                        className="btn-view"
                                                    >
                                                        👁️ View
                                                    </button>
                                                    <button
                                                        onClick={() => blockUser(user.id, user.status)}
                                                        className={user.status === 'blocked' ? 'btn-unblock' : 'btn-block'}
                                                    >
                                                        {user.status === 'blocked' ? '🔓' : '🔒'}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteUser(user.id)}
                                                        className="btn-delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'referrals' && referralStats && (
                <div className="referrals-dashboard">
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#00f2ff' }}>Global Referral Stats</h3>
                        <div className="stats-grid">
                            <div className="stat-card" style={{ border: '1px solid #00f2ff' }}>
                                <h3>{referralStats.totalReferrals}</h3>
                                <p>Total Referred Users</p>
                            </div>

                            {/* Calculate earnings totals */}
                            {(() => {
                                const pending = referralStats.earningsByStatus?.find(s => s.status === 'pending') || { count: 0, total: 0 };
                                const paid = referralStats.earningsByStatus?.find(s => s.status === 'paid') || { count: 0, total: 0 };
                                return (
                                    <>
                                        <div className="stat-card" style={{ border: '1px solid orange' }}>
                                            <h3>${Number(pending.total).toFixed(2)}</h3>
                                            <p>Pending Commissions ({pending.count})</p>
                                        </div>
                                        <div className="stat-card" style={{ border: '1px solid #00C851' }}>
                                            <h3>${Number(paid.total).toFixed(2)}</h3>
                                            <p>Paid Commissions ({paid.count})</p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="top-referrers">
                        <h3>🏆 Top Referrers</h3>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Referrals</th>
                                        <th>Total Earnings</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {referralStats.topReferrers?.map((ref, idx) => (
                                        <tr key={idx}>
                                            <td>{ref.name}</td>
                                            <td>{ref.email}</td>
                                            <td style={{ fontWeight: 'bold', color: '#00f2ff' }}>{ref.referral_count}</td>
                                            <td style={{ fontWeight: 'bold', color: '#00C851' }}>${Number(ref.total_earnings).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {(!referralStats.topReferrers || referralStats.topReferrers.length === 0) && (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No referral activity yet</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="payouts-management" style={{ marginTop: '2rem' }}>
                        <h3>💰 Commission Payouts Management</h3>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Coach (Referrer)</th>
                                        <th>From User</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {earnings.map(earning => (
                                        <tr key={earning.id}>
                                            <td>{formatDate(earning.created_at)}</td>
                                            <td>
                                                <div>{earning.referrer_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#888' }}>{earning.referrer_email}</div>
                                            </td>
                                            <td>{earning.referred_name}</td>
                                            <td style={{ fontWeight: 'bold', color: '#00C851' }}>${Number(earning.amount).toFixed(2)}</td>
                                            <td>
                                                <span className={`status-badge status-${earning.status === 'paid' ? 'active' : 'pending'}`}
                                                    style={{
                                                        backgroundColor: earning.status === 'paid' ? 'rgba(0, 200, 81, 0.2)' : 'rgba(255, 136, 0, 0.2)',
                                                        color: earning.status === 'paid' ? '#00C851' : '#FF8800',
                                                        border: `1px solid ${earning.status === 'paid' ? '#00C851' : '#FF8800'}`
                                                    }}>
                                                    {earning.status === 'pending' ? '⏳ Pending' : '✅ Paid'}
                                                </span>
                                            </td>
                                            <td>
                                                {earning.status === 'pending' && (
                                                    <button
                                                        onClick={() => markAsPaid(earning.id)}
                                                        className="btn-success"
                                                        style={{ padding: '5px 10px', fontSize: '0.9rem' }}
                                                    >
                                                        Mark as Paid
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {earnings.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No commission records found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;

