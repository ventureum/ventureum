#!/bin/bash

## exp
## remove old files
rm src/MilestoneExp.json
rm src/RepSysExp.json
## get new files
scp -i ~/Desktop/loom_alpha.pem ubuntu@99.79.9.100:~/ventureum/v2_proto/build/contracts/Milestone.json src/
scp -i ~/Desktop/loom_alpha.pem ubuntu@99.79.9.100:~/ventureum/v2_proto/build/contracts/RepSys.json src/
mv src/Milestone.json src/MilestoneExp.json
mv src/RepSys.json src/RepSysExp.json

## beta
rm src/MilestoneBeta.json
rm src/RepSysBeta.json
scp -i ~/Desktop/loom_alpha.pem ubuntu@35.183.39.31:~/ventureum/v2_proto/build/contracts/Milestone.json src/
scp -i ~/Desktop/loom_alpha.pem ubuntu@35.183.39.31:~/ventureum/v2_proto/build/contracts/RepSys.json src/
mv src/Milestone.json src/MilestoneBeta.json
mv src/RepSys.json src/RepSysBeta.json
