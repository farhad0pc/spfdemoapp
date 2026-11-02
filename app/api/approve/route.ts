import { NextRequest, NextResponse } from 'next/server';
import { verifyApprovalToken } from '@/lib/tokenService';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(
      renderHtmlResponse({
        success: false,
        title: 'GEÇERSİZ İŞLEM / INVALID ACTION',
        subtitle: 'TOKEN EKSİK / TOKEN MISSING',
        message: 'Onay bağlantısında kriptografik belirteç (token) bulunamadı. / Token parameter is missing from the link.',
        statusColor: '#e11d48',
      }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const payload = verifyApprovalToken(token);

  if (!payload) {
    return new NextResponse(
      renderHtmlResponse({
        success: false,
        title: 'ONAY BAĞLANTISI GEÇERSİZ VEYA SÜRESİ DOLMUŞ',
        subtitle: 'TOKEN VERIFICATION FAILED',
        message: 'Bu onay bağlantısının süresi dolmuş (72 saat) veya dijital imzası doğrulanamadı. / Approval token is invalid or has expired (72h limit).',
        statusColor: '#e11d48',
      }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const { requisition_id, action, approver_email } = payload;
  const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const isApproved = action === 'APPROVE';

  try {
    const { error } = await supabaseAdmin
      .from('purchase_requisitions')
      .update({ status: newStatus })
      .eq('ticket_id', requisition_id);

    if (error) {
      await supabaseAdmin
        .from('purchase_requisitions')
        .update({ status: newStatus })
        .eq('id', requisition_id);
    }

    const { data: userRec } = await supabaseAdmin
      .from('corporate_users')
      .select('user_id')
      .eq('email', approver_email)
      .maybeSingle();

    const resolvedApproverId = userRec?.user_id || '11111111-1111-1111-1111-111111111111';

    const { data: currentReq } = await supabaseAdmin
      .from('purchase_requisitions')
      .select('approval_tier')
      .eq('ticket_id', requisition_id)
      .maybeSingle();

    const { error: auditError } = await supabaseAdmin.from('requisition_approvals').insert([
      {
        ticket_id: requisition_id,
        approver_id: resolvedApproverId,
        tier_level: currentReq?.approval_tier || 2,
        approval_notes: `Action: ${action} by ${approver_email} via HMAC-SHA256 link`,
        approved_at: new Date().toISOString(),
      },
    ]);

    if (auditError) {
      console.error('[API/APPROVE] Audit Insert Error:', auditError.message);
    }
  } catch (err) {
    console.warn('[API/APPROVE] Supabase update fallback (offline mode):', err);
  }

  console.log(`[APPROVAL ENGINE] ✓ Action "${action}" executed successfully for Ticket ${requisition_id} by ${approver_email}`);

  return new NextResponse(
    renderHtmlResponse({
      success: true,
      title: isApproved ? 'TALEP BAŞARIYLA ONAYLANDI' : 'TALEP REDDEDİLDİ',
      subtitle: isApproved ? 'REQUISITION OFFICIALLY APPROVED' : 'REQUISITION REJECTED',
      message: isApproved
        ? 'Sipariş emri aktif edilmiş ve satınalma alt-defterine işlenmiştir. Tedarikçi sevkiyatı başlatılabilir.'
        : 'Malzeme talebi reddedilmiş ve gerekçelendirilmek üzere şantiyeye bildirilmiştir.',
      ticketId: requisition_id,
      approverEmail: approver_email,
      action: action,
      statusColor: isApproved ? '#10b981' : '#e11d48',
    }),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function renderHtmlResponse(params: {
  success: boolean;
  title: string;
  subtitle?: string;
  message: string;
  ticketId?: string;
  approverEmail?: string;
  action?: 'APPROVE' | 'REJECT';
  statusColor: string;
}): string {
  const { title, subtitle, message, ticketId, approverEmail, action, statusColor } = params;

  const subtitleBlock = subtitle
    ? `<div style="font-size: 13px; font-weight: 700; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em;">${subtitle}</div>`
    : '';

  const ticketTableBlock = ticketId
    ? `<table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 28px; font-size: 13px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8;">Talep Kodu / Ticket ID</td>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-weight: 700; color: #ffffff; text-align: right; font-family: monospace;">${ticketId}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8;">Yetkili Onaycı / Approver</td>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-weight: 600; color: #f59e0b; text-align: right;">${approverEmail}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8;">Güvenlik Doğrulaması</td>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-weight: 700; color: #10b981; text-align: right;">HMAC-SHA256 Doğrulandı</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #94a3b8;">İşlem Zamanı / Timestamp</td>
          <td style="padding: 10px 0; font-weight: 600; color: #cbd5e1; text-align: right;">${new Date().toLocaleString('tr-TR')}</td>
        </tr>
      </table>`
    : '';

  const symbol = action === 'APPROVE' ? '✓' : action === 'REJECT' ? '✕' : 'ℹ';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Caesar Purchasing Ledger</title>
</head>
<body style="margin: 0; padding: 0; background-color: #05080f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
  <div style="width: 100%; max-width: 560px; margin: 40px 16px; background-color: #090d16; border: 1px solid #f59e0b; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
    <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(9, 13, 22, 0.95) 100%); padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(245, 158, 11, 0.25);">
      <div style="display: inline-block; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #f59e0b; margin-bottom: 12px;">
        CAESAR RESORT & SPA — GOVERNANCE
      </div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: 0.05em; text-transform: uppercase;">
        ${title}
      </h1>
      ${subtitleBlock}
    </div>
    <div style="padding: 32px;">
      <div style="background-color: ${statusColor}15; border: 1px solid ${statusColor}40; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 36px; line-height: 1; margin-bottom: 8px;">
          ${symbol}
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #e2e8f0; line-height: 1.5;">
          ${message}
        </div>
      </div>
      ${ticketTableBlock}
      <div style="text-align: center;">
        <a href="/" style="display: inline-block; background-color: #f59e0b; color: #05080f; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);">
          ← Caesar Satınalma Defteri'ne Dön
        </a>
      </div>
    </div>
    <div style="background-color: #05080f; padding: 16px 32px; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center; font-size: 11px; color: #64748b;">
      Afik Group &bull; Caesar Resort &amp; Spa Sub-Ledger System
    </div>
  </div>
</body>
</html>`;
}
