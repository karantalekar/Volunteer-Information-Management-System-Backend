import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const RESEND_API_URL = "https://api.resend.com/emails";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, "../../public/App_Logo.png");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sendWithGmail = async ({ to, subject, html, replyTo, attachments }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS are not configured");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    connectionTimeout: 60000,
    greetingTimeout: 60000,
    socketTimeout: 60000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter.sendMail({
    from: `"NayePankh Foundation" <${process.env.EMAIL_USER}>`,
    to,
    replyTo,
    subject,
    html,
    attachments,
  });
};

const sendWithResend = async ({ to, subject, html, replyTo }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  let response;

  try {
    response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "NayePankh Foundation <onboarding@resend.dev>",
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
  } catch (error) {
    throw new Error(
      `Could not connect to Resend API: ${error.message || "network error"}`,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Unable to send email");
  }

  return data;
};

const sendEmail = async (mailOptions) => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return sendWithGmail(mailOptions);
  }

  return sendWithResend(mailOptions);
};

const buildConfirmationEmail = ({ cleanName, cleanSubject, cleanMessage }) => {
  const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const eventsUrl = `${appUrl}/events`;
  const volunteerUrl = `${appUrl}/register-volunteer`;
  const donateUrl = `${appUrl}/donate`;

  return `
    <div style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#111827">
      <div style="max-width:640px;margin:0 auto;padding:28px 16px">
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden">
          <div style="padding:28px;background:#2563eb;color:#ffffff;text-align:center">
            <img src="cid:app-logo" alt="NayePankh Foundation" width="76" height="76" style="display:block;margin:0 auto 14px;border-radius:14px;background:#ffffff" />
            <p style="margin:0 0 6px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#dbeafe">Message received</p>
            <h1 style="margin:0;font-size:26px;line-height:1.25">Thank you, ${cleanName}</h1>
            <p style="margin:10px auto 0;max-width:460px;color:#dbeafe;font-size:15px;line-height:1.6">
              Our team has received your message and will respond within 24 hours.
            </p>
          </div>

          <div style="padding:26px">
            <div style="padding:16px;border-radius:14px;background:#f8fafc;border:1px solid #e5e7eb">
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Your message topic</p>
              <p style="margin:0 0 14px;font-size:17px;font-weight:700;color:#111827">${cleanSubject}</p>
              <div style="padding:14px;border-left:4px solid #16a34a;background:#f0fdf4;border-radius:10px;color:#374151;line-height:1.6">
                ${cleanMessage}
              </div>
            </div>

            <div style="margin-top:22px;display:block">
              <a href="${eventsUrl}" style="display:inline-block;margin:0 8px 10px 0;padding:12px 16px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px">Browse Events</a>
              <a href="${volunteerUrl}" style="display:inline-block;margin:0 8px 10px 0;padding:12px 16px;border-radius:10px;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px">Become a Volunteer</a>
              <a href="${donateUrl}" style="display:inline-block;margin:0 0 10px 0;padding:12px 16px;border-radius:10px;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px">Support a Program</a>
            </div>

            <div style="margin-top:18px;display:grid;gap:10px">
              <div style="padding:12px;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-size:14px">
                <strong>Next step:</strong> Keep an eye on your inbox for a reply from our coordination team.
              </div>
              <div style="padding:12px;border-radius:12px;background:#fff7ed;color:#c2410c;font-size:14px">
                <strong>Tip:</strong> You can reply directly to our follow-up email with extra details or documents.
              </div>
            </div>
          </div>

          <div style="padding:18px 26px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-align:center">
            Warmly,<br />
            <strong style="color:#111827">NayePankh Foundation Team</strong>
          </div>
        </div>
      </div>
    </div>
  `;
};

export const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required",
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const cleanName = escapeHtml(name.trim());
    const cleanEmail = escapeHtml(email.trim().toLowerCase());
    const cleanSubject = escapeHtml((subject || "Contact form message").trim());
    const cleanMessage = escapeHtml(message.trim()).replace(/\n/g, "<br />");
    const adminEmail =
      process.env.EMAIL_USER ||
      process.env.CONTACT_ADMIN_EMAIL ||
      "info@nayepankh.org";

    try {
      await sendEmail({
        to: adminEmail,
        replyTo: email,
        subject: `NayePankh Contact - ${name}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
            <h2>New contact form submission</h2>
            <p><strong>Name:</strong> ${cleanName}</p>
            <p><strong>Email:</strong> ${cleanEmail}</p>
            <p><strong>Subject:</strong> ${cleanSubject}</p>
            <p><strong>Message:</strong></p>
            <div style="padding:12px;border-left:4px solid #2563eb;background:#f3f4f6">
              ${cleanMessage}
            </div>
          </div>
        `,
      });
    } catch (error) {
      throw new Error(`Admin email failed: ${error.message}`);
    }

    try {
      await sendEmail({
        to: email,
        subject: "We received your message - NayePankh Foundation",
        html: buildConfirmationEmail({
          cleanName,
          cleanSubject,
          cleanMessage,
        }),
        attachments: [
          {
            filename: "App_Logo.png",
            path: logoPath,
            cid: "app-logo",
          },
        ],
      });
    } catch (error) {
      throw new Error(`User confirmation email failed: ${error.message}`);
    }

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Unable to send message",
    });
  }
};
