#!/bin/bash

net=`cat app/.env.json | jq -r ".net"`;

functionName="ventureum-backend-"$net 

rm app.zip
zip -r app.zip app/
aws lambda update-function-code \
    --function-name $functionName\
    --zip-file "fileb://./app.zip" 


