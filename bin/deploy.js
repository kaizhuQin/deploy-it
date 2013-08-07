#!/usr/bin/env node
/**
 * User: garcia.wul (garcia.wul@alibaba-inc.com)
 * Date: 13-8-6
 * Time: 下午5:40
 *
 */

var fs = require("fs");
var path = require("path");

var extend = require("node.extend");
var yaml = require('js-yaml');

var fileWatcher = require(path.join(__dirname, "..", "lib", "file-watcher.js"));

if (process.argv.length !== 3) {
    console.log("node deploy.js test.yaml");
    process.exit(1);
}

var configFile = process.argv[2];
yaml.loadAll(fs.readFileSync(configFile, "utf-8"), function(config) {
    var defaultConfig = {
        logLevel: "DEBUG"
    };
    extend(true, defaultConfig, config);
    defaultConfig.localPath = path.normalize(defaultConfig.localPath);
    fileWatcher(defaultConfig);
});