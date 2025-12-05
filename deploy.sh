#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Specify instance and evnironment to build and run: e.g. deploy.sh dev 1"
    exit 1
fi

# istance to run
DIR="$2"
ENV="$1"

#stop  instance
pm2 stop $ENV-$DIR

#rebuild clean and build
npm run build:i-$DIR

#startYoujazz in HA
pm2 start index.js --name "$ENV-$DIR" --cwd dist-$DIR
