/**
 * User: garcia.wul (garcia.wul@alibaba-inc.com)
 * Date: 13-8-6
 * Time: 下午3:42
 * 监听某一个目录
 */

var path = require("path");
var util = require("util");

var handlebars = require("handlebars");
var log4js = require('log4js');
var watch = require("watch");
var underscore = require("underscore");

module.exports = function (config) {
    var self = {};
    var logger = log4js.getLogger("watcher");
    logger.setLevel(config.logLevel);

    var rootPath = path.normalize(path.join(__dirname, ".."));
    var pluginPath = path.normalize(path.join(rootPath, "plugins"));

    logger.info("watching: " + config.localPath);
    watch.createMonitor(config.localPath, function (monitor) {
        monitor.on("created", onFileAdded);
        monitor.on("changed", onFileChanged);
        monitor.on("removed", onFileRemoved);
    });

    /**
     * 当文件被添加时的回调
     * @param filePath
     * @param stats
     */
    function onFileAdded(filePath, stats) {
        filePath = path.normalize(filePath);
        logger.info(util.format("%s was added, is directory: %d",
            filePath, stats.isDirectory()));
        if (isExcludeFile(filePath)) {
            logger.info(filePath + " is ignored");
            return;
        }
        if (config.hasOwnProperty("onFileAdded")) {
            require(handlebars.compile(config.onFileAdded)({
                pluginsPath: pluginPath
            }))(config, filePath, stats);
        }
    }

    /**
     * 当文件被修改时的回调
     * @param filePath
     * @param stats
     */
    function onFileChanged(filePath, stats) {
        filePath = path.normalize(filePath);
        logger.info(filePath + " is changed");
        if (isExcludeFile(filePath)) {
            logger.info(filePath + " is ignored");
            return;
        }
        if (config.hasOwnProperty("onFileChanged")) {
            require(handlebars.compile(config.onFileChanged)({
                pluginsPath: pluginPath
            }))(config, filePath, stats);
        }
    }

    /**
     * 当文件被删除时的回调
     * @param filePath
     * @param stats
     */
    function onFileRemoved(filePath, stats) {
        filePath = path.normalize(filePath);
        logger.info(filePath + " is removed");
        if (isExcludeFile(filePath)) {
            logger.info(filePath + " is ignored");
            return;
        }
        if (config.hasOwnProperty("onFileRemoved")) {
            require(handlebars.compile(config.onFileRemoved)({
                pluginsPath: pluginPath
            }))(config, filePath, stats);
        }
    }

    function isExcludeFile(filePath) {
        var result = false;
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