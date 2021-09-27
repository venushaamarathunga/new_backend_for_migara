import { promises } from 'fs';

export function makeDirIfNotExists(path: string) {
    return promises.mkdir(path).catch(err => {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    });
}
