import { HTTPClientError } from './HTTPClientError';

export class BadRequestError extends HTTPClientError {
    // public readonly statusCode = 400;

    constructor(message: string = 'Bad Request') {
        super(400, message);
    }
}
