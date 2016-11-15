#!/bin/bash

header_url="https://atom.io/download/electron"

system_arch=$(uname -i)
if [ $system_arch == "x86_64" ]; then
    system_arch="x64"
elif [ $system_arch == "i386" ]; then
    system_arch="ia32"
fi

electron_path="$1"
electron_version=$($electron_path --version)
electron_version=${electron_version:1}

# Export everything necessary
export npm_config_target=$electron_version
export npm_config_arch=$system_arch
export npm_config_target_arch=$system_arch
export npm_config_disturl=$header-url
export npm_config_runtime=electron
export npm_config_build_from_source=true

# Finally build sqlite3 against electron
HOME=~/.electron-gyp npm install sqlite3
