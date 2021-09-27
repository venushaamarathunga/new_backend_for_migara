import { HTTPClientError } from '../utils/errors/HTTPClientError';

export class InvalidUuidError extends HTTPClientError {
    constructor() {
        super(409, 'Invalid id given');
    }
}
