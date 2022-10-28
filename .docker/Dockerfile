# UBUNTU SETUP
FROM ubuntu:focal AS build
ENV TZ=Europe/London
ARG DEBIAN_FRONTEND=noninteractive
SHELL ["/bin/bash", "-c"]
RUN apt-get update
RUN apt-get -y install autoconf autotools-dev libtool bzr git curl cmake gcc clang python3-dev 

# INSTALL EMSCRIPTEN
RUN mkdir -p /opt/
WORKDIR /opt/
RUN  git clone https://github.com/emscripten-core/emsdk.git
RUN /opt/emsdk/emsdk install latest
RUN /opt/emsdk/emsdk activate latest
RUN source /opt/emsdk/emsdk_env.sh

# CLONE CCP4 Web-Assembly REPO
RUN  git clone https://github.com/stuartjamesmcnicholas/CCP4-Web-Assembly.git ccp4_wasm
WORKDIR /opt/ccp4_wasm/
RUN /opt/ccp4_wasm/get_sources
RUN emcmake cmake .
RUN emmake make
RUN make install