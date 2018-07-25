"use strict";

const http = require("http");
const fs = require("fs");
const request = require("request");
const EventEmitter = require("events");
const extract = require("extract-zip");

// =============================================================================
// Functions for communicating with the server.
// =============================================================================

const HOSTNAME = "http://acnicoy.netai.net";
const SCRIPT_URI = "/download.php";
const TIMEOUT_DURATION = 20000;

class ServerRequestFailedError extends Error {
    constructor(statusCode, statusMessage) {
        super(`Error ${statusCode}: ${statusMessage}`);
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
    }
}
class NoServerConnectionError extends Error {
    constructor(message) {
        super(message);
    }
}

/**
 *  Send HTTP POST request to server. Return server response.
 *  @param {Object} query - JSON object to send as body of the POST request.
 *  @returns {http.IncomingMessage} - Response of the server.
 */
function requestFromServer(query) {
    const options = {
        baseUrl: HOSTNAME,
        url: SCRIPT_URI,
        method: "POST",
        headers: { "Content-Type": "application/json",
                   "Accept-Encoding": "identity",
                   "Cache-Control": "no-cache, no-store, no-transform" },
        body: JSON.stringify(query),
        encoding: null,
        timeout: TIMEOUT_DURATION
    };
    return new Promise((resolve, reject) => {
        let dataCounter = 0;
        const stream = request(options, (err, response, body) => {
            if (err) {
                console.log("Error:", err);
                return;
            }
            console.log("body.length:", body.length);
        }).on("response", (response) => {
            if (response.statusCode !== 200 && response.statusCode !== 201) {
                reject(new ServerRequestFailedError(
                    response.statusCode, response.statusMessage));
                return;
            }
            // console.log(response);
            stream.headers = response.headers;
            // stream.destroy = () => response.destroy();
            stream.destroy = () => {
                console.log("'stream.destroy' is called!");
                response.destroy();
            };
            resolve(stream);
            console.log("Data gathered before response event: ", dataCounter);
        }).on("error", (error) => {
            console.log("STREAM ERROR: ", error);
            reject(new NoServerConnectionError(error.message));
        });
        // console.log(stream);
        // console.log("Stream state: ", stream._readableState);
        // console.log("Stream highWaterMark: ", stream.readableHighWaterMark);
        stream.on("data", (chunk) => {
            dataCounter += chunk.length;
        });
        stream.on("end", () => {
            console.log("Data amount received in direct data listener:", dataCounter);
        });
    });
}

/**
 *  Send HTTP POST request to server. Return completeBody of server response.
 *  @param {Object} query - JSON object to send as body of the POST request.
 *  @returns {Object} - JSON object from response body.
 */
function requestFromServerFull(query) {
    const options = {
        baseUrl: HOSTNAME,
        url: SCRIPT_URI,
        method: "POST",
        headers: { "Cache-Control": "no-cache" },
        timeout: TIMEOUT_DURATION,
        json: true,
        body: query
    };
    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                reject(new NoServerConnectionError(error.message));
                return;
            }
            if (response.statusCode !== 200 && response.statusCode !== 201) {
                reject(new ServerRequestFailedError(
                    response.statusCode, response.statusMessage));
                return;
            }
            resolve(body);
        });
    });
}

module.exports.ServerRequestFailedError = ServerRequestFailedError;
module.exports.NoServerConnectionError = NoServerConnectionError;


// =============================================================================
// Functions handling file IO.
// =============================================================================

/**
 * @param {String} filename - Name of file to write fragment to.
 * @param {Integer} fileOffset - Position (bytes) in file to copy fragment to.
 * @param {Buffer} dataFragment - Buffer containing data to be copied.
 * @param {Integer} [dataLength] - Amount of data in buffer to be copied.
 */
function saveFragmentToDisk(filename, fileOffset, dataFragment, dataLength) {
    if (dataLength === undefined)
        dataLength = dataFragment.length;
    const handle = fs.openSync(paths.downloadDataPart(filename), "r+");
    fs.writeSync(handle, dataFragment, 0, dataLength, fileOffset);
    fs.closeSync(handle);
}


// =============================================================================
// Functions and state information for downloading files.
// =============================================================================

// Size of data fragments written to the hard disk.
const FRAGMENT_SIZE = 500000;  // 0.5MB

// Map download name to info such as total filesize, current size and versions.
const downloadsInfo = new Map();

// Map download name to http.IncomingMessage stream emitting downloaded data.
const downloadStreams = new Map();

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
 * Download data from open data stream for given download name.
 * @returns {Promise} - Resolves when download has successfully finished.
 */
function handleDownload(downloadName, stream) {
    const downloadInfo = downloadsInfo.get(downloadName);
    const { filename, currentSize } = downloadInfo;
    const buffer = Buffer.alloc(FRAGMENT_SIZE);
    let bufferOffset = 0;
    let fileOffset = currentSize;
    // Fill fragment buffer with received data chunks until full
    let totalChunkSize = 0;
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
                saveFragmentToDisk(filename, fileOffset, buffer);
                fileOffset += FRAGMENT_SIZE;
                downloadInfo.currentSize = fileOffset;
                bufferOffset = 0;
                stream.emit("progressing", getDownloadStatus(downloadName));
            }
        }
    });
    const cleanUp = () => {
        // Write final chunk to the disk
        if (bufferOffset > 0) {
            saveFragmentToDisk(filename, fileOffset, buffer, bufferOffset);
            downloadInfo.currentSize = fileOffset + bufferOffset;
            bufferOffset = 0;
        }
        // Delete download stream object
        if (downloadStreams.has(downloadName)) {
            downloadStreams.delete(downloadName);
        }
    };
    // If download is stopped (e.g. connection lost), save last data chunk
    stream.on("close", () => {
        console.log("STREAM HAS BEEN CLOSED!");
        cleanUp();
        const { totalSize: total, currentSize: current } = 
            downloadsInfo.get(downloadName);
        console.log("Downloaded %d of %d bytes.", current, total);
        stream.emit("progressing", getDownloadStatus(downloadName));
        if (total !== current) {
            stream.emit("connection-lost");
        }
    });
    stream.on("error", (error) => {
        console.log("ERROR OCCURRED IN STREAM!");
        cleanUp();
        stream.emit("connection-lost");
    });
    // If all data has been received
    return new Promise((resolve, reject) => {
        stream.on("end", () => {
            console.log("STREAM HAS ENDED!");
            cleanUp();
            const { totalSize: total, currentSize: current } = 
                downloadsInfo.get(downloadName);
            console.log("Downloaded %d of %d bytes.", current, total);
            console.log("Total chunk size: ", totalChunkSize);
            stream.emit("progressing", getDownloadStatus(downloadName));
            if (total !== current) return;
            fs.renameSync(
                paths.downloadDataPart(filename), paths.downloadData(filename));
            resolve();
        });
    });
}

/**
 * Get status information for download with given name in form of an object
 * { isActive, downloaded, remaining, total }.
 */
function getDownloadStatus(downloadName) {
    const { currentSize, totalSize } = downloadsInfo.get(downloadName);
    return {
        isActive: downloadStreams.has(downloadName),
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
    if (!downloadStreams.has(downloadName)) {
        throw new Error(`Download "${downloadName}" is currently not running.`);
    }
    downloadStreams.get(downloadName).destroy();
}

function stopAllDownloads() {
    for (const [downloadName, downloadStream] of downloadStreams) {
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

function getContentDownloadName (language, secondary) {
    return `CONTENT-${language}-${secondary}`;
}

function getContentFileVersions (language, secondary) {
    return utility.existsFile(paths.content(language, secondary).versions) ?
        require(paths.content(language, secondary).versions) : {};
}

content.getStatus = async function (language, secondary) {
    return await requestFromServerFull({
        target: "content",
        action: "info",
        languagePair: `${language}-${secondary}`,
        currentProgramVersion: app.version,
        currentFileVersions: getContentFileVersions(language, secondary)
    });
}

content.getDownloadStatus = function (language, secondary) {
    const downloadName = getContentDownloadName(language, secondary);
    if (!downloadsInfo.has(downloadName))
        return null;
    return getDownloadStatus(downloadName);
}

content.startDownload = async function (language, secondary) {
    const downloadName = getContentDownloadName(language, secondary);
    const downloadAlreadyExists = downloadsInfo.has(downloadName);
    // If download is already running, just return the download stream
    if (downloadStreams.has(downloadName)) {
        return downloadStreams.get(downloadName);
    }
    let currentSize;
    let totalSize;
    let requestedFileVersions;
    let minProgramVersions;
    let filename;
    if (!downloadAlreadyExists) {
        // If download doesn't exist yet, get latest file versions from server
        const contentStatus = await content.getStatus(language, secondary);
        if (!contentStatus.updateAvailable)
            throw `Content for language pair '${language}-${secondary}' is ` +
                  `already up to date.`;
        filename = `${language}-${secondary}.zip`;
        requestedFileVersions = contentStatus.latestFileVersions;
        minProgramVersions = contentStatus.minProgramVersions;
        currentSize = 0;
    } else {
        ({ currentSize, totalSize, requestedFileVersions, minProgramVersions,
           filename } = downloadsInfo.get(downloadName));
    }
    // TODO: Don't request data from server if 100% downloaded
    const response = await requestFromServer({
        target: "content",
        action: "download",
        offset: currentSize,
        languagePair: `${language}-${secondary}`,
        requestedFileVersions
    });
    if (!downloadAlreadyExists) {
        totalSize = parseInt(response.headers["content-length"]);
        // Create empty file to write downloaded data to
        fs.writeFileSync(
            paths.downloadDataPart(filename), Buffer.alloc(totalSize));
        // Create download info object for this download
        downloadsInfo.set(downloadName, {
            currentSize, totalSize, filename, requestedFileVersions,
            minProgramVersions
        });
        saveDownloadsInfo();
    }
    // Check again if a download is already running under this name
    if (downloadStreams.has(downloadName)) {
        return downloadStreams.get(downloadName);
    }
    downloadStreams.set(downloadName, response);
    // Start downloading data and process downloaded data afterwards
    handleDownload(downloadName, response).then(() => {
        const contentPaths = paths.content(language, secondary);
        // Create directory in content directory if it doesn't exist yet
        if (!utility.existsDirectory(contentPaths.directory)) {
            fs.mkdirSync(contentPaths.directory);
        }
        // Unzip new files into content directory
        extract(paths.downloadData(filename), { dir: contentPaths.directory },
        async (error) => {
            // TODO: Handle errors during unzip or the following procedures
            // Update content version register
            const versions = utility.existsFile(contentPaths.versions) ?
                require(contentPaths.versions) : {};
            for (const filename in requestedFileVersions) {
                versions[filename] = requestedFileVersions[filename];
            }
            fs.writeFileSync(
                contentPaths.versions, JSON.stringify(versions, null, 4));
            // Update minimum program version register
            const minProgramVersionsReg =
                utility.existsFile(contentPaths.minProgramVersions) ?
                require(contentPaths.minProgramVersions) : {};
            for (const filename in minProgramVersions) {
                minProgramVersionsReg[filename] = minProgramVersions[filename];
            }
            fs.writeFileSync(contentPaths.minProgramVersions,
                JSON.stringify(minProgramVersionsReg, null, 4));
            // Delete entry from downloads-register and delete the ZIP archive
            downloadsInfo.delete(downloadName);
            saveDownloadsInfo();
            fs.unlinkSync(paths.downloadData(filename));
            response.emit("finished");
        });
    });
    return response;
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
    return await requestFromServerFull({ target: "program", action: "info" });
};

module.exports.program = program;

// =============================================================================
// TODO TODO TODO Delete this later TODO TODO TODO
// =============================================================================
module.exports.content.testDownload = async function () {
    const requestedFileVersions = require("/home/daniel/Documents/AcnicoyData/Content/Japanese-English-1/versions.json")
    const query = {
        target: "content",
        action: "download",  // "info"
        languagePair: `Japanese-English`,
        offset: 0,
        requestedFileVersions
    };
    // const contentStatus = await requestFromServerFull({
    //     target: "content",
    //     action: "info",
    //     languagePair: `Japanese-English`,
    //     currentProgramVersion: app.version,
    //     currentFileVersions: {}
    // });
    const options = {
        baseUrl: HOSTNAME,
        url: SCRIPT_URI,
        method: "POST",
        timeout: TIMEOUT_DURATION,
        headers: { "Content-Type": "application/json",
                   "Accept-Encoding": "identity",
                   "Cache-Control": "no-cache, no-store, no-transform" },
        encoding: null,
        body: JSON.stringify(query)
    };
    const stream = request(options, (error, response, body) => {
        if (error) {
            console.log("Error: ", error);
            return;
        }
        // console.log("Status code:", response.statusCode);
        // console.log("Content type", response.headers["content-type"]);
        // console.log("Received response of size:",
        //         parseInt(response.headers["content-length"]));
        console.log("Full body size: ", body.length);
        // if (response.headers["content-type"] == "application/json") {
        //     console.log("Body: ", body.toString());
        // } else {
        //     console.log("Body: ", body);
        // }
    }).on("response", (response) => {
        if (response.statusCode !== 200 && response.statusCode !== 201) {
            console.log("DAFUQ");
            return;
        }
        console.log(response);
        stream.headers = response.headers;
        stream.destroy = () => {
            console.log("'stream.destroy' is called!");
            response.destroy();
        };
        let sumChuckSizes = 0;
        let numChunksReceived = 0;
        const sleep = require("sleep");
        stream.on("data", (chunk) => {
            sumChuckSizes += chunk.length;
            ++numChunksReceived;
            if (numChunksReceived % 3000 === 0) {
                console.log(`Sum of chunk sizes: ${sumChuckSizes}`);
            }
        });
        stream.on("error", (error) => {
            console.log("Error: ", error);
        });
        stream.on("end", (chunk) => {
            console.log(`Sum of chunk sizes: ${sumChuckSizes}`);
        });
    });
};
