import { soapRequest, extractXmlBlocks, extractXmlValue } from './soap-client';
import { RsGeCredentials, CreateInvoiceInput } from './types';

export async function saveInvoice(creds: RsGeCredentials, input: CreateInvoiceInput) {
    const itemsXml = input.items.map(item => `
    <INVOICE_ITEM>
      <NAME>${item.name}</NAME>
      <QUANTITY>${item.quantity}</QUANTITY>
      <PRICE>${item.price}</PRICE>
      <VAT_RATE>${item.vatRate}</VAT_RATE>
      <UNIT_ID>${item.unitId}</UNIT_ID>
    </INVOICE_ITEM>`).join('');

    const params = {
        su: creds.su,
        sp: creds.sp,
        BUYER_TIN: input.buyerTin,
        BUYER_NAME: input.buyerName,
        COMMENT: input.comment || '',
        ITEMS_LIST: `<ITEMS_LIST>${itemsXml}</ITEMS_LIST>`
    };

    const res = await soapRequest('save_invoice', params);
    return {
        invoiceId: extractXmlValue(res, 'ID'),
        invoiceNumber: extractXmlValue(res, 'INVOICE_NUMBER')
    };
}

export async function getInvoices(creds: RsGeCredentials, from: string, to: string) {
    const res = await soapRequest('get_invoices', {
        su: creds.su,
        sp: creds.sp,
        DT_F: from,
        DT_T: to
    });

    const blocks = extractXmlBlocks(res, 'INVOICE');
    return blocks.map(xml => ({
        id: parseInt(extractXmlValue(xml, 'ID')),
        number: extractXmlValue(xml, 'INVOICE_NUMBER'),
        createDate: extractXmlValue(xml, 'CREATE_DATE'),
        buyerTin: extractXmlValue(xml, 'BUYER_TIN'),
        buyerName: extractXmlValue(xml, 'BUYER_NAME'),
        totalAmount: parseFloat(extractXmlValue(xml, 'TOTAL_AMOUNT')),
        vatAmount: parseFloat(extractXmlValue(xml, 'VAT_AMOUNT')),
        status: extractXmlValue(xml, 'STATUS')
    }));
}
