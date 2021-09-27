import dotenv from 'dotenv';

import initializeApp from './app';

const config = dotenv.config();

// Validate configurations are loaded
if (config.error) {
    throw config.error;
}
console.log('Loaded configuration:\n', JSON.stringify(config.parsed, null, 4));

const PORT = process.env.SERVER_PORT || 3000;
initializeApp().then(server => {
    // tslint:disable-next-line:no-console
    server.listen(PORT, () => {
        console.log('App is running on port %d in %s mode', PORT, process.env.NODE_ENV);
    });
});
