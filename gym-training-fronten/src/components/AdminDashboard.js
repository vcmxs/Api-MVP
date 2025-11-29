import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UserProfile from './UserProfile';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');

function AdminDashboard({ token, userId, userRole }) {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);

    useEffect(() => {
        loadUsers();
        loadStats();
    }, [token]);

    const loadUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/users`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    userId,
                    userRole
                }
            });
            setUsers(response.data.users);
            setLoading(false);
        } catch (err) {
            console.error('Error loading users:', err);
            alert('Error loading users: ' + (err.response?.data?.message || err.message));
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

    const toggleSubscription = async (targetUserId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'free' : 'active';
        const action = newStatus === 'active' ? 'activate' : 'deactivate';

        if (!window.confirm(`Are you sure you want to ${action} this coach's subscription?`)) return;

        try {
            await axios.patch(
                `${API_URL}/admin/users/${targetUserId}/subscription`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert(`Subscription ${action}d successfully!`);
            loadUsers();
            loadStats();
        } catch (err) {
            alert('Error updating subscription: ' + (err.response?.data?.message || err.message));
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

    if (loading) {
        return <div className="dashboard"><h2>Loading...</h2></div>;
    }

    return (
        <div className="dashboard admin-dashboard">
            <h2>🔧 Admin Dashboard</h2>



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
                    <div className="detail-header">
                        <h3>User Details</h3>
                        <button onClick={closeUserDetails} className="btn-back">← Back to List</button>
                    </div>

                    <div className="detail-section">
                        <h4>Profile Information</h4>

                        {/* Profile Picture */}
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
                                    <div><strong>Status:</strong> <span className={`status-badge status-${userDetails.subscriptionStatus}`}>{userDetails.subscriptionStatus}</span></div>
                                    <div><strong>Tier:</strong> {userDetails.subscriptionTier}</div>
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
                        {userDetails.role === 'coach' && (
                            <button
                                onClick={() => toggleSubscription(userDetails.id, userDetails.subscriptionStatus)}
                                className={userDetails.subscriptionStatus === 'active' ? 'btn-deactivate' : 'btn-activate'}
                            >
                                {userDetails.subscriptionStatus === 'active' ? '🔒 Deactivate Subscription' : '✅ Activate Subscription'}
                            </button>
                        )}
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
                                    <th>Subscription</th>
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
                                            <span className={`status-badge status-${user.subscriptionStatus}`}>
                                                {user.subscriptionStatus}
                                            </span>
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
        </div>
    );
}

export default AdminDashboard;

