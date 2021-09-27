import { createHash, randomBytes } from 'crypto';

export default class TokenUtils {
    public static generateRandomToken() {
        const buffer = randomBytes(256);
        return createHash('sha1')
            .update(buffer)
            .digest('hex');
    }
}
