"use strict";

const http = require("http");
const fs = require("fs");
const request = require("request");
const EventEmitter = require("events");
const unzip = require("unzip");

// =============================================================================
// Functions for communicating with the server.
// =============================================================================

const HOSTNAME = "http://acnicoy.netai.net";
const SCRIPT_URI = "/download.php";
const TIMEOUT_DURATION = 30000;

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
        const stream = request(options).on("error", (error) => {
            reject(new NoServerConnectionError(error.message));
        });
        request(options).on("response", (response) => {
            if (response.statusCode !== 200 && response.statusCode !== 201) {
                reject(new ServerRequestFailedError(
                    response.statusCode, response.statusMessage));
                return;
            }
            stream.headers = response.headers;
            stream.destroy = () => response.destroy();
            resolve(stream);
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
    let dataCounter = 0;
    // Fill fragment buffer with received data chunks until full
    stream.on("data", (chunk) => {
        let chunkOffset = 0;
        let chunkRestSize = chunk.length;
        dataCounter += chunk.length;
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
    if (!dataManager.content.isAvailable(language, secondary))
        return {};
    return require(paths.content(language, secondary).versions);
}

content.getStatus = async function (language, secondary) {
    const { updateAvailable,
            programUpdateRequired } = await requestFromServerFull({
        target: "content",
        action: "info",
        languagePair: `${language}-${secondary}`,
        currentProgramVersion: app.version,
        currentFileVersions: getContentFileVersions(language, secondary)
    });
    const downloadName = getContentDownloadName();
    const downloadExists = downloadsInfo.has(downloadName);
    const alreadyDownloaded =
        dataManager.content.isAvailable(language, secondary);
    return { alreadyDownloaded, downloadExists, updateAvailable,
             programUpdateRequired };
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
    let filename;
    if (!downloadAlreadyExists) {
        // If download doesn't exist yet, get latest file versions from server
        const contentStatus = await requestFromServerFull({
            target: "content",
            action: "info",
            languagePair: `${language}-${secondary}`,
            currentProgramVersion: app.version,
            currentFileVersions: getContentFileVersions(language, secondary)
        });
        if (!contentStatus.updateAvailable)
            throw `Content for language pair '${language}-${secondary}' is ` +
                  `already up to date.`;
        filename = `${language}-${secondary}.zip`;
        requestedFileVersions = contentStatus.latestFileVersions;
        currentSize = 0;
    } else {
        ({ currentSize, totalSize, requestedFileVersions, filename } =
            downloadsInfo.get(downloadName));
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
            currentSize, totalSize, filename, requestedFileVersions
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
        const { totalSize, currentSize } = downloadsInfo.get(downloadName);
        const contentPaths = paths.content(language, secondary);
        // Create directory in content directory if it doesn't exist yet
        if (!dataManager.content.isAvailable(language, secondary)) {
            fs.mkdirSync(contentPaths.directory);
        }
        // Unzip new files into content directory
        fs.createReadStream(paths.downloadData(filename))
        .pipe(unzip.Extract({ path: contentPaths.directory }))
        .on("close", async () => {
            // Update version register
            let versions;
            if (dataManager.content.isAvailable(language, secondary)) {
                versions = require(contentPaths.versions);
            } else {
                versions = {};
            }
            const newVersions =
                downloadsInfo.get(downloadName).requestedFileVersions;
            for (const filename in newVersions) {
                versions[filename] = newVersions[filename];
            }
            fs.writeFileSync(
                contentPaths.versions, JSON.stringify(versions, null, 4));
            downloadsInfo.delete(downloadName);
            saveDownloadsInfo();
            fs.unlinkSync(paths.downloadData(filename));
            await dataManager.content.load(language);
            dataManager.content.setLanguage(language);
            await main.processLanguageContent(language, secondary);
            main.adjustToLanguageContent(language, secondary);
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
