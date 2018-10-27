#!/usr/bin/env bash
if [ ! -z "$DEPLOYMENT_GROUP_NAME" ]; then
 export NODE_ENV=$DEPLOYMENT_GROUP_NAME
fi
# Kill any nodejs process running
pkill node

cd /home/ec2-user/api
# Original line -> pm2 start bin/www -n www -i 0
pm2 start index.js -n docpreviewapi -i 0