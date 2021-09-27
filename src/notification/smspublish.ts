import { connect } from 'mqtt';

import logger from '../logger';

const options = {
    username: 'wqdjaxnz',
    password: 'AeiF4k4sTkOQ',
    port: 10628,
};

function messagePublish(verifyCode: string) {
    const client = connect(
        'mqtt://tailor.cloudmqtt.com',
        options
    );

    client.on('connect', () => {
        client.publish('flava', verifyCode);
        logger.info('Published', { label: 'SMSPublisher' });
        client.end();
    });
}

export const messageSend = { messagePublish };
