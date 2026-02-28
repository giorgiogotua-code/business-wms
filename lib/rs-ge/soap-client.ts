const WAYBILL_URL = 'https://services.rs.ge/WayBillService/WayBillService.asmx';

export class RsGeError extends Error {
    constructor(public code: string, message: string) {
        super(message);
        this.name = 'RsGeError';
    }
}

export async function soapRequest(method: string, params: Record<string, any>): Promise<string> {
    const paramXml = Object.entries(params)
        .map(([k, v]) => `<${k}>${escapeXml(String(v ?? ''))}</${k}>`)
        .join('\n      ');

    const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="http://tempuri.org/">
      ${paramXml}
    </${method}>
  </soap:Body>
</soap:Envelope>`;

    const res = await fetch(WAYBILL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': `http://tempuri.org/${method}`,
        },
        body: envelope,
    });

    if (!res.ok) throw new RsGeError('HTTP_ERROR', `rs.ge HTTP error: ${res.status}`);

    const xml = await res.text();
    return parseSOAPResponse(xml, method);
}

function parseSOAPResponse(xml: string, method: string): string {
    if (xml.includes('<soap:Fault>')) {
        const m = xml.match(/<faultstring>([\s\S]*?)<\/faultstring>/);
        throw new RsGeError('SOAP_FAULT', m?.[1] || 'SOAP Fault');
    }
    const resultMatch = xml.match(new RegExp(`<${method}Result>([\\s\\S]*?)<\\/${method}Result>`));
    if (!resultMatch) throw new RsGeError('PARSE_ERROR', 'rs.ge პასუხის დამუშავება ვერ მოხდა');
    const inner = resultMatch[1];
    const errorMatch = inner.match(/<error_code>(\d+)<\/error_code>/);
    if (errorMatch && errorMatch[1] !== '0') {
        const msgMatch = inner.match(/<error_text>([\s\S]*?)<\/error_text>/);
        throw new RsGeError(errorMatch[1], msgMatch?.[1] || `rs.ge შეცდომა კოდი: ${errorMatch[1]}`);
    }
    return inner;
}

function escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function extractXmlValue(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    return match?.[1]?.trim() || '';
}

export function extractXmlBlocks(xml: string, tag: string): string[] {
    const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'g');
    return xml.match(regex) || [];
}
