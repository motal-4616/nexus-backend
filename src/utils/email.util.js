const SibApiV3Sdk = require("../config/brevo");

const sendResetEmail = async (email, resetLink) => {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { name: "Nexus", email: "no-reply@nexus-app.com" };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = "Reset your Nexus password";
    sendSmtpEmail.htmlContent = `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px;">
            <h2 style="color: #137fec; margin-bottom: 8px;">Reset your password</h2>
            <p style="color: #374151; line-height: 1.6;">
                You requested to reset your password. Click the button below to create a new password.
                This link expires in <strong>15 minutes</strong>.
            </p>
            <a href="${resetLink}"
               style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #137fec; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Reset Password
            </a>
            <p style="color: #6b7280; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} Nexus. All rights reserved.</p>
        </div>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
};

module.exports = { sendResetEmail };
