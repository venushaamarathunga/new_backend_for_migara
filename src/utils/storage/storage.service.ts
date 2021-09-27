import { Storage } from '@google-cloud/storage';
import logger from '../../logger';
import { StorageUploadError } from './StorageUploadError';

export class StorageHelper {
    public static getInstance(): StorageHelper {
        if (!StorageHelper.instance) {
            StorageHelper.instance = new StorageHelper();
        }
        return StorageHelper.instance;
    }

    private static instance: StorageHelper;
    private storage: Storage;

    private constructor() {
        this.storage = new Storage({ keyFilename: process.env.STORAGE_KEY_FILE });
    }

    public getPublicUrlForResource(bucket: string, location: string) {
        return `https://storage.googleapis.com/${bucket}/${location}`;
    }

    public async uploadFile(bucket: string, sourcePath: string, destinationPath: string) {
        logger.debug(
            `Uploading file located at ${sourcePath} to bucket ${bucket} at ${destinationPath}`,
            { label: 'StorageHelper' }
        );
        return this.storage
            .bucket(bucket)
            .upload(sourcePath, {
                destination: destinationPath,
                validation: 'crc32c',
            })
            .then(() => {
                return true;
            })
            .catch(error => {
                logger.error('Uploading file to cloud storage failed', {
                    label: 'StorageHelper',
                    error,
                });
                throw new StorageUploadError(sourcePath);
            });
    }
}
