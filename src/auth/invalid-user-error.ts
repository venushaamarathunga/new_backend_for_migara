import { OAuthError } from 'oauth2-server';

export class InvalidUserError extends OAuthError {
    constructor(message: string) {
        super(message, {
            name: 'invalid_user',
            code: 400
        });
    }
}
