"use strict";

const http = require("http");
const fs = require("fs");

//
// Functions for communicating with the server.
// ____________________________________________________________________________

/**
**  Send HTTP request to server with query defined by given object. Return
**  the response of the server as http.IncomingMessage object.
**/
function queryServer(queryObject) {
    const host = "http://www.acnicoy.netne.net/";
    const downloadScript = "download.php";
    return new Promise((resolve, reject) => {
        const queryArray = [];
        for (const key in queryObject) {
            queryArray.push(key + "=" + queryObject[key]);
        }
        const queryString = queryArray.join("&");
        console.log("Query string is ", queryString);
        http.get(host + downloadScript + "?" + queryString, (response) => {
            console.log("Response is ", response);
            if (response.statusCode !== 200) {
                reject(
                    `Error ${response.statusCode}: ${response.statusMessage}`);
            }
            resolve(response);
            // TODO: Introduct timeout for this method
        });
    });
}
module.exports.queryServer = queryServer;

/**
**  Given an http.IncomingMessage object, return a promise which resolves with
**  the complete data in a buffer as soon as it's all received.
**/
function getAllData(message) {
    let data = Buffer.alloc(parseInt(message.headers["content-length"]));
    let offset = 0;
    return new Promise((resolve, reject) => {
        message.on("data", (chunk) => {
            chunk.copy(data, offset);
            offset += chunk.length;
        });
        message.on("error", () => {
            reject("Error: Stream has been terminated.");
        });
        message.on("end", () => {
            resolve(data);
        });
    });
}

//
// Functions for handling disk IO.
// ____________________________________________________________________________

/**
**  If a *.offset file exists for file with given filename, return the value
**  stored in that offset file, otherwise 0.
**/
function getFileOffset(filename) {
    const dataOffsetPath = paths.downloadDataOffset(filename);
    if (utility.existsFile(dataOffsetPath)) {
        return parseInt(fs.readFileSync(dataOffsetPath, "utf8"));
    }
    return 0;
}

/**
**  Given a filename for a download and the total expected size of that file,
**  create *.offset and *.part files.
**/
function initializeDownloadFiles(filename, filesize) {
    const dataPartPath = paths.downloadDataPart(filename);
    const dataOffsetPath = paths.downloadDataOffset(filename);
    if (!utility.existsFile(dataPartPath)) {
        console.log("Creating file at path ", dataPartPath);
        fs.writeFileSync(dataPartPath, Buffer.alloc(filesize));
    }
    if (!utility.existsFile(dataOffsetPath)) {
        console.log("Creating file at path ", dataOffsetPath);
        fs.writeFileSync(dataOffsetPath, "0");
    }
}

/**
**  Given a buffer with a fragment of the data for a download, write data
**  fragment to file with given filename starting at given file offset.
**  If a length is given, only copy that much data from the buffer.
**/
function saveFragmentToDisk(filename, fileOffset, fragment, length) {
    if (length === undefined) {
        length = fragment.length;
    }
    const dataPartPath = paths.downloadDataPart(filename);
    const dataOffsetPath = paths.downloadDataOffset(filename);
    const handle = fs.openSync(dataPartPath, "r+");
    fs.writeSync(handle, fragment, 0, length, fileOffset);
    fs.writeFileSync(dataOffsetPath, fileOffset + length);
}

//
// Functions and state information for downloading files.
// ____________________________________________________________________________

// Size of data fragments written to the hard disk.
const fragmentSize = 5000000;  // 0.5MB

// Map filename of a downloaded file to http.IncomingMessage object.
const downloads = new Map();

// Map filename to an object { downloading, downloaded, remaining, total }.
const statuses = new Map();

/**
**  Initialize download status for file with given filename. If file download
**  has never started, download status is null.
**/
function initializeDownloadStatus(filename) {
    // If content is fully downloaded
    if (utility.existsFile(paths.downloadData(filename))) {
        const totalSize = fs.statSync(paths.downloadData(filename)).size;
        statuses.set(filename, {
            downloading: false,
            downloaded: totalSize,
            remaining: 0,
            total: totalSize
        });
    // If content is partly downloaded
    } else if (utility.existsFile(paths.downloadDataPart(filename))) {
        const totalSize = fs.statSync(paths.downloadDataPart(filename)).size;
        const currentSize = getFileOffset(filename);
        statuses.set(filename, {
            downloading: false,
            downloaded: currentSize,
            remaining: totalSize - currentSize,
            total: totalSize
        });
    // Otherwise content download has not even started
    } else {
        statuses.set(filename, null);
    }
}

/**
**  Return download status for file with given filename.
**/
function getDownloadStatus(filename) {
    initializeDownloadStatus(filename);
    return statuses.get(filename);
}

/**
**  Start download for file with given filename. Return promise resolving to
**  true if the download was successfully started, otherwise false.
**/
function startDownload(filename) {
    initializeDownloadStatus(filename);
    if (statuses.get(filename) !== null &&
            statuses.get(filename).remaining === 0) {
        return Promise.reject(`File ${filename} is already downloaded.`);
    };
    let fileOffset = getFileOffset(filename);
    return queryServer({ file: filename }).then((response) => {
        return getAllData(response).then((data) => {
            const filesize = parseInt(data.toString("utf8"));
            initializeDownloadFiles(filename, filesize);
            initializeDownloadStatus(filename);
            console.log("Querying server...");
            return queryServer({ file: filename, offset: fileOffset });
        });
    }).then((response) => {
        const status = statuses.get(filename);
        status.downloading = true;
        console.log("Starting download.");
        downloads.set(filename, response);
        const buffer = Buffer.alloc(fragmentSize);
        let bufferOffset = 0;
        // Fill fragment buffer with received data chunks until full
        response.on("data", (chunk) => {
            let chunkOffset = 0;
            let chunkRestSize = chunk.length;
            while (chunkRestSize > 0) {
                const bufferSpaceLeft = fragmentSize - bufferOffset;
                const copySize = Math.min(bufferSpaceLeft, chunkRestSize);
                chunk.copy(buffer, bufferOffset, chunkOffset,
                        chunkOffset + copySize);
                bufferOffset += copySize;
                chunkOffset += copySize;
                chunkRestSize -= copySize;
                // If buffer has been filled, write fragment to disk
                if (bufferOffset === fragmentSize) {
                    saveFragmentToDisk(filename, fileOffset, buffer);
                    fileOffset += fragmentSize;
                    bufferOffset = 0;
                }
            }
            status.downloaded = fileOffset + bufferOffset;
            status.remaining = status.total - fileOffset - bufferOffset;
            console.log(`Downloaded ${
                (100 * status.downloaded / status.total).toFixed(2)
            }`
                        + ` percent of data.`);
            // TODO: Notification event that download is progressing
        });
        // If download cannot continue (e.g. connection lost)
        response.on("close", () => {
            console.log("Received close event!");
            if (bufferOffset > 0) {
                saveFragmentToDisk(filename, fileOffset, bufferOffset);
                bufferOffset = 0;
            }
            downloads.delete(filename);
            status.downloading = false;
        });
        response.on("error", () => {
            console.log("Received error event!");
            if (bufferOffset > 0) {
                saveFragmentToDisk(filename, fileOffset, bufferOffset);
                bufferOffset = 0;
            }
            downloads.delete(filename);
            status.downloading = false;
            // TODO: Wait for connection to become available again and restart
        });
        // If all data has been received
        response.on("end", () => {
            // Write final chunk to the disk
            if (bufferOffset > 0) {
                saveFragmentToDisk(filename, fileOffset, bufferOffset);
                bufferOffset = 0;
            }
            downloads.delete(filename);
            status.downloading = false;
            // TODO: Notification event that download is finished
            // TODO: Unzip file in the language download section
        });
        return true;
    });/*, (error) => {
        console.log(`Download could not be started (${error}).`);
        return false;
    });*/
}

/**
**  Stop download for file with given filename.
**/
function stopDownload(filename) {
    if (!downloads.has(filename)) {
        throw new Error(`Could not find download for file "${filename}".`);
    }
    downloads.get(filename).destroy();
    // TODO: Save remaining data in buffer here somehow
}

function stopAllDownloads() {
    for (const filename in downloads) {
        stopDownload(filename);
    }
}

//
// Functions for managing language content downloads.
// ____________________________________________________________________________

const content = {};

content.isAvailable = function (language, secondary) {
    // TODO
}

content.getDownloadStatus = function (language, secondary) {
    const filename = `${language}-${secondary}.zip`;
    return getDownloadStatus(filename);
}

content.startDownload = function (language, secondary) {
    const filename = `${language}-${secondary}.zip`;
    return startDownload(filename);
}

content.stopDownload = function (language, secondary) {
    const filename = `${language}-${secondary}.zip`;
    return stopDownload(filename);
}

module.exports.stopAllDownloads = stopAllDownloads;
module.exports.content = content;
