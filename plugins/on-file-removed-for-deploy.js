/**
 * User: garcia.wul (garcia.wul@alibaba-inc.com)
 * Date: 13-8-7
 * Time: 下午1:27
 *
 */

var path = require("path");
var util = require("util");

var Connection = require("ssh2");
var log4js = require('log4js');
var nodeproxy = require('nodeproxy');
var StringUtils = require("underscore.string");

module.exports = function(config, filePath, stat) {
    var logger = log4js.getLogger("watcher");
    var connection = new Connection();
    connection.on("connect", onConnecting);
    connection.on("error", onConnectError);
    connection.on("end", onConnectEnd);
    connection.on("close", onConnectClosed);
    connection.on("ready", onConnectReady);

    function onConnecting() {
        logger.info("on ssh connecting");
    }

    function onConnectReady() {
        logger.info("on ssh connect ready");
        var postfix = StringUtils.lstrip(filePath, config.localPath);
        postfix = StringUtils.lstrip(postfix, "/");
        var remoteFile = path.join(config.remotePath, postfix);
        remoteFile = remoteFile.split(path.sep).join(config.remotePathSep);
        logger.info(util.format('ready to remove', filePath));
        // TODO garcia.wul 这块用ssh2做起来比较麻烦，暂时先调用命令
        var command = util.format("rm -rf %s", remoteFile);
        logger.info(command);
        connection.exec(command, function(error, stream) {
            stream.on("exit", function(code, signal) {
                logger.info(util.format("%s is removed", remoteFile));
                connection.end();
            });
        });
    }

    function onConnectError(error) {
        logger.error("on ssh connect error: " + error);
    }

    function onConnectEnd() {
        logger.info("on ssh connect end");
    }

    function onConnectClosed() {
        logger.info("on ssh connect closed");
    }

    connection.connect({
        host: config.sftp.host,
        port: config.sftp.port,
        username: config.sftp.username,
        password: config.sftp.password
    });
};