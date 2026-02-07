import React from 'react';

function SubscriptionBlocked({ onLogout, reason = 'subscription' }) {
    const isBlocked = reason === 'blocked';
    const isTraineeExpired = reason === 'trainee_subscription';

    return (
        <div className="subscription-blocked">
            <div className="blocked-content">
                <div className="blocked-icon">🔒</div>
                <h2>{isBlocked ? 'Account Blocked' : 'Subscription Inactive'}</h2>
                <p>
                    {isBlocked
                        ? 'Your account has been blocked by an administrator.'
                        : isTraineeExpired
                            ? 'Please pay your coach to activate your subscription.'
                            : 'Your subscription has been deactivated by an administrator.'}
                </p>
                <p>Please contact {isTraineeExpired ? 'your coach' : 'support'} to {isBlocked ? 'unblock' : 'reactivate'} your account.</p>
                <button onClick={onLogout} className="btn-primary">
                    Logout
                </button>
            </div>
        </div>
    );
}

export default SubscriptionBlocked;
