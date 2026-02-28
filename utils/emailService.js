const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    requireTLS: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Sends a 6-digit verification code to the registered email address.
 * @param {string} toEmail 
 * @param {string} pin 
 */
const sendVerificationEmail = async (toEmail, pin) => {
    try {
        const mailOptions = {
            from: `"Dupla App" <${process.env.EMAIL_USER}>`,
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
        };

        // Wrap in a Promise with a timeout to prevent silent hangs in production
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("SMTP Connection Timeout"));
            }, 10000);

            transporter.sendMail(mailOptions, (error, info) => {
                clearTimeout(timeout);
                if (error) {
                    reject(error);
                } else {
                    resolve(info);
                }
            });
        });

        console.log(`Verification email sent to ${toEmail}`);
    } catch (error) {
        console.error('Error sending verification email:', error);
        // We throw the error so the controller knows it failed, 
        // but the controller itself should catch it and continue the registration.
        throw error;
    }
};

/**
 * Sends a 6-digit reset code to recover a forgotten password.
 * @param {string} toEmail 
 * @param {string} pin 
 */
const sendPasswordResetEmail = async (toEmail, pin) => {
    try {
        const mailOptions = {
            from: `"Dupla App Support" <${process.env.EMAIL_USER}>`,
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
        };

        // Wrap in a Promise with a timeout to prevent silent hangs in production
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("SMTP Connection Timeout"));
            }, 10000);

            transporter.sendMail(mailOptions, (error, info) => {
                clearTimeout(timeout);
                if (error) {
                    reject(error);
                } else {
                    resolve(info);
                }
            });
        });

        console.log(`Password reset email sent to ${toEmail}`);
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};
