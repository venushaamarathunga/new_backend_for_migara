FROM node:latest

WORKDIR /home/app
USER node
ENV PORT 8080

EXPOSE 8080

ENTRYPOINT /bin/bash