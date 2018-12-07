FROM ubuntu:16.04
ENV DEBIAN_FRONTEND noninteractive

WORKDIR /tmp
RUN apt-get update
RUN apt-get install -y build-essential
RUN apt-get install -y --no-install-recommends apt-utils
RUN apt-get install sudo
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
RUN apt-get install -y nodejs

WORKDIR /ventureum/v2_proto

ENTRYPOINT ["npm", "run", "startListener"]