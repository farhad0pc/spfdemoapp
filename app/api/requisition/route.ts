import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ticket_id,
      block_id = 'b_zeno',
      material_id = 'MAT-001',
      architectural_volume = 0,
      predicted_quantity = 0,
      requested_quantity = 0,
      estimated_total_eur = 0,
      approval_tier = 1,
      status = 'PENDING_TIER2',
      variance_justification = null,
      variance_pct = 0,
    } = body;

    const resolvedBlockId = slugToUuidMap[block_id] || block_id;

    const insertPayload = {
      ticket_id,
      block_id: resolvedBlockId,
      material_id,
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

    // Trigger automated email dispatch if requisition requires approval (Tier 2 or Tier 3)
    if (status !== 'APPROVED') {
      try {
        await sendApprovalEmail({
          ticketId: ticket_id,
          materialName: material_id,
          block: block_id,
          quantity: Number(requested_quantity),
          totalEur: Number(estimated_total_eur),
          overrunPct: Number(variance_pct || 0),
          approverEmail: 'farhadmokhtari22@gmail.com',
          approverName: 'Farhad Mokhtari',
        });
        console.log(`[API/REQUISITION] ✓ Approval email dispatched for ${ticket_id}`);
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
