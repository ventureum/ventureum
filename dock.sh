#!/bin/bash
sudo xhost +
sudo docker run -ti --net=host -e DISPLAY -v /tmp/.X11-unix -v ~/projects:/root/projects ventureum/dev:latest


