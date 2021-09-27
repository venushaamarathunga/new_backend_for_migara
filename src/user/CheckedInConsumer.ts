import { ObjectId } from 'bson';
import { IVendorCustomer } from '../models/vendor-customer';
import { RegisteredConsumer } from './RegisteredConsumer';

export class CheckedInConsumer extends RegisteredConsumer {
    public checkedInTimestampMillis: number;
    public adjustment: number;
    public vendorId: string;
    public vendorCustomer: IVendorCustomer;
    public cancelled: boolean;
    public cancelledId: number;

    constructor(
        id: ObjectId,
        name: string,
        roles: string[],
        mobileNumber: string,
        uuid: string,
        nic: string,
        dob: Date,
        gender: string,
        checkedInTimestampMillis: number,
        adjustment: number,
        vendorId: string,
        vendorCustomer: IVendorCustomer,
        cancelled: boolean,
        cancelledId: number
    ) {
        super(id, name, roles, mobileNumber, uuid, nic, dob, gender);
        this.checkedInTimestampMillis = checkedInTimestampMillis;
        this.adjustment = adjustment;
        this.vendorId = vendorId;
        this.vendorCustomer = vendorCustomer;
        this.cancelled = cancelled;
        this.cancelledId = cancelledId;
    }
}
