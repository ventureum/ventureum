#/bin/bash

sudo docker run -d --restart unless-stopped --name loom --net=host -v ~/loom:/loom ventureum/loom:latest
