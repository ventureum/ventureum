#/bin/bash
sudo docker run -d --restart unless-stopped --name loom --net=host -v ~/ventureum:/ventureum ventureum/listener:latest
