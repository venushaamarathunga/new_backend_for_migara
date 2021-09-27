import { stat } from 'fs';

export abstract class HTTPClientError extends Error {
    public readonly statusCode: number;
    public readonly name: string;

    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
