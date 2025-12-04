#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Specify the instance to run: 1 or 2"
    exit 1
fi

# istance to run
DIR="$1"

#stop both instances
pm2 stop yj-$DIR

#rebuild
npm run clean
npm run build

#startYoujazz in HA
pm2 start index.js --name "yj-$DIR" --cwd dist-$DIR
