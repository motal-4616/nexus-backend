const SibApiV3Sdk = require("../config/brevo");

const sendOTPEmail = async (email, otp) => {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { name: "Nexus", email: "xmeosadx@gmail.com" };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = "Your Nexus password reset code";
    sendSmtpEmail.htmlContent = `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px;">
            <h2 style="color: #137fec; margin-bottom: 8px;">Password reset code</h2>
            <p style="color: #374151; line-height: 1.6;">
                You requested to reset your password. Use the code below to verify your identity.
                This code expires in <strong>15 minutes</strong>.
            </p>
            <div style="margin: 24px 0; text-align: center;">
                <span style="display: inline-block; padding: 16px 32px; background: #f3f4f6; border-radius: 12px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #137fec;">${otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} Nexus. All rights reserved.</p>
        </div>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
};

module.exports = { sendOTPEmail };
