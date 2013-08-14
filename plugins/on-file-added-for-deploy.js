/**
 * User: garcia.wul (garcia.wul@alibaba-inc.com)
 * Date: 13-8-7
 * Time: 上午9:37
 * 为了远程部署准备的文件创建时的回调
 */

var fs = require("fs");
var path = require("path");
var util = require("util");

var Connection = require("ssh2");
var log4js = require('log4js');
var nodeproxy = require('nodeproxy');
var StringUtils = require("underscore.string");
var findSync = require("findit");
var EventEmitter = require('events').EventEmitter;

module.exports = function(config, filePath, stat) {
    var logger = log4js.getLogger("watcher");
    var connection = new Connection();
    connection.on("connect", onConnecting);
    connection.on("error", onConnectError);
    connection.on("end", onConnectEnd);
    connection.on("close", onConnectClosed);
    connection.on("ready", onConnectReady);

    function onConnecting() {
        logger.debug("on ssh connecting");
    }

    /**
     * 拼装出远程的文件路径
     */
    function joinRemoteFile(filePath) {
        var postfix = StringUtils.lstrip(filePath, {source: config.localPath});
        postfix = StringUtils.lstrip(postfix, {source: path.sep});
        var remoteFile = path.join(config.remotePath, postfix);
        remoteFile = remoteFile.split(path.sep).join(config.remotePathSep);
        return remoteFile;
    }

    /**
     * 创建目录
     */
    function makeRootDirectory(dirName, fileNames, syncEmitter, remoteFile, sftp) {
        var command = util.format("mkdir -pv %s", dirName);
        logger.debug(command);
        connection.exec(command, function(error, stream) {
            if (error) {
                logger.error(error);
                return;
            }
            stream.on("exit", function() {
                syncEmitter.emit("next", fileNames, syncEmitter, remoteFile, sftp);
            });
        });
    }

    function onTriggerNextSync(fileNames, syncEmitter, remoteFile, sftp) {
        if (!fileNames || fileNames.length <= 0) {
            syncEmitter.removeListener("next", function() {});
            nodeproxy(onFastPutCallback, {
                sftp: sftp,
                connection: connection,
                remoteFile: remoteFile
            })();
            return;
        }

        var fileName = fileNames.shift();
        var remoteFile = joinRemoteFile(fileName);
        var command = null;
        logger.info(util.format("syncing %s to %s", fileName, remoteFile));
        if (fs.statSync(fileName).isDirectory()) {
            command = util.format("mkdir -pv %s", remoteFile);
            connection.exec(command, function(error, stream) {
                stream.on("exit", onTriggerNextSync);
            });
        }
        else if (fs.statSync(fileName).isFile()) {
            command = util.format(
                "mkdir -pv %s", path.dirname(remoteFile));
            connection.exec(command, function(error, stream) {
                sftp.fastPut(fileName, remoteFile, function() {
                    syncEmitter.emit("next",
                        fileNames, syncEmitter, remoteFile, sftp);
                });
            });
        }
    }

    function onConnectReady() {
        logger.debug("on ssh connect ready");
        connection.sftp(function(error, sftp) {
            if (error) {
                logger.error("sftp open error: " + error);
                return;
            }

            sftp.on("end", function() {
                logger.debug("sftp session end");
            });

            var remoteFile = joinRemoteFile(filePath);
            logger.debug(util.format('ready to sync %s to %s', filePath, remoteFile));

            // TODO garcia.wul 这块用ssh2做起来比较麻烦，暂时先调用命令
            var command = util.format("rm -rf %s", remoteFile);
            logger.debug(command);

            connection.exec(command, function(error, stream) {
                stream.on("exit", function(code, signal) {
                    if (stat.isDirectory()) {
                        var fileNames = findSync.sync(filePath);
                        var syncEmitter = new EventEmitter();
                        syncEmitter.addListener("next", onTriggerNextSync);
                        makeRootDirectory(filePath, fileNames, syncEmitter,
                            remoteFile, sftp);
                    }
                    else if (stat.isFile()) {
                        command = util.format("mkdir -pv %s", path.dirname(remoteFile));
                        logger.debug(command);
                        connection.exec(command, function(error, stream) {
                            sftp.fastPut(filePath, remoteFile,
                                nodeproxy(onFastPutCallback, {
                                sftp: sftp,
                                connection: connection,
                                remoteFile: remoteFile
                            }));
                        });
                    }
                    else {
                        logger.error(util.format("%s known type", filePath));
                    }
                });
            });
        });
    }

    function onFastPutCallback(error) {
        if (error) {
            logger.error(filePath + " fast put error: " + error);
        }
        logger.info(util.format("%s is synced", this.remoteFile));
        this.sftp.end();
        this.connection.end();
    }

    function onConnectError(error) {
        logger.error("on ssh connect error: " + error);
    }

    function onConnectEnd() {
        logger.debug("on ssh connect end");
    }

    function onConnectClosed() {
        logger.debug("on ssh connect closed");
    }

    connection.connect({
        host: config.sftp.host,
        port: config.sftp.port,
        username: config.sftp.username,
        password: config.sftp.password
    });
};