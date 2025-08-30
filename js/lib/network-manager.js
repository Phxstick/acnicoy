"use strict";

const http = require("http");
const fs = require("fs-extra");
const request = require("request").defaults({ pool: { maxSockets: Infinity } });
const EventEmitter = require("events");
const extract = require("extract-zip");
const { compareVersions } = require("compare-versions");

// =============================================================================
// Functions and variables for communicating with the server.
// =============================================================================

const RAW_DATA_URL =
    "https://raw.githubusercontent.com/Phxstick/acnicoy-data/master/";
const PROGRAM_API_URL = "https://api.github.com/repos/Phxstick/acnicoy/";
const RELEASES_URL="https://github.com/Phxstick/acnicoy-data/releases/download";
const TIMEOUT_DURATION = 10000;

const defaultOptions = {
    timeout: TIMEOUT_DURATION
};

class RequestError extends Error {
    constructor(statusCode, statusMessage, responseBody=null) {
        if (responseBody === null)
            responseBody = "";
        super(`Error ${statusCode}: ${statusMessage}\n\n${responseBody}`);
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
    }
}

class ConnectionError extends Error {
    constructor(message, connectionTimeout) {
        super(message);
        this.connectionTimeout = connectionTimeout;
    }
}

/**
 *  Send HTTP POST request to server and return the response body.
 *  @param {Object} query - JSON object to send as body of the POST request.
 *  @returns {Promise[Object]} - JSON object from response body.
 */
function sendRequest(options) {
    return new Promise((resolve, reject) => {
        request({ ...defaultOptions, ...options }, (error, response, body) => {
            if (error) {
                reject(new ConnectionError(error.message));
            } else if (response.statusCode !== 200) {
                reject(new RequestError(
                    response.statusCode, response.statusMessage, body));
            } else {
                resolve(JSON.parse(body));
            }
        });
    });
}

module.exports.RequestError = RequestError;
module.exports.ConnectionError = ConnectionError;

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
function downloadFile(downloadName, requestOptions) {
    const downloadInfo = downloadsInfo.get(downloadName);
    const emitter = progressEmitters.get(downloadName);
    const stream = request(requestOptions);

    let fileHandle;
    let buffer;
    let bufferOffset = 0;
    let totalChunkSize = 0;

    // Fill buffer with received data chunks, write to disk whenever it's full
    const dataCallback = (chunk) => {
        // if (buffer === undefined) return;  // Discard data if status was not 206
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
    };

    return new Promise((resolve, reject) => {
        let downloadFinished = false;
        let errorEmitted = false;

        stream.on("response", (response) => {
            // Consider all codes but 206 ("Partial Content") as server errors
            if (response.statusCode !== 206) {
                emitter.emit("error", new RequestError(response.statusCode,
                                                       reponse.statusMessage));
                response.destroy();
                resolve(false);
                return;
            }

            // Add function to the emitter that allows interrupting the download
            emitter.stop = () => {
                response.destroy();
                // TODO: is the "end" listener called after this?
                // TODO: necessary to listen to "aborted" event?
            };

            // Initialize buffer and open file for appending
            const filename = downloadInfo.currentlyDownloading.filename;
            const downloadPath = paths.downloadArchive(downloadName, filename);
            fileHandle = fs.openSync(downloadPath, "a");
            buffer = Buffer.alloc(FRAGMENT_SIZE);

            response.on("data", dataCallback);

            // Write final chunk, close file, resolve to true if all downloaded
            response.on("end", async () => {
                if (bufferOffset > 0) {
                    fs.writeSync(fileHandle, buffer, 0, bufferOffset);
                    downloadInfo.currentlyDownloading.offset += bufferOffset;
                }
                fs.closeSync(fileHandle);
                if (!response.complete) return;
                downloadFinished = true;
                emitter.emit("progressing", getDownloadStatus(downloadName));
                resolve(true);
            });
        });

        // Emit connection error if there is an error in response stream
        stream.on("error", (error) => {
            // ESOCKETTIMEDOUT is always fired twice, even if download complete
            if (!downloadFinished && !errorEmitted) {
                errorEmitted = true;
                if (error.code === "ETIMEDOUT" && error.connect) {
                    emitter.emit("error",
                        new ConnectionError(error.message, true));
                } else {  // Check further cases, e.g. if "parse error"
                    emitter.emit("error",
                        new ConnectionError(error.message, false));
                }
                resolve(false);
            }
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
 *  Stop download with given name.
 */
function pauseDownload(downloadName, restartAutomatically=true) {
    if (!downloadsInfo.has(downloadName)) {
        throw new Error(`Could not find download with name "${downloadName}".`);
    }
    if (!progressEmitters.has(downloadName)) {
        throw new Error(`Download "${downloadName}" is currently not running.`);
    }
    // TODO: Set "paused" bool to true here if restartAutomatically is false
    progressEmitters.get(downloadName).stop();
}

function haltAllDownloads() {
    for (const [downloadName, progressEmitter] of progressEmitters) {
        pauseDownload(downloadName);
    }
}

function removeDownload(downloadName) {
    // Delete download info from local storage and remove subdirectory
    downloadsInfo.delete(downloadName);
    saveDownloadsInfo();
    fs.remove(paths.downloadSubdirectory(downloadName));
    if (progressEmitters.has(downloadName)) {
        progressEmitters.delete(downloadName);
    }
}

module.exports.load = loadDownloadsInfo;
module.exports.save = saveDownloadsInfo;
module.exports.haltAll = haltAllDownloads;

// =============================================================================
// Functions for managing language content downloads.
// =============================================================================

const content = {};
const releasePrefixes = require(paths.contentReleasePrefixes);

function getContentDownloadName(language, secondary) {
    return `Content-${language}-${secondary}`;
}

function getContentFileVersions(language, secondary) {
    return utility.existsFile(paths.content(language, secondary).versions) ?
        require(paths.content(language, secondary).versions) : {};
}

content.getStatus = async function (language, secondary) {
    const allVersions = await sendRequest({ url:`${language}-${secondary}.json`,
                                            baseUrl: RAW_DATA_URL });
    const currentVersions = getContentFileVersions(language, secondary);
    const currentProgramVersion = app.version;
    const statusInfo = {
        updateAvailable: false,
        programUpdateRecommended: false,
        latestFileVersions: {},
        minProgramVersions: {},
        fileSizes: {},
        totalSize: 0
    };

    for (const filename in allVersions) {
        let foundNonFittingRow = false;
        let lastFittingRow;

        // Skip rows while minimum required program version is smaller or equal
        // to currently used program version
        for (const row of allVersions[filename]) {
            if (compareVersions(row[1], currentProgramVersion) > 0) {
                foundNonFittingRow = true;
                break;
            }
            lastFittingRow = row;
        }

        // If the first version in the register isn't compatible, the others
        // won't be either (have higher versions), so there's no fitting version
        if (lastFittingRow === undefined) {
            continue;
        }

        // Check if a program update is necessary to make use of the latest data
        const [releaseVersion, minimumProgramVersion, recommendedProgramVersion,
               fileSize] = lastFittingRow;
        if (foundNonFittingRow || compareVersions(
                recommendedProgramVersion, currentProgramVersion) > 0) {
            statusInfo.programUpdateRecommended = true;
        }

        // Add the chosen version for update if it's not the current version
        if (!currentVersions.hasOwnProperty(filename) ||
                currentVersions[filename] !== releaseVersion) {
            statusInfo.latestFileVersions[filename] = releaseVersion;
            statusInfo.minProgramVersions[filename] = minimumProgramVersion;
            statusInfo.fileSizes[filename] = fileSize;
            statusInfo.totalSize += fileSize;
        }
    }
    
    if (statusInfo.totalSize > 0) {
        statusInfo.updateAvailable = true;
    }

    return statusInfo;
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

    // Unzip downloaded files into the download subdirectory
    process.noAsar = true;  // NOTE: Not sure if this is necessary
    const downloadDirectory = paths.downloadSubdirectory(downloadName);
    for (const filename in fileVersions) {
        const downloadPath = paths.downloadArchive(downloadName, filename);
        try {
            await extract(downloadPath, { dir: downloadDirectory });
        } catch (error) {
            return false;
        }
        minProgramVersionsReg[filename] = minProgramVersions[filename];
        versionsReg[filename] = fileVersions[filename];
    }

    // If everything has been extracted, copy files to content directory
    const contentRegister = paths.contentRegister[language][secondary]
    for (const resourceName in contentRegister) {
        const filename = contentRegister[resourceName]
        if (!(filename in fileVersions)) continue
        const filePath = paths.downloadFile(downloadName, filename);
        await fs.move(filePath, contentPaths[resourceName], { overwrite: true });
    }

    fs.writeFileSync(contentPaths.versions,
        JSON.stringify(versionsReg, null, 4));
    fs.writeFileSync(contentPaths.minProgramVersions,
        JSON.stringify(minProgramVersionsReg, null, 4));
    process.noAsar = false;
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
        const filename = currentlyDownloading.filename;
        const releaseVersion = details.fileVersions[filename];
        const currentSize = currentlyDownloading.offset;
        const totalSize = downloadInfo.fileSizes[filename];
        const prefix = releasePrefixes[details.language][details.secondary];
        const complete = await downloadFile(downloadName, {
            baseUrl: RELEASES_URL,
            url: `${prefix}-${releaseVersion}/${filename}.zip`,
            timeout: TIMEOUT_DURATION,
            encoding: null,  // Interpret data as binary instead of utf8
            headers: {
                "Accept-Encoding": "identity",
                "Cache-Control": "no-transform",
                "Range": `bytes=${currentSize}-${totalSize-1}`
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

    // Process the downloaded data and unregister the download
    progressEmitter.emit("starting-data-processing");
    let successful
    try {
        successful = await finishContentDownload(downloadName);
        removeDownload(downloadName);
    } catch (error) {
        console.error(error.stack)
        successful = false
    }

    // Signal that the download has ended and specify whether it was successful
    progressEmitter.emit("ended", successful);
}

content.startDownload = async function (language, secondary) {
    const downloadName = getContentDownloadName(language, secondary);

    // If a download is already running, just return the corresponding emitter
    if (progressEmitters.has(downloadName)) {
        return progressEmitters.get(downloadName);
    }

    // If download doesn't exist yet, register it with information from cache
    if (!downloadsInfo.has(downloadName)) {
        const contentStatus = storage.get(
            `dataUpdateCache.latestFileVersions.${language}.${secondary}`);
        if (!contentStatus.updateAvailable)
            throw `Content for language pair '${language}-${secondary}' is ` +
                  `already up to date.`;
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
    pauseDownload(downloadName);
}

content.stopDownload = function (language, secondary) {
    const downloadName = getContentDownloadName(language, secondary);
    removeDownload(downloadName);
}

content.getLatestVersions = function () {
    return sendRequest({ url: "versions.json", baseUrl: RAW_DATA_URL });
}

module.exports.content = content;

// =============================================================================
// Functions for managing program downloads
// =============================================================================

const program = {}

program.getLatestVersionInfo = async function () {
    let releaseInfo;
    try {
        const releaseInfo = await sendRequest({ baseUrl: PROGRAM_API_URL,
            url: "/releases/latest", headers: { "User-Agent": "acnicoy"} });
        return {
            latestVersion: releaseInfo.tag_name.slice(1),  // Remove leading 'v'
            releaseDate: Date.parse(releaseInfo.published_at),
            description: releaseInfo.body
        }
    } catch (error) {
        return null;  // No release available (or repository doesn't exist)
    }
};

module.exports.program = program;
