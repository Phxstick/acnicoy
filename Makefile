ELECTRON_PATH = ./node_modules/.bin/electron

.PHONY: build start install

all: build

build:
	npx gulp

start:
	$(ELECTRON_PATH) .

install:
	npm install