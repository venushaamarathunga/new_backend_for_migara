import { BadRequestError } from '../utils/errors/BadRequestError';
import { ErrorCodes } from '../utils/errors/ErrorCodes';

export class InvalidVendorCardError extends BadRequestError {
    constructor() {
        super('Attempted card is invalid', ErrorCodes.VENDOR_CARD_INVALID);
    }
}
