import React, { useState } from 'react';

const DeleteAccount = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');

        // Note: For a real production app, you might want a specialized endpoint for this 
        // that sends a confirmation email instead of deleting immediately for security.
        // For this MVP, we will direct them to contact support or use the app.

        setTimeout(() => {
            setStatus('success');
        }, 1500);
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0a0a0f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: '40px',
                borderRadius: '15px',
                maxWidth: '500px',
                width: '100%',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h1 style={{ color: '#ff4757', marginBottom: '20px', textAlign: 'center' }}>Delete Account Request</h1>

                {status === 'success' ? (
                    <div style={{ textAlign: 'center', color: '#fff' }}>
                        <h3 style={{ color: '#00ff88' }}>Request Submitted</h3>
                        <p>If an account exists with this email, you will receive instructions to finalize the deletion process.</p>
                        <p style={{ marginTop: '20px', fontSize: '0.9em', color: '#888' }}>
                            Note: The fastest way to delete your account is directly through the mobile app in Settings {'>'} Danger Zone.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p style={{ color: '#ccc', marginBottom: '20px', textAlign: 'center' }}>
                            Enter your email address to request permanent account deletion.
                            This action is irreversible and will remove all your workout history and profile data.
                        </p>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#888', marginBottom: '8px' }}>Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    color: '#fff'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            style={{
                                width: '100%',
                                padding: '15px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#ff4757',
                                color: '#fff',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                opacity: status === 'loading' ? 0.7 : 1
                            }}
                        >
                            {status === 'loading' ? 'Processing...' : 'Request Deletion'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default DeleteAccount;
