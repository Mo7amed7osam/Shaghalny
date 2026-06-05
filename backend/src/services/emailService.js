const nodemailer = require('nodemailer');

// Email service for sending notifications
class EmailService {
    constructor() {
        // Configure the email transporter using SMTP
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    getTransporter() {
        return nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: { rejectUnauthorized: false },
        });
    }

    async sendNewEventEmail(to, name, event) {
        if (!process.env.SMTP_USER) {
            console.log('Email skipped (SMTP not configured).');
            return;
        }
        const { title, description, date, time, location, isOnline } = event;
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const html = `
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:48px 0;">
            <tr><td align="center">
              <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);border:1px solid #e2e8f0;">
                <tr>
                  <td style="background:#1d4ed8;padding:36px 48px;text-align:left;">
                    <p style="margin:0 0 12px;color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Shaghalny Platform</p>
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">New Event Announcement</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 48px 0;">
                    <p style="margin:0 0 6px;font-size:15px;color:#0f172a;">Dear <strong>${name}</strong>,</p>
                    <p style="margin:0;font-size:14px;color:#64748b;line-height:1.8;">We are pleased to inform you that a new event has been published on the Shaghalny platform. Please find the details below.</p>
                  </td>
                </tr>
                <tr><td style="padding:24px 48px 0;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>
                <tr>
                  <td style="padding:24px 48px;">
                    <p style="margin:0 0 16px;font-size:11px;font-weight:600;color:#2563eb;letter-spacing:0.08em;text-transform:uppercase;">Event Details</p>
                    <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;font-weight:700;">${title}</h2>
                    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.8;">${description}</p>
                    <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                      <tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                        <table cellpadding="0" cellspacing="0"><tr>
                          <td style="width:20px;font-size:14px;">📅</td>
                          <td style="padding-left:10px;">
                            <span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">DATE</span>
                            <span style="font-size:14px;color:#0f172a;font-weight:600;">${formattedDate}</span>
                          </td>
                        </tr></table>
                      </td></tr>
                      <tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                        <table cellpadding="0" cellspacing="0"><tr>
                          <td style="width:20px;font-size:14px;">🕐</td>
                          <td style="padding-left:10px;">
                            <span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">TIME</span>
                            <span style="font-size:14px;color:#0f172a;font-weight:600;">${time}</span>
                          </td>
                        </tr></table>
                      </td></tr>
                      <tr><td style="padding:14px 20px;">
                        <table cellpadding="0" cellspacing="0"><tr>
                          <td style="width:20px;font-size:14px;">${isOnline ? '💻' : '📍'}</td>
                          <td style="padding-left:10px;">
                            <span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">LOCATION</span>
                            <span style="font-size:14px;color:#0f172a;font-weight:600;">${isOnline ? 'Online Event' : location}</span>
                          </td>
                        </tr></table>
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 48px 40px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events"
                       style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:6px;">
                      View Event
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;padding:20px 48px;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">This email was sent to you because you are registered as a student on <strong style="color:#64748b;">Shaghalny</strong> — the student freelancing marketplace.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>`;

        try {
            await this.getTransporter().sendMail({
                from: `"Shaghalny" <${process.env.SMTP_FROM}>`,
                to,
                subject: `New Event: ${title}`,
                html,
            });
            console.log(`Email sent to ${to}`);
        } catch (error) {
            console.error(`Error sending email to ${to}:`, error.message);
        }
    }

    // Function to send an email notification
    async sendEmail(to, subject, text) {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
            console.log(`Email skipped (SMTP not configured). Intended for ${to}: ${subject}`);
            return;
        }
        const mailOptions = {
            from: process.env.SMTP_FROM, // sender address
            to, // list of receivers
            subject, // Subject line
            text, // plain text body
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Email sent to ${to}`);
        } catch (error) {
            console.error(`Error sending email to ${to}:`, error);
        }
    }
}

module.exports = new EmailService();
