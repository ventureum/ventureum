#!/bin/bash

zip -r app.zip app/
aws lambda update-function-code \
    --function-name "ventureum-backend" \
    --zip-file "fileb://./app.zip" 


