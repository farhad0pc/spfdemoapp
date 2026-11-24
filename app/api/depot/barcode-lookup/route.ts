import { NextRequest, NextResponse } from 'next/server';

export interface BarcodeLookupResult {
  found: boolean;
  name?: string;
  brand?: string;
  specification?: string;
  source?: string;
  skippedReason?: 'URL_OR_NON_GTIN';
}

interface UpcItemDbItem {
  title?: string;
  brand?: string;
  description?: string;
  dimension?: string;
  weight?: string;
  category?: string;
}

interface OpenProductsFactsResponse {
  status?: number;
  product?: {
    product_name?: string;
    product_name_en?: string;
    product_name_tr?: string;
    brands?: string;
    generic_name?: string;
    quantity?: string;
    categories?: string;
  };
}

/**
 * URL / Non-GTIN Guard:
 * Prevents wasted external API latency & quota on QR URLs (http/https/www),
 * multi-word free text, or non-GTIN payloads.
 * Allows standard 8-14 digit numeric GTIN/EAN/UPC barcodes and compact
 * alphanumeric product SKUs containing digits.
 */
function isEligibleForExternalLookup(rawCode: string): boolean {
  const code = rawCode.trim();
  if (!code || code.length < 6 || code.length > 32) return false;

  const lower = code.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('www.') ||
    lower.includes('://') ||
    /\s/.test(code)
  ) {
    return false;
  }

  // Standard 8-14 digit numeric EAN-8, UPC-A, EAN-13, GTIN-14
  if (/^\d{8,14}$/.test(code)) {
    return true;
  }

  // Reject bare domains like "example.com" or "vendor.co.uk/abc"
  if (/\.[a-z]{2,}(\/|$)/i.test(code)) {
    return false;
  }

  // Compact alphanumeric industrial SKU (must contain at least one digit)
  if (/^[A-Za-z0-9][A-Za-z0-9._-]{5,31}$/.test(code) && /\d/.test(code)) {
    return true;
  }

  return false;
}

/**
 * Read-only public barcode lookup proxy.
 * NEVER writes to or mutates Supabase tables.
 */
export async function GET(request: NextRequest) {
  const rawCode = request.nextUrl.searchParams.get('code') || '';
  const code = rawCode.trim();

  if (!code || !isEligibleForExternalLookup(code)) {
    return NextResponse.json<BarcodeLookupResult>({
      found: false,
      skippedReason: 'URL_OR_NON_GTIN',
    });
  }

  // 1. Primary Query: UPCitemdb Public Trial Endpoint (3-second timeout)
  try {
    const upcRes = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CaesarOperationsDepotLookup/2.9.1',
        },
        signal: AbortSignal.timeout(3000),
      }
    );

    if (upcRes.ok) {
      const upcData = (await upcRes.json()) as { items?: UpcItemDbItem[] };
      const firstItem = upcData.items?.[0];
      if (firstItem && (firstItem.title || firstItem.brand)) {
        const specParts = [
          firstItem.description,
          firstItem.dimension,
          firstItem.weight,
          firstItem.category,
        ]
          .map((s) => (s ? s.trim() : ''))
          .filter(Boolean);

        return NextResponse.json<BarcodeLookupResult>({
          found: true,
          name: firstItem.title?.trim() || undefined,
          brand: firstItem.brand?.trim() || undefined,
          specification: specParts.join(' • ').slice(0, 240) || undefined,
          source: 'UPCitemdb',
        });
      }
    }
  } catch {
    // Graceful fallback to Open Products Facts on timeout or network error
  }

  // 2. Fallback Query: Open Products Facts v2 API (3-second timeout)
  try {
    const opfRes = await fetch(
      `https://world.openproductsfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CaesarOperationsDepotLookup/2.9.1',
        },
        signal: AbortSignal.timeout(3000),
      }
    );

    if (opfRes.ok) {
      const opfData = (await opfRes.json()) as OpenProductsFactsResponse;
      const prod = opfData.product;
      const resolvedName =
        prod?.product_name_tr || prod?.product_name_en || prod?.product_name;

      if (opfData.status === 1 && prod && (resolvedName || prod.brands)) {
        const specParts = [prod.generic_name, prod.quantity, prod.categories]
          .map((s) => (s ? s.trim() : ''))
          .filter(Boolean);

        return NextResponse.json<BarcodeLookupResult>({
          found: true,
          name: resolvedName?.trim() || undefined,
          brand: prod.brands?.trim() || undefined,
          specification: specParts.join(' • ').slice(0, 240) || undefined,
          source: 'Open Products Facts',
        });
      }
    }
  } catch {
    // Graceful fallback
  }

  return NextResponse.json<BarcodeLookupResult>({ found: false });
}
