# node-starter-kit

A starter kit to get started with building nodejs applications using typescript.

# Pre requisites

 - Install Node.js
 - Install Docker

# Getting Started

 - Clone the repository
 - Install dependencies
    ```
    cd node-starter-kit
    npm install
    ```
 - Create `.env` file following the examples provided in `.env.sample`.
 - Run the docker service
    ```
    docker-compose run --rm --service-ports node_dev_env
    ```
 - On the opened terminal session by the docker service, execute the following command.
    ```
    npm run dev
    ```
    This will poll for all file changes in typescript files, recompile them, and restart the nodejs application.

## Alternate development workflow

An alternative approach to watch for code changes and auto-restarting the application is to watch for typescript changes and node changes separately.

- On one terminal session of the docker service, watch for typescript file changes.
    ```
    npm run watch-ts
    ```
- Open another terminal session using `docker exec` and watch for js changes.
    ```
    npm run watch-node
    ```