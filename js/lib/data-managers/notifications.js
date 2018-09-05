"use strict";

const fs = require("fs-extra");
const compareVersions = require("compare-versions");

module.exports = function (paths, modules) {
    const notificationsManager = {};
    const notificationList = [];
    let isModified = false;

    notificationsManager.initialize = function () {
        // Get global notifications from user data
        if (!fs.existsSync(paths.notifications)) {
            fs.writeFileSync(paths.notifications, JSON.stringify([]));
        }
        const global = require(paths.notifications);
        // Get local notifications from local storage
        if (!storage.get("notifications")) {
            storage.set("notifications", []);
        }
        const local = storage.get("notifications");
        // Merge global and local notifications chronologically
        let g = 0;
        let l = 0;
        while (g < global.length || l < local.length) {
            if (g === global.length) {
                notificationList.push(local[l++]);
            } else if (l === local.length) {
                notificationList.push(global[g++]);
            } else if (global[g].date < local[l].date) {
                notificationList.push(global[g++]);
            } else {
                notificationList.push(local[l++]);
            }
        }
        const notificationsCopy = [...notificationList];
        // Remove notifications which are not needed anymore
        for (const { type, id, data } of notificationsCopy) {
            if (type === "content-download-finished" ||
                    type === "content-installation-finished") {
                notificationsManager.delete(id);
            } else if (type === "program-update-available") {
                const curVersion = require(paths.packageInfo).version;
                if (compareVersions(curVersion, data.latestVersion) >= 0) {
                    notificationsManager.delete(id);
                }
            }
        }
    };

    notificationsManager.saveGlobal = function () {
        if (!isModified) return;
        // Separate global and local notifications (by their id)
        const global = [];
        const local = [];
        for (const notification of notificationList) {
            if (notification.id[0] === "g") {
                global.push(notification);
            } else {
                local.push(notification);
            }
        }
        // Save global and local notifications to their respective locations
        fs.writeFileSync(paths.notifications, JSON.stringify(global));
        storage.set("notifications", local);
        isModified = false;
    };

    notificationsManager.get = function () {
        return [...notificationList];
    };

    notificationsManager.add = function (type, data, global=false) {
        // Prefix id with "g" or "l" depending on whether it's global or local
        const id = (global ? "g" : "l") + (notificationList.length === 0 ? "0" :
                (parseInt(notificationList.last().id.slice(1)) + 1).toString());
        const date = utility.getTime();
        const notification = { id, date, type, data, highlighted: true };
        notificationList.push(notification);
        isModified = true;
        return notification;
    };

    notificationsManager.delete = function (id) {
        for (const notification of notificationList) {
            if (notification.id === id) {
                notificationList.remove(notification);
                isModified = true;
                return true;
            }
        }
        return false;
    };

    notificationsManager.deleteAll = function () {
        notificationList.length = 0;
        isModified = true;
    };

    notificationsManager.unhighlightAll = function () {
        for (let i = notificationList.length - 1; i >= 0; --i) {
            if (!notificationList[i].highlighted)
                break;
            notificationList[i].highlighted = false;
            isModified = true;
        }
    };

    return notificationsManager;
}
