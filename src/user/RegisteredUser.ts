export default class RegisteredUser {
    public accessType: string;
    public mobileNumber: string;
    public name: string;
    public roles: Array<string>;
    public uuid: string;

    constructor(
        accessType: string,
        mobileNumber: string,
        name: string,
        roles: Array<string>,
        uuid: string
    ) {
        this.accessType = accessType;
        this.mobileNumber = mobileNumber;
        this.name = name;
        this.roles = roles;
        this.uuid = uuid;
    }
}
