"use strict";
/********************************************************
 HYHttpServer
瀚云nsp服务器
 一个简单的http服务器，可以处理普通文件
也可以处理nsp动态脚本

auth: iblold@gmail.com
date: 2017.9.22
*******************************************************/
const http = require('http');
const url = require('url');
const fs = require("fs");
const path = require("path");
const rd = require('rd');
const nsp = require("./nspinterpreter").class;
require("./sys/misc");


class HYHttpServer {
    constructor() {
        this.m_config = null;
        this.m_nps = new nsp();
    }

    init(configFile) {
        this.m_config = JSON.parse(fs.readFileSync(path.normalize(configFile)));
        if (this.m_config) {
            return true;
        } else {
            return false;
        }
    }

    start() {
        let port = this.m_config.port;
        let rootPath = this.m_config.root;

        // 扫描所有nsp文件并编译
        let nps = [];
        rd.eachFileFilterSync(rootPath, /\.nsp$/, function (f, s) {
            nps.push(f);
        });

        for (let i = 0; i < nps.length; ++i) {
            let end = (i == nps.length - 1);
            this.m_nps.compile(nps[i], (func, err) => {
                if (end) {

                    //创建一个服务
                    var httpServer = http.createServer(this.processRequest.bind(this));

                    httpServer.on("error", function (error) {
                        logg(logError, error);
                    });

                    //在指定的端口监听服务
                    httpServer.listen(port, function () {
                        logg(logInfo, "server is running at " + port);
                    });

                }
            });
        }
    }

    processRequest(request, response) {
        let self = this;
        // 跨域
        response.setHeader("Access-Control-Allow-Origin", "*");
        let urldata = url.parse(request.url);
        var pathName = decodeURI(urldata.pathname);

        //如果路径中没有扩展名
        if (path.extname(pathName) === '') {

            // 不是访问目录
            if (pathName.charAt(pathName.length - 1) != "/") {
                // 存在同名nsp
                if (fs.existsSync(path.join(this.m_config.root, pathName + ".nsp"))) {
                    pathName += ".nsp";
                } else {
                    // 重定向
                    pathName += "/";
                    var redirect = "http://" + request.headers.host + pathName;
                    response.writeHead(301, {
                        location: redirect
                    });
                    response.end();
                    return;
                }
            } else {
                // 访问目录, 尝试找到默认文件
                for (let i = 0; i < this.m_config.defaultPage.length; ++i) {
                    let tmp = path.join(this.m_config.root, pathName + this.m_config.defaultPage[i]);
                    if (fs.existsSync(tmp)) {
                        pathName = pathName + this.m_config.defaultPage[i];
                        break;
                    }
                }
            }
        }

        //获取资源文件的相对路径
        var filePath = path.normalize(path.join(this.m_config.root, pathName));

        //获取对应文件的文档类型
        var contentType = this.getContentType(filePath);

        //如果文件名存在
        fs.exists(filePath, function (exists) {
            if (exists && path.extname(filePath) != '') {
                response.writeHead(200, { "content-type": contentType });
                if (path.extname(filePath) == ".nsp") {
                    // nsp程序

                    // 替换response上面的write函数，使其支持直接输出非字符串和Buffer格式
                    if (!response.oldwrite) {
                        response.oldwrite = response.write.bind(response);
                    }

                    response.write = function (v) {
                        let str;
                        if ((v instanceof Buffer) || (typeof v == 'string')) {
                            str = v;
                        } else if (typeof v == 'object') {
                            str = JSON.stringify(v);
                        } else {
                            str = v.toString();
                        }
                        this.oldwrite(str);
                    }.bind(response);

                    let doNsp = function () {
                        // 填充query和cookies
                        request.query = {};
                        let par = request.url.split("?");
                        if (par.length > 1) {
                            par[1].split("&").forEach(c => {
                                let parts = c.split('=');
                                request.query[parts[0].trim()] = (parts[1] || '').trim();
                            });
                        }

                        request.cookies = {};
                        if (request.headers.cookie != null) {
                            request.headers.cookie.split(';').forEach(c => {
                                let parts = c.split('=');
                                request.cookies[parts[0].trim()] = (parts[1] || '').trim();
                            });
                        }

                        self.m_nps.run(filePath, request, response, (data, err) => {
                            logg(logDebug, "nps run: " + data + err);
                            response.end();
                        });
                    }

                    let params = "";
                    if (request.method.toLowerCase() == "post") {
                        request.on("data", function (chunk) {
                            params += chunk;
                        });

                        request.on("end", function () {
                            request.url += ('?' + params);
                            doNsp();
                        });
                    } else {
                        doNsp();
                    }
                } else {
                    // 一般文件
                    var stream = fs.createReadStream(filePath, { flags: "r", encoding: null });
                    stream.on("error", function () {
                        response.writeHead(500, { "content-type": "text/html" });
                        response.end("<h1>500 Server Error</h1>");
                    });
                    //返回文件内容
                    stream.pipe(response);
                }
            } else { //文件名不存在的情况
                if (path.extname(filePath) != '' || !self.m_config.applyDir) {
                    //如果这个文件不是程序自动添加的，直接返回404
                    response.writeHead(404, { "content-type": "text/html" });
                    response.end("<h1>404 Not Found</h1>");
                } else {
                    response.writeHead(200, { "content-type": "text/html" });
                    //如果文件是程序自动添加的且不存在，则表示用户希望访问的是该目录下的文件列表
                    var html = "<head><meta charset='utf-8'></head>";
                    try {
                        //用户访问目录
                        var filedir = filePath.substring(0, filePath.lastIndexOf('\\'));
                        //获取用户访问路径下的文件列表
                        fs.readdir(filedir, (err, data) => {
                            //将访问路径下的所以文件一一列举出来，并添加超链接，以便用户进一步访问
                            for (var i in data) {
                                var filename = data[i];
                                html += "<div><a  href='" + filename + "'>" + filename + "</a></div>";
                            }
                            response.end(html);
                        });

                    } catch (e) {
                        html += "<h1>您访问的目录不存在</h1>"
                        response.end(html);
                    }
                }
            }
        });
    }

    // 获取文件类型
    getContentType(filePath) {
        var contentType = this.m_config.mime;
        var ext = path.extname(filePath).substr(1);
        if (contentType.hasOwnProperty(ext)) {
            return contentType[ext];
        } else {
            return contentType.default;
        }
    }

}

exports.create = function () {
    return new HYHttpServer();
}