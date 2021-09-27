import { HTTPClientError } from './HTTPClientError';

export class HTTP404Error extends HTTPClientError {
    // readonly statusCode = 404;

    constructor(message: string = 'Not Found') {
        super(404, message);
    }
}
