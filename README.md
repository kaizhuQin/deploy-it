# 背景
有两个原因触发我整这么个工具：

* 公司的电脑实在有点慢，而用于测试的测试机不错。因此何不在开发时就把代码自动部署到测试机上，给自己的破电脑减减负。
* 写C++，又想用自己电脑中的IDE，但在这里电脑上又没法编译，依赖的东西太多了。
   
因此，就想有这么一个工具，能够自动把我在本地写的代码同步到测试机上，然后自动编译、启动等。

# 功能

* 监听目录，目录下有任何添加、删除、修改都会被监听到
* 自定义响应操作

# 安装
因为这个工具是用[node.js](http://nodejs.org/)写的，因此得先安装node.js.
安装完node.js后，使用npm安装deploy-it即可。

    npm install deploy-it

# 使用
运行前需要写一个配置文件，配置文件可以参考[example.yaml](https://github.com/magicsky/deploy-it/blob/master/example.yaml)
配置采用[YAML](http://www.yaml.org/)格式

    deploy.js test.yaml

## 配置

    # 配置远程主机名，目前只支持sftp的
    sftp:
      host: 10.12.1.195
      port: 22
      username: user
      password: hello
    
    # 监听本地哪一个目录
    localPath: /Users/wul/zone/ais
    # 同步到远程的哪一个目录
    remotePath: /home/wul/zone/ais
    # 远程服务器用什么路径分隔
    remotePathSep: "/"

    # 当文件有被修改时的动作
    # 其中的{{{pluginsPath}}}是在plugins这个目录，当然用户也可以写绝对路径
    onFileAdded: "{{{pluginsPath}}}/on-file-added-for-deploy.js"
    # 当文件有被添加时的动作
    onFileChanged: "{{{pluginsPath}}}/on-file-added-for-deploy.js"
    # 当文件有被删除时的动作
    onFileRemoved: "{{{pluginsPath}}}/on-file-removed-for-deploy.js"
    
    # 哪些文件被忽略,支持正则表达式
    excludes:
      - ".class$"

# 自定义响应操作
这个工具支持当监听到文件有修改时的，自定义响应操作，具体的可以参考：[on-file-removed-for-deploy.js](https://github.com/magicsky/deploy-it/blob/master/plugins/on-file-removed-for-deploy.js)

# 更新日志
## 0.0.2

* 解决当添加一个目录时，这个目录里面有文件，里面的文件没有被同步的bug [#1](#https://github.com/magicsky/deploy-it/issues/1)
* mac下会触发两次added事件问题修复[#2](https://github.com/magicsky/deploy-it/issues/2)，但解决办法还不是很完美：放到一个list中，搞了一个interval

## 0.0.1

* 初始版本
      
