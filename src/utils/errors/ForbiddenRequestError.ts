import { ErrorCodes } from './ErrorCodes';
import { HTTPClientError } from './HTTPClientError';

export class ForbiddenRequestError extends HTTPClientError {
    constructor(message: string = 'Forbidden', errorCode: number = ErrorCodes.FORBIDDEN_REQUEST) {
        super(403, message, errorCode);
    }
}
