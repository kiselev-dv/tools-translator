#!/bin/bash

mkdir pack
rm -r ./pack/*

cp -r ./src/main/webapp/ ./pack/web
cp ./target/translator*.jar ./pack/translator.jar
cp -r ./target/lib ./pack/lib

tar -czf ./package.tgz ./pack
rm -r pack
