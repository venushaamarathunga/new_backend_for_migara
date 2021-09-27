import { ErrorCodes } from '../utils/errors/ErrorCodes';
import { HTTPClientError } from '../utils/errors/HTTPClientError';

export class InvalidNicError extends HTTPClientError {
    constructor(statusCode?: number) {
        super(statusCode || 409, 'Invalid nic given', ErrorCodes.USER_NIC_INVALID);
    }
}
