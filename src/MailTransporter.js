import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email templates
export const emailTemplates = {
  registration: (name, tempPassword) => ({
    subject: "SKY CRM - Your Account Has Been Created",
    html: `
      <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow:auto; line-height:1.6; background-color: #f7f7f7; padding: 20px 0;">
        <div style="margin: 50px auto; width: 70%; padding: 20px; background-color: #ffffff; border-radius: 8px;">
          <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">
            <a href="#" style="font-size: 1.4em; color: #00466a; text-decoration: none; font-weight: 600;">
              SKY CRM
            </a>
          </div>
          <p style="font-size: 1.1em; margin-bottom: 10px;">Hello ${name},</p>
          <p style="margin-bottom: 15px;">
            Your account has been created by the admin. 
            Your temporary password is:
            <b style="font-weight: 600; color: #00466a;">${tempPassword}</b>
          </p>
          <p style="margin-bottom: 20px;">
            Please 
            <a href="${process.env.VITE_API_URL || "http://localhost:5173"}" style="color: #00466a; text-decoration: underline;">login</a> 
            and change your password immediately.
          </p>
          <p style="font-size: 0.9em; color: #555;">
            Regards,<br />
            SKY CRM Team
          </p>
          <hr style="border:none; border-top:1px solid #eee; margin: 20px 0;" />
          <div style="float:right; padding: 8px 0; color:#aaa; font-size:0.8em; line-height:1; font-weight:300;">
            <p>SKY CRM Inc</p>
          </div>
        </div>
      </div>
    `,
  }),

  forgotPassword: (name, resetToken, resetUrl) => ({
    subject: "SKY CRM PASSWORD RECOVERY",
    html: `
      <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
        <div style="margin:50px auto;width:70%;padding:20px 0">
          <div style="border-bottom:1px solid #eee">
            <a href="${resetUrl}" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">SKY CRM</a>
          </div>
          <p style="font-size:1.1em">Hi ${name},</p>
          <p>Use the following OTP to complete your Password Recovery. OTP is valid for 5 minutes</p>
          <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${resetToken}</h2>
          <p style="font-size:0.9em;">Regards,<br />SKY CRM</p>
          <hr style="border:none;border-top:1px solid #eee" />
          <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
            <p>SKY CRM Inc</p>
          </div>
        </div>
      </div>
    `,
  }),
};

// Wrapper function for sending emails
export const sendEmail = async (to, template, data = {}) => {
  try {
    // Add CC recipients if specified
    const cc = process.env.EMAIL_CC ? process.env.EMAIL_CC.split(",") : [];

    const emailContent = emailTemplates[template](...Object.values(data));

    const msg = {
      from: process.env.EMAIL_FROM, // verified sender in SendGrid
      to,
      cc,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    const [response] = await sgMail.send(msg);
    console.log("✅ Email sent successfully, status:", response.statusCode);
    return { success: true, statusCode: response.statusCode };
  } catch (error) {
    console.error("❌ Error sending email:");
    console.error(error.response?.body || error.message);
    throw new Error("Failed to send email via SendGrid");
  }
};

export default sendEmail;
