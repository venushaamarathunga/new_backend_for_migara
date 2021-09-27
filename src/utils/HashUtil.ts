import { createHash } from 'crypto';

export class HashUtil {
    public static createHexEncodedSha256Hash(text: string) {
        return createHash('sha256')
            .update(text)
            .digest('hex');
    }
}
