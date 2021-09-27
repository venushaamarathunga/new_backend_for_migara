import { BadRequestError } from '../utils/errors/BadRequestError';

export class InvalidIdError extends BadRequestError {
    constructor(errorCode?: number, message = 'Invalid id given') {
        super(message, errorCode);
    }
}
