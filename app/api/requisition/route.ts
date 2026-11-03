import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { sendApprovalEmail } from '@/lib/emailService';

const slugToUuidMap: Record<string, string> = {
  "b_zeno": "66666666-6666-6666-6666-666666666660",
  "b_phuket": "66666666-6666-6666-6666-666666666661",
  "b_pattaya": "66666666-6666-6666-6666-666666666662",
  "b_samui": "66666666-6666-6666-6666-666666666663",
};

const clampNumeric = (num: number, max = 9999999.99) =>
  Math.min(Math.max(Number(num) || 0, 0), max);

const isValidUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ticket_id,
      block_id = 'b_zeno',
      material_id = null,
      architectural_volume = 0,
      predicted_quantity = 0,
      requested_quantity = 0,
      estimated_total_eur = 0,
      approval_tier = 1,
      status = 'PENDING_TIER2',
      variance_justification = null,
      variance_pct = 0,
    } = body;

    // Ensure ticket_id is a valid UUID for PostgreSQL
    const resolvedTicketId = ticket_id && isValidUuid(ticket_id)
      ? ticket_id
      : crypto.randomUUID();

    const resolvedBlockId = slugToUuidMap[block_id] || (isValidUuid(block_id) ? block_id : null);
    const resolvedMaterialId = material_id && isValidUuid(material_id) ? material_id : null;

    const insertPayload = {
      ticket_id: resolvedTicketId,
      block_id: resolvedBlockId,
      material_id: resolvedMaterialId,
      architectural_volume: clampNumeric(architectural_volume),
      predicted_quantity: clampNumeric(predicted_quantity),
      requested_quantity: clampNumeric(requested_quantity),
      estimated_total_eur: clampNumeric(estimated_total_eur),
      approval_tier: Number(approval_tier),
      status,
      variance_justification: variance_justification || null,
    };

    const { data: newTicket, error: dbError } = await supabaseAdmin
      .from('purchase_requisitions')
      .insert([insertPayload])
      .select()
      .single();

    if (dbError) {
      console.error('[API/REQUISITION] Insert Error:', dbError.message);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    // Trigger automated email dispatch if requisition requires approval
    if (status !== 'APPROVED') {
      try {
        const displayTicket = `REQ-${resolvedTicketId.slice(0, 8).toUpperCase()}`;
        
    // Tier-based approver mapping
    const tier = Number(approval_tier);
    let approverEmail = "farhadmokhtari22@gmail.com";
    let approverName = "Farhad Mokhtari";

    if (tier === 1) {
      approverEmail = "caesarconstructionsystems@gmail.com";
      approverName = "Site Foreman";
    } else if (tier === 2) {
      approverEmail = "farhad.mokhtari@afikgroup.com";
      approverName = "Engineer";
    } else {
      approverEmail = "farhadmokhtari22@gmail.com";
      approverName = "Farhad Mokhtari";
    }

        await sendApprovalEmail({
          ticketId: resolvedTicketId,
          materialName: body.material_name || body.material_id || 'C30/37 Concrete',
          block: block_id,
          quantity: Number(requested_quantity),
          totalEur: Number(estimated_total_eur),
          overrunPct: Number(variance_pct || 0),
          approverEmail,
          approverName,
        });
        console.log(`[API/REQUISITION] ✓ Approval email dispatched for ${displayTicket} (${resolvedTicketId})`);
      } catch (mailError: unknown) {
        const errorMsg = mailError instanceof Error ? mailError.message : String(mailError);
        console.error('[API/REQUISITION] Email Dispatch Warning:', errorMsg);
      }
    }

    return NextResponse.json({ success: true, data: newTicket }, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API/REQUISITION] Unexpected Server Error:', error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
