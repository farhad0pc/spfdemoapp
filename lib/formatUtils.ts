export function formatTicketId(ticketId?: string | null, fallbackNumber?: string | null): string {
  if (fallbackNumber && fallbackNumber.trim() !== '') {
    return fallbackNumber;
  }
  if (!ticketId) {
    return 'REQ-PENDING';
  }
  const clean = ticketId.trim();
  if (clean.toLowerCase().startsWith('req_')) {
    return clean.toUpperCase();
  }
  // Strip non-alphanumeric chars (like hyphens in UUIDs) and take the first 4 chars
  const hexSegment = clean.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  return `REQ-202610-${hexSegment || '0000'}`;
}
