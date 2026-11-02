import nodemailer from 'nodemailer';
import { generateApprovalToken } from './tokenService';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface RequisitionNotificationParams {
  ticketId: string;
  materialName: string;
  block: string;
  quantity: number;
  totalEur: number;
  overrunPct: number;
  approverEmail: string;
  approverName?: string;
}

export async function sendApprovalEmail(params: RequisitionNotificationParams) {
  const {
    ticketId,
    materialName,
    block,
    quantity,
    totalEur,
    overrunPct,
    approverEmail,
    approverName = 'Farhad Mokhtari',
  } = params;

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  const approveToken = generateApprovalToken({
    requisition_id: ticketId,
    approver_email: approverEmail,
    action: 'APPROVE',
  });

  const rejectToken = generateApprovalToken({
    requisition_id: ticketId,
    approver_email: approverEmail,
    action: 'REJECT',
  });

  const approveUrl = `${baseUrl}/api/approve?token=${approveToken}`;
  const rejectUrl = `${baseUrl}/api/approve?token=${rejectToken}`;

  const isOverrun = overrunPct > 5.0;
  const overrunBadgeColor = isOverrun ? '#e11d48' : '#10b981';

  const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Satınalma Talep Onayı - Caesar Governance</title>
</head>
<body style="margin: 0; padding: 0; background-color: #05080f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <div style="width: 100%; max-width: 600px; margin: 30px auto; background-color: #090d16; border: 1px solid #f59e0b; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
    
    <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(9, 13, 22, 0.95) 100%); padding: 28px 24px; text-align: center; border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
      <div style="display: inline-block; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #f59e0b; margin-bottom: 10px;">
        AFIK GROUP &bull; CAESAR RESORT &amp; SPA
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: 0.05em; text-transform: uppercase;">
        SATINALMA ONAY TALEBİ
      </h1>
      <div style="font-size: 12px; font-weight: 700; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
        EXECUTIVE PURCHASE REQUISITION AUTHORIZATION
      </div>
    </div>

    <div style="padding: 28px 24px;">
      <p style="margin-top: 0; font-size: 14px; color: #cbd5e1; line-height: 1.6;">
        Sayın <strong>${approverName}</strong>,<br>
        Şantiye operasyonları kapsamında onayınızı bekleyen yeni bir satınalma talebi alt-deftere kaydedilmiştir:
      </p>

      <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin: 20px 0; font-size: 13px; background-color: #0d1322; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #94a3b8;">Talep Kodu / Ticket ID</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); font-weight: 700; color: #ffffff; text-align: right; font-family: monospace;">${ticketId}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #94a3b8;">Şantiye / Blok</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); font-weight: 700; color: #f59e0b; text-align: right; text-transform: uppercase;">${block}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #94a3b8;">Malzeme Kalemi</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); font-weight: 600; color: #ffffff; text-align: right;">${materialName} (${quantity} adet)</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #94a3b8;">Bütçe Sapması / Variance</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); font-weight: 800; color: ${overrunBadgeColor}; text-align: right;">+${overrunPct.toFixed(1)}%</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #94a3b8;">Toplam Taahhüt / Total EUR</td>
          <td style="padding: 12px 16px; font-weight: 900; color: #10b981; font-size: 16px; text-align: right;">€${totalEur.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>

      <div style="margin: 32px 0 20px 0; text-align: center;">
        <table style="margin: 0 auto; border-collapse: separate; border-spacing: 12px 0;">
          <tr>
            <td>
              <a href="${approveUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 14px 24px; border-radius: 10px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);">
                ✓ TALEBİ ONAYLA (APPROVE)
              </a>
            </td>
            <td>
              <a href="${rejectUrl}" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 14px 24px; border-radius: 10px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.35);">
                ✕ REDDET (REJECT)
              </a>
            </td>
          </tr>
        </table>
      </div>

      <p style="text-align: center; font-size: 11px; color: #64748b; margin-top: 16px;">
        Güvenlik: Bu bağlantılar HMAC-SHA256 ile imzalanmıştır ve 72 saat geçerlidir.<br>
        Giriş yapmadan tek tıkla onaylama/reddetme imkanı sunar.
      </p>
    </div>

    <div style="background-color: #05080f; padding: 14px 24px; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center; font-size: 11px; color: #475569;">
      Caesar Resort &amp; Spa Sub-Ledger System &bull; Automated Governance Dispatcher
    </div>
  </div>
</body>
</html>`;

  return await transporter.sendMail({
    from: `"Caesar Governance Dispatcher" <${process.env.GMAIL_USER}>`,
    to: approverEmail,
    subject: `[ONAY TALEBİ] ${ticketId} — €${totalEur.toLocaleString('en-US')} (${materialName})`,
    html: htmlContent,
  });
}
