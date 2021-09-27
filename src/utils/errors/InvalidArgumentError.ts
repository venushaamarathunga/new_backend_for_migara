export class InvalidArgumentError extends Error {
    constructor(message: string, errorCode?: number, statusCode: number = 400) {
        super(message);
    }
}
