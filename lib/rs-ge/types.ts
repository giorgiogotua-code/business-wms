export interface RsGeCredentials { su: string; sp: string; }

export interface WaybillGood {
    name: string; quantity: number; price: number; unitId: number; barCode?: string;
}

export interface CreateWaybillInput {
    type: number; status: number;
    buyerTin: string; buyerName: string;
    startAddress: string; endAddress: string;
    transportationCost?: number; driverPin?: string; carNumber?: string;
    goods: WaybillGood[];
}

export interface WaybillListItem {
    id: number; number: string; createDate: string;
    buyerTin: string; buyerName: string; status: string;
}

export interface InvoiceItem {
    name: string; quantity: number; price: number; vatRate: number; unitId: number;
}

export interface CreateInvoiceInput {
    buyerTin: string; buyerName: string; comment?: string; items: InvoiceItem[];
}

export interface TinLookupResult { tin: string; name: string; isVatPayer: boolean; }

export enum WaybillType { INTERNAL = 1, EXPORT = 2, IMPORT = 3, RETURN = 4 }
export enum WaybillStatus { CLOSED = 0, ROUTE = 1 }
