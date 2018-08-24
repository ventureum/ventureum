#!/bin/bash

net=`cat app/.env.json | jq -r ".net"`

functionName="ventureum-backend-"$net

zip -r app.zip app/
aws lambda create-function \
    --function-name $functionName\
    --runtime "nodejs8.10" \
    --role "arn:aws:iam::727151012682:role/lambda_basic_execution" \
    --handler "app/index.handler" \
    --zip-file "fileb://./app.zip"

