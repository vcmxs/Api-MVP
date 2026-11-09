const { Resend } = require('resend');

// Use our new verified custom domain!
const FROM_EMAIL = 'no-reply@duplapp.win';

let resend = null;

/**
 * Lazily create the Resend client.
 *
 * The Resend constructor throws when it has no API key, and this module is
 * required by the auth controller while the server boots. Building the client at
 * import time therefore crashed the whole API whenever `RESEND_API_KEY` was
 * missing, which the browser could only report as "Failed to fetch" on every
 * request (dashboard included).
 */
const getResend = () => {
    if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
    return resend;
};

/**
 * Sends a payload through Resend, or logs it in local development when no
 * `RESEND_API_KEY` is configured so signup/reset flows stay testable offline.
 * Production without a key still fails loudly.
 */
const sendWithFallback = async (payload) => {
    if (!process.env.RESEND_API_KEY) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('RESEND_API_KEY is not configured on the server');
        }
        console.warn(
            `[emailService] RESEND_API_KEY is not set — "${payload.subject}" to ${payload.to} was NOT sent. Payload:\n${payload.html}`
        );
        return { data: { id: 'not-sent-dev' }, error: null };
    }
    return getResend().emails.send(payload);
};

/**
 * Sends a 6-digit verification code to the registered email address.
 * @param {string} toEmail 
 * @param {string} pin 
 */
const sendVerificationEmail = async (toEmail, pin) => {
    try {
        const { data, error } = await sendWithFallback({
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

        console.log(`Verification email handled for ${toEmail}. ID:`, data?.id);
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
        const { data, error } = await sendWithFallback({
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

        console.log(`Password reset email handled for ${toEmail}. ID:`, data?.id);
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
        const { data, error } = await sendWithFallback({
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

        console.log(`Delete account email handled for ${toEmail}. ID:`, data?.id);
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
