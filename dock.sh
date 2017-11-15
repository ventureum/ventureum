#!/bin/bash
sudo xhost +
sudo docker run -ti --net=host -e DISPLAY -v /tmp/.X11-unix -v ~/projects/ventureum:/root/ventureum ventureum/dev:latest


