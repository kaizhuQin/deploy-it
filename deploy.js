#!/usr/bin/env node
/**
 * User: garcia.wul (garcia.wul@alibaba-inc.com)
 * Date: 13-3-27
 * Time: 下午4:31
 *
 */

var fs = require("fs");
var yaml = require('js-yaml');
var watchTree = require("fs-watch-tree").watchTree;
var Handlebar = require("handlebars");
var exec = require("child_process").exec;
var underscore = require("underscore");
var path = require("path");

if (process.argv.length !== 3) {
    console.log("node deploy.js test.yaml");
    process.exit(1);
}

var scpCommand = Handlebar.compile([
    '#!/usr/bin/expect -f',
    'spawn scp -r -p {{{filename}}} {{{username}}}@{{{host}}}:{{{remotePath}}}/{{{remoteFilename}}}',
    'expect {',
        '"*Are you sure you want to continue connecting*" {',
        'send "yes\\r"',
        'expect "*assword*"',
        'send "{{{password}}}\\r"',
    '}',
        '"*assword*" {',
        'send "{{{password}}}\\r"',
        '}',
    '}',
    'interact'
].join("\n"));

var deleteCommand = Handlebar.compile([
    '#!/usr/bin/expect -f',
    'spawn ssh {{{username}}}@{{{host}}} "rm -rf {{{remoteFilename}}}"',
    'expect {',
        '"*Are you sure you want to continue connecting*" {',
        'send "yes\\r"',
        'expect "*assword*"',
        'send "{{{password}}}\\r"',
    '}',
        '"*assword*" {',
        'send "{{{password}}}\\r"',
        '}',
    '}',
    'interact'
].join("\n"));

function writeAndExecute(command) {
    var tmpFile = "/tmp/" + Date.now();
    fs.writeFileSync(tmpFile, command, "utf-8");
    exec("expect " + tmpFile, function(error, stdout, stderr) {
        if (error !== null) {
            console.log("sync error: " + error);
            console.log(stderr);
        }
        else {
            console.log(stdout);
        }
        fs.unlinkSync(tmpFile);
    });
}

var sassCommandTemplate = Handlebar.compile(
    "sass --no-cache --style {{{style}}} {{{scssFile}}} {{{targetFile}}}"
);
function compileSass(scssFile) {
    underscore.each([
        {
            style: 'expanded'
        },
        {
            style: "compressed"
        }
    ], function(content, index) {
        var extName = path.extname(scssFile);
        var command = sassCommandTemplate({
            style: content.style,
            scssFile: scssFile,
            targetFile: content.style === "compressed" ?
                scssFile.replace(extName, "") + "-min.css" :
                scssFile.replace(extName, "") + ".css"
        });
        exec(command);
    });
}

var configFile = process.argv[2];
yaml.loadAll(fs.readFileSync(configFile, "utf-8"), function(content) {
    console.log("watching: " + content.localPath);
    var watcher = watchTree(content.localPath, {
        exclude: content.excludes.map(function(exclude){return new RegExp(exclude);})
    },function(event) {
        var command = "";
        if (event.isDelete()) {
            console.log("deleted: " + event.name);
            command = deleteCommand({
                filename: event.name,
                username: content.sftp.username,
                password: content.sftp.password,
                host: content.sftp.host,
                remotePath: content.remotePath,
                remoteFilename: event.name.replace(content.localPath, content.remotePath)
            });
            writeAndExecute(command);
        }
        else {
            console.log("changed: " + event.name);
            command = scpCommand({
                filename: event.name,
                username: content.sftp.username,
                password: content.sftp.password,
                host: content.sftp.host,
                remotePath: content.remotePath,
                remoteFilename: event.name.replace(content.localPath, "")
            });
            writeAndExecute(command);
            if (!event.isDirectory() && path.extname(event.name) === ".scss") {
                compileSass(event.name);
            }
        }
    });
});
