import React from 'react';

const PrivacyPolicy = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', color: '#ccc', lineHeight: '1.6' }}>
            <h1 style={{ color: '#00ffff' }}>Privacy Policy</h1>
            <p><strong>Effective Date:</strong> January 1, 2024</p>

            <h2>1. Introduction</h2>
            <p>Welcome to Dupla. We are committed to protecting your personal information and your right to privacy.</p>

            <h2>2. Information We Collect</h2>
            <p>We collect personal information that you voluntarily provide to us when you register on the application, including:</p>
            <ul>
                <li>Name and Email Address</li>
                <li>Health Data (Weight, Height, Age)</li>
                <li>Workout Data and History</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use your personal information to:</p>
            <ul>
                <li>Create and manage your account.</li>
                <li>Enable your coach to create personalized workout plans.</li>
                <li>Track your fitness progress.</li>
            </ul>

            <h2>4. Data Deletion</h2>
            <p>You have the right to request deletion of your account and all associated data. You can do this within the app settings or via our <a href="/delete-account" style={{ color: '#00ffff' }}>web deletion form</a>.</p>

            <h2>5. Contact Us</h2>
            <p>If you have any questions about this privacy policy, please contact us at support@dupla.fit.</p>
        </div>
    );
};

export default PrivacyPolicy;
