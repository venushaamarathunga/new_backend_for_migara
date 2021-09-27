import { Document, model, Schema, Types } from 'mongoose';

export interface IOAuthToken extends Document {
    accessToken: string;
    accessTokenExpiresAt: Date;
    client: object;
    // clientId: string;
    id: Types.ObjectId;
    refreshToken: string;
    refreshTokenExpiresAt: Date;
    user: object;
    // userId: string;
}

const schema: Schema = new Schema({
    accessToken: { type: String },
    accessTokenExpiresAt: { type: Date },
    client: { type: Object }, // `client` and `user` are required in multiple places, for example `getAccessToken()`
    // clientId: { type: String },
    refreshToken: { type: String },
    refreshTokenExpiresAt: { type: Date },
    user: { type: Object }
    // userId: { type: String },
});

const dataModel = model<IOAuthToken>('OAuthToken', schema, 'oauth-tokens');
export default dataModel;
