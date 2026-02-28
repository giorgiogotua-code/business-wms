import { soapRequest, extractXmlValue, extractXmlBlocks } from './soap-client';
import { RsGeCredentials, CreateWaybillInput, WaybillListItem } from './types';

export async function saveWaybill(creds: RsGeCredentials, input: CreateWaybillInput) {
    const goodsXml = input.goods.map(g => `
    <GOOD>
      <ID>0</ID>
      <W_NAME>${g.name}</W_NAME>
      <UNIT_ID>${g.unitId}</UNIT_ID>
      <QUANTITY>${g.quantity}</QUANTITY>
      <PRICE>${g.price}</PRICE>
      <BAR_CODE>${g.barCode || ''}</BAR_CODE>
      <A_ID>0</A_ID>
    </GOOD>`).join('');

    const params = {
        su: creds.su,
        sp: creds.sp,
        TYPE: input.type,
        STATUS: input.status,
        BUYER_TIN: input.buyerTin,
        BUYER_NAME: input.buyerName,
        START_ADDRESS: input.startAddress,
        END_ADDRESS: input.endAddress,
        DRIVER_TIN: input.driverPin || '',
        CAR_NUMBER: input.carNumber || '',
        TRANSPORT_COAST: input.transportationCost || 0,
        GOODS_LIST: `<GOODS_LIST>${goodsXml}</GOODS_LIST>`
    };

    const res = await soapRequest('save_waybill', params);
    return {
        waybillId: extractXmlValue(res, 'ID'),
        waybillNumber: extractXmlValue(res, 'WAYBILL_NUMBER')
    };
}

export async function sendWaybill(creds: RsGeCredentials, waybillId: string) {
    await soapRequest('send_waybill', { su: creds.su, sp: creds.sp, ID: waybillId });
    return true;
}

export async function deleteWaybill(creds: RsGeCredentials, waybillId: string) {
    await soapRequest('del_waybill', { su: creds.su, sp: creds.sp, ID: waybillId });
    return true;
}

export async function closeWaybill(creds: RsGeCredentials, waybillId: string) {
    await soapRequest('close_waybill', { su: creds.su, sp: creds.sp, ID: waybillId });
    return true;
}

export async function getWaybills(creds: RsGeCredentials, from: string, to: string): Promise<WaybillListItem[]> {
    const res = await soapRequest('get_waybills', {
        su: creds.su,
        sp: creds.sp,
        DT_F: from,
        DT_T: to,
        ITYPE: 0,
        ISTATUS: -1
    });

    const blocks = extractXmlBlocks(res, 'WAYBILL');
    return blocks.map(xml => ({
        id: parseInt(extractXmlValue(xml, 'ID')),
        number: extractXmlValue(xml, 'WAYBILL_NUMBER'),
        createDate: extractXmlValue(xml, 'CREATE_DATE'),
        buyerTin: extractXmlValue(xml, 'BUYER_TIN'),
        buyerName: extractXmlValue(xml, 'BUYER_NAME'),
        status: extractXmlValue(xml, 'STATUS')
    }));
}

export async function getNameFromTin(tin: string) {
    const res = await soapRequest('get_name_from_tin', { tin });
    return extractXmlValue(res, 'get_name_from_tinResult');
}

export async function isVatPayer(tin: string) {
    const res = await soapRequest('is_vat_payer', { tin });
    return extractXmlValue(res, 'is_vat_payerResult') === 'true';
}

export async function getWaybillUnits() {
    const res = await soapRequest('get_waybill_units', {});
    const blocks = extractXmlBlocks(res, 'UNIT');
    return blocks.map(xml => ({
        id: extractXmlValue(xml, 'ID'),
        name: extractXmlValue(xml, 'NAME')
    }));
}
