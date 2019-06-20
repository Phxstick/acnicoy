"use strict";

const http = require("http");
const fs = require("fs");
const request = require("request");
const EventEmitter = require("events");
const extract = require("extract-zip");

// =============================================================================
// Functions and variables for communicating with the server.
// =============================================================================

const HOSTNAME = "http://acnicoy.netai.net";
const SCRIPT_URI = "/backend.php";
const TIMEOUT_DURATION = 10000;

const requestOptions = {
    baseUrl: HOSTNAME,
    url: SCRIPT_URI,
    timeout: TIMEOUT_DURATION,
    method: "POST",
    headers: { "Cache-Control": "no-cache, no-store, no-transform",
               "Accept-Encoding": "identity" },
    json: true
};

class ServerRequestFailedError extends Error {
    constructor(statusCode, statusMessage, responseBody=null) {
        if (responseBody === null)
            responseBody = "";
        super(`Error ${statusCode}: ${statusMessage}\n\n${responseBody}`);
        this.name = "Server error";
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
    }
}

class NoServerConnectionError extends Error {
    constructor(message) {
        this.name = "Connection error";
        super(message);
    }
}

/**
 *  Send HTTP POST request to server and return the response body.
 *  @param {Object} query - JSON object to send as body of the POST request.
 *  @returns {Promise[Object]} - JSON object from response body.
 */
function queryServer(query) {
    return new Promise((resolve, reject) => {
        request({ body: query, ...requestOptions }, (error, response, body) => {
            if (error) {
                reject(new NoServerConnectionError(error.message));
            } else if (response.statusCode !== 200) {
                reject(new ServerRequestFailedError(
                    response.statusCode, response.statusMessage, body));
            } else {
                resolve(body);
            }
        });
    });
}

module.exports.ServerRequestFailedError = ServerRequestFailedError;
module.exports.NoServerConnectionError = NoServerConnectionError;

// =============================================================================
// Functions and state information for downloading files.
// =============================================================================

// Size of data fragments written to the hard disk.
const FRAGMENT_SIZE = 500000;  // 0.5MB

// Map download name to object containing associated information
const downloadsInfo = new Map();

// Map download name to emitter generating events as the download progresses
const progressEmitters = new Map();

function loadDownloadsInfo() {
    downloadsInfo.clear();
    const downloadsInfoObject = require(paths.downloadsInfo);
    for (const downloadName in downloadsInfoObject) {
        downloadsInfo.set(downloadName, downloadsInfoObject[downloadName]);
    }
}

function saveDownloadsInfo() {
    const jsonObject = {};
    for (const [downloadName, downloadInfo] of downloadsInfo) {
        jsonObject[downloadName] = downloadInfo;
    }
    fs.writeFileSync(paths.downloadsInfo, JSON.stringify(jsonObject, null, 4));
}

/**
 * Download a file specified by the given query to the server.
 * @returns {Promise[Boolean]} - Evaluated to true if the download has finished.
 */
function downloadFile(downloadName, query) {
    const downloadInfo = downloadsInfo.get(downloadName);
    const emitter = progressEmitters.get(downloadName);
    // "encoding: null" is necessary to interpret data as binary instead of utf8
    const stream = request({ body: query, encoding: null, ...requestOptions });

    let fileHandle;
    let buffer;
    let bufferOffset = 0;
    let totalChunkSize = 0;

    // Fill buffer with received data chunks, write to disk whenever it's full
    stream.on("data", (chunk) => {
        let chunkOffset = 0;
        let chunkRestSize = chunk.length;
        totalChunkSize += chunk.length;
        while (chunkRestSize > 0) {
            const bufferSpaceLeft = FRAGMENT_SIZE - bufferOffset;
            const copySize = Math.min(bufferSpaceLeft, chunkRestSize);
            chunk.copy(
                buffer, bufferOffset, chunkOffset, chunkOffset + copySize);
            bufferOffset += copySize;
            chunkOffset += copySize;
            chunkRestSize -= copySize;
            // If buffer has been filled, write fragment to disk
            if (bufferOffset === FRAGMENT_SIZE) {
                fs.writeSync(fileHandle, buffer);
                bufferOffset = 0;
                downloadInfo.currentlyDownloading.offset += FRAGMENT_SIZE;
                emitter.emit("progressing", getDownloadStatus(downloadName));
            }
        }
    });

    // Callback for when stream is closed, writes final chunk and closes file
    const concludeDownload = () => {
        if (bufferOffset > 0) {
            fs.writeSync(fileHandle, buffer, 0, bufferOffset);
            downloadInfo.currentlyDownloading.offset += bufferOffset;
        }
        fs.closeSync(fileHandle);
    };

    return new Promise((resolve, reject) => {
        let responseReceived = false;
        let streamEnded = false;
        let errorEncountered = false;

        stream.on("response", (response) => {
            responseReceived = true;

            // Consider all codes but 200 as server errors and resolve to false
            if (response.statusCode !== 200) {
                emitter.emit("error", "Server error");
                resolve(false);
                return;
            }

            // Add function to the emitter that allows interrupting the download
            // TODO: this assumes that destroy calls "close" listener; does it?
            emitter.stop = () => {
                response.destroy();
                // TODO: emit abort-event here (or in close-listener)
            };

            // Initialize buffer and open file for appending
            const filename = downloadInfo.currentlyDownloading.filename;
            const downloadPath = paths.downloadArchive(downloadName, filename);
            fileHandle = fs.openSync(downloadPath, "a");
            buffer = Buffer.alloc(FRAGMENT_SIZE);
        });

        stream.on("close", () => {
            if (streamEnded) return;
            if (errorEncountered) return;
            if (!responseReceived) return;  // Is this necessary here?
            concludeDownload();
            emitter.emit("progressing", getDownloadStatus(downloadName));
            resolve(false);
        });

        stream.on("error", (error) => {
            if (streamEnded) return;
            errorEncountered = true;
            if (!responseReceived) {
                emitter.emit("error", "Connection error");
            } else {
                concludeDownload();
                // TODO: this can actually be a "parse error" as well, what else
                emitter.emit("error", "Connection lost");
            }
            resolve(false);
        });

        // Resolve to true if download is complete
        stream.on("end", async () => {
            streamEnded = true;
            concludeDownload();
            emitter.emit("progressing", getDownloadStatus(downloadName));
            resolve(true);
        });
    });
}

/**
 * Get status information for download with given name in form of an object
 * { totalSize, downloaded, remaining, percentage }.
 */
function getDownloadStatus(downloadName) {
    const { totalSize, downloaded, currentlyDownloading }
        = downloadsInfo.get(downloadName);
    const currentSize = downloaded + currentlyDownloading.offset;
    return {
        totalSize: totalSize,
        downloaded: currentSize,
        remaining: totalSize - currentSize,
        percentage: 100 * currentSize / totalSize
    };
}

/**
 *  Pause download with given name.
 */
function pauseDownload(downloadName) {
    // TODO: Set "paused" bool here
    stopDownload(downloadName);
}

/**
 *  Stop download with given name.
 */
function stopDownload(downloadName) {
    if (!downloadsInfo.has(downloadName)) {
        throw new Error(`Could not find download with name "${downloadName}".`);
    }
    if (!progressEmitters.has(downloadName)) {
        throw new Error(`Download "${downloadName}" is currently not running.`);
    }
    progressEmitters.get(downloadName).stop();
}

function stopAllDownloads() {
    for (const [downloadName, progressEmitter] of progressEmitters) {
        stopDownload(downloadName);
    }
}

module.exports.load = loadDownloadsInfo;
module.exports.save = saveDownloadsInfo;
module.exports.stopAllDownloads = stopAllDownloads;

// =============================================================================
// Functions for managing language content downloads.
// =============================================================================

const content = {};

function getContentDownloadName(language, secondary) {
    return `Content-${language}-${secondary}`;
}

function getContentFileVersions(language, secondary) {
    return utility.existsFile(paths.content(language, secondary).versions) ?
        require(paths.content(language, secondary).versions) : {};
}

content.getStatus = async function (language, secondary) {
    return await queryServer({
        action: "info",
        target: {
            type: "content",
            language,
            secondary
        },
        clientVersions: {
            program: app.version,
            content: getContentFileVersions(language, secondary)
        }
    });
}

content.getDownloadStatus = function (language, secondary) {
    const downloadName = getContentDownloadName(language, secondary);
    if (!downloadsInfo.has(downloadName))
        return null;
    return getDownloadStatus(downloadName);
}

async function finishContentDownload(downloadName) {
    const { language, secondary, minProgramVersions, fileVersions }
             = downloadsInfo.get(downloadName).details;
    const contentPaths = paths.content(language, secondary);

    // Create subdirectory in content directory if it doesn't exist yet
    if (!utility.existsDirectory(contentPaths.directory)) {
        fs.mkdirSync(contentPaths.directory);
    }

    // Get content of version registers (create them if they don't exist yet)
    const versionsReg = utility.existsFile(contentPaths.versions) ?
        require(contentPaths.versions) : {};
    const minProgramVersionsReg =
        utility.existsFile(contentPaths.minProgramVersions) ?
        require(contentPaths.minProgramVersions) : {};

    // Unzip downloaded files into the content subdirectory
    const extractionPromises = [];
    for (const filename in fileVersions) {
        const downloadPath = paths.downloadArchive(downloadName, filename);
        extractionPromises.push(new Promise((resolve, reject) => {
            extract(downloadPath, { dir: contentPaths.directory }, (error) => {
                fs.unlinkSync(downloadPath);
                if (error) {
                    reject(error);
                } else {
                    minProgramVersionsReg[filename]=minProgramVersions[filename]
                    versionsReg[filename] = fileVersions[filename];
                    resolve();
                }
            });
        }));
    }

    // Save version registers to disk and return true if no error occurred
    try {
        await Promise.all(extractionPromises);
    } catch (error) {
        return false;
    } finally {
        fs.writeFileSync(contentPaths.versions,
            JSON.stringify(versionsReg, null, 4));
        fs.writeFileSync(contentPaths.minProgramVersions,
            JSON.stringify(minProgramVersionsReg, null, 4));
    }
    return true;
}

async function conductContentDownload(downloadName) {
    const progressEmitter = progressEmitters.get(downloadName);
    const downloadInfo = downloadsInfo.get(downloadName);
    const { filesPending, currentlyDownloading, details } = downloadInfo;

    while (filesPending.length > 0) {
        // Get the next file if the last one finished downloading
        if (currentlyDownloading.filename === null) {
            currentlyDownloading.filename = filesPending[filesPending.length-1];
        }

        // Download the file
        const complete = await downloadFile(downloadName, {
            action: "download",
            offset: currentlyDownloading.offset,
            target: {
                type: "content",
                filename: currentlyDownloading.filename,
                language: details.language,
                secondary: details.secondary,
                version: details.fileVersions[currentlyDownloading.filename]
            }
        });
        
        // If the file hasn't been downloaded completely, put download on hold
        if (!complete) {
            progressEmitters.delete(downloadName);
            saveDownloadsInfo();
            return;
        }

        // Otherwise, remove it from the list of pending files
        downloadInfo.downloaded += currentlyDownloading.offset;
        currentlyDownloading.filename = null;
        currentlyDownloading.offset = 0;
        filesPending.pop();
        saveDownloadsInfo();
    }

    // Process the downloaded data
    progressEmitter.emit("starting-data-processing");
    const successful = await finishContentDownload(downloadName);

    // Delete download info and emitter from registers and remove subdirectory
    downloadsInfo.delete(downloadName);
    saveDownloadsInfo();
    progressEmitters.delete(downloadName);
    fs.rmdirSync(paths.downloadSubdirectory(downloadName));

    // Signal that the download was finished and whether it was successful
    progressEmitter.emit("finished", successful);
}

content.startDownload = async function (language, secondary) {
    const downloadName = getContentDownloadName(language, secondary);

    // If a download is already running, just return the corresponding emitter
    if (progressEmitters.has(downloadName)) {
        return progressEmitters.get(downloadName);
    }

    // If download doesn't exist yet, get latest file versions from server first
    if (!downloadsInfo.has(downloadName)) {
        const contentStatus = await content.getStatus(language, secondary);
        if (!contentStatus.updateAvailable)
            throw `Content for language pair '${language}-${secondary}' is ` +
                  `already up to date.`;

        // Register the download and store all associated information
        downloadsInfo.set(downloadName, {
            filesPending: Object.keys(contentStatus.latestFileVersions),
            fileSizes: contentStatus.fileSizes,
            currentlyDownloading: {
                filename: null,
                offset: 0
            },
            totalSize: contentStatus.totalSize,
            downloaded: 0,
            details: {
                fileVersions: contentStatus.latestFileVersions,
                minProgramVersions: contentStatus.minProgramVersions,
                language,
                secondary
            }
        });
        saveDownloadsInfo();
        fs.mkdirSync(paths.downloadSubdirectory(downloadName));
    }

    // Start the download and create an emitter which will report its progress
    const progressEmitter = new EventEmitter();
    progressEmitter.stop = () => {}; // Set a flag, check in conduct-function
    progressEmitters.set(downloadName, progressEmitter);
    window.setTimeout(() => conductContentDownload(downloadName), 0);
    return progressEmitter;
}

content.pauseDownload = function (language, secondary) {
    const downloadName = getContentDownloadName(language, secondary);
    return pauseDownload(downloadName);
}

module.exports.content = content;

// =============================================================================
// Functions for managing program downloads
// =============================================================================

const program = {}

program.getLatestVersionInfo = async function () {
    return await queryServer({ target: { type: "program" }, action: "info" });
};

module.exports.program = program;
