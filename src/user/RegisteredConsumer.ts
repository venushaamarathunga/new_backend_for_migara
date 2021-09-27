import { ObjectId } from 'bson';
import RegisteredUser from './RegisteredUser';

export class RegisteredConsumer extends RegisteredUser {
    public mobileNumber: string;
    public nic: string;
    public dob: Date;
    public gender: string;

    constructor(
        id: ObjectId,
        name: string,
        roles: string[],
        mobileNumber: string,
        uuid: string,
        nic: string,
        dob: Date,
        gender: string
    ) {
        super(id, uuid, name, roles);
        this.mobileNumber = mobileNumber;
        this.nic = nic;
        this.dob = dob;
        this.gender = gender;
    }
}
