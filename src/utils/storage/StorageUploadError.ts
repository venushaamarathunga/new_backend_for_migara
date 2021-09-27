export class StorageUploadError extends Error {
    constructor(sourcePath: string) {
        super(`A file failed to upload: ${sourcePath}`);
    }
}
