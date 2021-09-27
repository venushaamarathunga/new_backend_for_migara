import { HTTPClientError } from '../utils/errors/HTTPClientError';

export class UserAlreadyExistsError extends HTTPClientError {
    constructor(mobileNumber: string) {
        super(409, 'A user already exists for the mobile number ' + mobileNumber);
    }
}
