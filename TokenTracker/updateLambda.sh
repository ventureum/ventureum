#!/bin/bash
rm TokenTracker.zip
npm run install
npm run build
zip -r TokenTracker.zip ./
aws s3 cp TokenTracker.zip s3://tokentracker/
aws lambda update-function-code \
    --function-name "token_tracker_v3_$1" \
    --s3-bucket "tokentracker" \
    --s3-key "TokenTracker.zip"
