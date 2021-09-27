import { GetterSerializable } from '../../utils/GetterSerializable';

export class ApiErrorResponse extends GetterSerializable {
    private _timestamp: string;

    constructor(private _statusCode: number, private _message: string, private _debug?: string) {
        super();
        this._timestamp = new Date().toISOString();
    }

    public get statusCode(): number {
        return this._statusCode;
    }

    public get message(): string {
        return this._message;
    }

    public get timestamp(): string {
        return this._timestamp;
    }

    public get debug(): string {
        return this._debug;
    }

    public toJson() {
        return super.toJson(this);
    }
}
