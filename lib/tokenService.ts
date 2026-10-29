import crypto from 'crypto';

export interface ApprovalTokenPayload {
  requisition_id: string;
  approver_email: string;
  action: 'APPROVE' | 'REJECT';
  exp: number;
}

const TOKEN_SECRET = process.env.APPROVAL_TOKEN_SECRET || 'caesar-purchasing-hmac-secret-key-2026';

export function generateApprovalToken(
  payload: Omit<ApprovalTokenPayload, 'exp'>,
  expiresInSeconds: number = 259200
): string {
  const fullPayload: ApprovalTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifyApprovalToken(token: string): ApprovalTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(encodedPayload)
      .digest('base64url');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const payloadText = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload: ApprovalTokenPayload = JSON.parse(payloadText);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

