import logger from '../logger';

const loggableConfig: any = {
    NODE_ENV: process.env.NODE_ENV,
    SERVER_PORT: process.env.SERVER_PORT,
    DATABASE_HOST: process.env.DATABASE_HOST,
    DATABASE_PORT: process.env.DATABASE_PORT,
    DATABASE_NAME: process.env.DATABASE_NAME,
    DATABASE_USERNAME: process.env.DATABASE_USERNAME,
    STORAGE_KEY_FILE: process.env.STORAGE_KEY_FILE,
    STORAGE_PUBLIC_BUCKET: process.env.STORAGE_PUBLIC_BUCKET,
};

export const appConfig: AppConfig = {
    ...loggableConfig,
    DATABASE_PWD: process.env.DATABASE_PWD,
    JWT_SIGNING_KEY: process.env.JWT_SIGNING_KEY,
};

export function printConfiguration() {
    logger.info(`Loaded configuration:\n${JSON.stringify(loggableConfig, null, 4)}`, {
        label: 'ConfigurationService',
    });
}

interface AppConfig {
    NODE_ENV: string;
    SERVER_PORT: string;
    DATABASE_HOST: string;
    DATABASE_PORT: string;
    DATABASE_NAME: string;
    DATABASE_USERNAME: string;
    DATABASE_PWD: string;
    JWT_SIGNING_KEY: string;
    STORAGE_KEY_FILE: string;
    STORAGE_PUBLIC_BUCKET: string;
}
