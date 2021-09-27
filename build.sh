#!/bin/bash
echo "Building Flava Backend"

docker volume create --name mongo_data
docker-compose up -d --build
