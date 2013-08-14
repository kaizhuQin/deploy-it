/**
 * User: garcia.wul (garcia.wul@alibaba-inc.com)
 * Date: 13-8-14
 * Time: 下午1:44
 * 用于监听hosts文件后，刷新dns缓存
 */

var exec = require('child_process').exec;

var log4js = require('log4js');
var logger = log4js.getLogger("on-hosts-change-flush");
var os = require("os");
module.exports = function(config, filePath, stat, syncStatusEmitter) {
    var flushDnsCommand = null;
    logger.info("platform is " + os.platform());
    if (os.platform() === "darwin") {
        flushDnsCommand = "sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder";
    }
    else if (os.platform() === "linux") {
        flushDnsCommand = "sudo /etc/init.d/nscd restart";
    }
    else if (os.platform() === "win32") {
        flushDnsCommand = "ipconfig /flushdns";
    }
    if (flushDnsCommand === null) {
        syncStatusEmitter.emit("synced");
        return;
    }
    exec(flushDnsCommand, function(error, stdout, stderr) {
        if (error) {
            logger.error(error);
        }
        if (stderr) {
            logger.error(stderr);
        }
        if (stdout) {
            logger.info(stdout)
        }
        syncStatusEmitter.emit("synced");
    });

};