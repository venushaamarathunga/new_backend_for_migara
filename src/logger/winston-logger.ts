import appRoot = require('app-root-path');
import winston = require('winston');

const winstonConfig = {
    file: <winston.transports.FileTransportOptions>{
        level: 'info',
        filename: `${appRoot.path}/logs/app.log`,
        handleExceptions: true,
        json: false,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        meta: false,
        colorize: false
    },
    console: <winston.transports.ConsoleTransportOptions>{
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true
    }
};

const logger: winston.Logger = winston.createLogger({
    format: winston.format.combine(winston.format.timestamp(), winston.format.prettyPrint()),
    transports: [
        new winston.transports.Console(winstonConfig.console),
        new winston.transports.File(winstonConfig.file)
    ],
    exitOnError: false // do not exit on handled exceptions
});

export default logger;
