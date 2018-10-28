#!/usr/bin/env bash
set -e

cd /home/ec2-user/api
# Clean current project files on folder -> /home/ec2-user/api 
# rm -rf .gitignore
# rm -rf *
# update instance
yum -y update
# add nodejs to yum
curl --silent --location https://rpm.nodesource.com/setup_8.x | bash -
# Nodejs
yum -y install nodejs
# install pm2 module globaly
npm install -g pm2
pm2 update