import { BadRequestError } from '../utils/errors/BadRequestError';
import { ErrorCodes } from '../utils/errors/ErrorCodes';
import { HTTPClientError } from '../utils/errors/HTTPClientError';

export class InterTerminalVendorCardUsageError extends HTTPClientError {
    constructor(uuid: string, deviceId?: string) {
        super(
            403,
            `Either card uuid or the terminal's device id did not match: [uuid: ${uuid}] [deviceId: ${deviceId}]`,
            ErrorCodes.TERMINAL_ID_NOT_ACCESSIBLE_BY_VENDOR_CARD,
            'Your card is not allowed to be used in this terminal'
        );
    }
}
