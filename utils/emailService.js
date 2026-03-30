const { Resend } = require('resend');

// Initialize Resend with the API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Use our new verified custom domain!
const FROM_EMAIL = 'no-reply@duplapp.win';

/**
 * Sends a 6-digit verification code to the registered email address.
 * @param {string} toEmail 
 * @param {string} pin 
 */
const sendVerificationEmail = async (toEmail, pin) => {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: 'Verify your Dupla Account',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; color: #333; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <img src="https://i.imgflip.com/6l3n0m.jpg" alt="Dupla Logo" style="width: 100px; height: auto; margin-bottom: 20px;" /> 
                    <h2 style="color: #0df2f2;">Welcome to Dupla!</h2>
                    <p>Thank you for signing up. Please use the following 6-digit PIN to verify your email address. It will expire in 15 minutes.</p>
                    <div style="margin: 20px 0; padding: 15px; background: #16161a; color: #0df2f2; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">
                        ${pin}
                    </div>
                    <p style="font-size: 12px; color: #888;">If you did not create an account, no further action is required.</p>
                </div>
            `
        });

        if (error) {
            console.error('Resend API returned an error:', error);
            throw error;
        }

        console.log(`Verification email sent to ${toEmail} via Resend. ID:`, data?.id);
    } catch (err) {
        console.error('Error sending verification email with Resend:', err);
        throw err;
    }
};

/**
 * Sends a 6-digit reset code to recover a forgotten password.
 * @param {string} toEmail 
 * @param {string} pin 
 */
const sendPasswordResetEmail = async (toEmail, pin) => {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: 'Reset your Dupla Password',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; color: #333; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #0df2f2;">Password Reset Request</h2>
                    <p>We received a request to reset your password. Use the PIN below to create a new password. It will expire in 15 minutes.</p>
                    <div style="margin: 20px 0; padding: 15px; background: #16161a; color: #0df2f2; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">
                        ${pin}
                    </div>
                    <p style="font-size: 12px; color: #888;">If you did not request a password reset, you can safely ignore this email.</p>
                </div>
            `
        });

        if (error) {
            console.error('Resend API returned an error:', error);
            throw error;
        }

        console.log(`Password reset email sent to ${toEmail} via Resend. ID:`, data?.id);
    } catch (err) {
        console.error('Error sending password reset email with Resend:', err);
        throw err;
    }
};

/**
 * Sends a 6-digit account deletion confirmation PIN.
 * @param {string} toEmail
 * @param {string} pin
 */
const sendDeleteAccountEmail = async (toEmail, pin) => {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: 'Confirm Account Deletion – Dupla',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; color: #333; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #ef4444;">Account Deletion Request</h2>
                    <p>We received a request to permanently delete your Dupla account. Use the PIN below to confirm. It will expire in 15 minutes.</p>
                    <div style="margin: 20px 0; padding: 15px; background: #16161a; color: #ef4444; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">
                        ${pin}
                    </div>
                    <p style="color: #ef4444; font-weight: bold;">⚠️ This action is permanent and cannot be undone.</p>
                    <p style="font-size: 12px; color: #888;">If you did not request account deletion, you can safely ignore this email. Your account will remain active.</p>
                </div>
            `
        });

        if (error) {
            console.error('Resend API returned an error:', error);
            throw error;
        }

        console.log(`Delete account email sent to ${toEmail} via Resend. ID:`, data?.id);
    } catch (err) {
        console.error('Error sending delete account email with Resend:', err);
        throw err;
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendDeleteAccountEmail
};
