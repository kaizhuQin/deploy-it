/**
 * User: garcia.wul (garcia.wul@alibaba-inc.com)
 * Date: 13-8-6
 * Time: 下午3:42
 * 监听某一个目录
 */

var fs = require("fs");
var path = require("path");
var util = require("util");

var handlebars = require("handlebars");
var log4js = require('log4js');
var watch = require("watch");
var underscore = require("underscore");
var EventEmitter = require('events').EventEmitter;
var timers = require("timers");

module.exports = function (config) {
    var self = {};
    var logger = log4js.getLogger("watcher");
    logger.setLevel(config.logLevel);
    var isSyncing = false;

    var rootPath = path.normalize(path.join(__dirname, ".."));
    var pluginPath = path.normalize(path.join(rootPath, "plugins"));

    logger.info("watching: " + config.localPath);
    var changedFiles = [];

    if (fs.statSync(config.localPath).isDirectory()) {
        var syncStatusEmitter = new EventEmitter();
        syncStatusEmitter.on("synced", onTriggerSynced);

        timers.setInterval(function() {
            sync();
        }, 10);

        watch.createMonitor(config.localPath, function (monitor) {
            monitor.on("created", onFileAdded);
            monitor.on("changed", onFileChanged);
            monitor.on("removed", onFileRemoved);
        });
    }
    else {
        fs.watch(config.localPath, {persistent: true}, function(event, filePath) {
            onFileChanged(config.localPath, fs.statSync(config.localPath));
        });
    }

    function onTriggerSynced() {
        logger.debug("trigger synced ...");
        isSyncing = false;
    }

    function sync() {
        if (changedFiles.length <= 0 || isSyncing === true) {
            return;
        }
        isSyncing = false;
        var item = changedFiles.shift();
        if (item.event === "added") {
            if (config.hasOwnProperty("onFileAdded")) {
                require(handlebars.compile(config.onFileAdded)({
                    pluginsPath: pluginPath
                }))(config, item.filePath, item.stats, syncStatusEmitter);
            }
        }
        else if (item.event === "changed") {
            if (config.hasOwnProperty("onFileChanged")) {
                require(handlebars.compile(config.onFileChanged)({
                    pluginsPath: pluginPath
                }))(config, item.filePath, item.stats, syncStatusEmitter);
            }
        }
        else if (item.event === "removed") {
            if (config.hasOwnProperty("onFileRemoved")) {
                require(handlebars.compile(config.onFileRemoved)({
                    pluginsPath: pluginPath
                }))(config, item.filePath, item.stats, syncStatusEmitter);
            }
        }
    }

    /**
     * 当文件被添加时的回调
     * @param filePath
     * @param stats
     */
    function onFileAdded(filePath, stats) {
        filePath = path.normalize(filePath);
        logger.debug(util.format("%s was added, is directory: %d",
            filePath, stats.isDirectory()));
        if (isExcludeFile(filePath)) {
            logger.debug(filePath + " is ignored");
            return;
        }
        pushChangedFiles({
            event: 'added',
            filePath: filePath,
            stats: stats
        });
    }

    /**
     * 当文件被修改时的回调
     * @param filePath
     * @param stats
     */
    function onFileChanged(filePath, stats) {
        filePath = path.normalize(filePath);
        logger.debug(filePath + " is changed");
        if (isExcludeFile(filePath)) {
            logger.debug(filePath + " is ignored");
            return;
        }
        pushChangedFiles({
            event: 'changed',
            filePath: filePath,
            stats: stats
        });
    }

    /**
     * 当文件被删除时的回调
     * @param filePath
     * @param stats
     */
    function onFileRemoved(filePath, stats) {
        filePath = path.normalize(filePath);
        logger.debug(filePath + " is removed");
        if (isExcludeFile(filePath)) {
            logger.debug(filePath + " is ignored");
            return;
        }
        pushChangedFiles({
            event: 'removed',
            filePath: filePath,
            stats: stats
        });
    }

    function pushChangedFiles(item) {
        var result = false;
        if (changedFiles.length <= 0) {
            changedFiles.push(item);
            return;
        }
        var lastItem = changedFiles[changedFiles.length - 1];
        if (lastItem.filePath === item.filePath &&
            lastItem.event == item.event) {
        }
        else {
            changedFiles.push(item);
        }
    }

    function isExcludeFile(filePath) {
        var result = false;
        if (!config.hasOwnProperty("excludes")) {
            return false;
        }
        underscore.each(config.excludes, function(exclude) {
            if (result === true) {
                return;
            }
            if (new RegExp(exclude, "i").test(filePath)) {
                result = true;
            }
        });
        return result;
    }

    return self;
};