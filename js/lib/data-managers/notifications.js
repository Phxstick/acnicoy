"use strict";

const fs = require("fs-extra");

module.exports = function (paths, modules) {
    const notificationsManager = {};
    let notifications;
    let isModified = false;

    notificationsManager.initialize = function () {
        if (!fs.existsSync(paths.notifications)) {
            fs.writeFileSync(paths.notifications, JSON.stringify([]));
        }
        notifications = require(paths.notifications);
    };

    notificationsManager.saveGlobal = function () {
        if (!isModified) return;
        fs.writeFileSync(paths.notifications, JSON.stringify(notifications));
        isModified = false;
    };

    notificationsManager.get = function () {
        return [...notifications];
    };

    notificationsManager.add = function (type, data) {
        const id = notifications.length === 0 ? 0 : notifications.last().id + 1;
        const date = utility.getTime();
        const notification = { id, date, type, data, highlighted: true };
        notifications.push(notification);
        isModified = true;
        return notification;
    };

    notificationsManager.delete = function (id) {
        for (const notification of notifications) {
            if (notification.id === id) {
                notifications.remove(notification);
                isModified = true;
                return true;
            }
        }
        return false;
    };

    notificationsManager.deleteAll = function () {
        notifications.length = 0;
        isModified = true;
    };

    notificationsManager.unhighlightAll = function () {
        for (let i = notifications.length - 1; i >= 0; --i) {
            if (!notifications[i].highlighted)
                break;
            notifications[i].highlighted = false;
            isModified = true;
        }
    };

    return notificationsManager;
}
