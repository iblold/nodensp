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
const zlib = require("zlib");
require("./misc");

class HYHttpServer {
    constructor() {
        this.m_config = null;
        this.m_nps = new nsp();
    }

    init(configFile) {
        this.m_config = eval('(' + fs.readFileSync(path.normalize(configFile)) + ')');
        if (this.m_config) {
            return true;
        } else {
            return false;
        }
    }

    start(cb) {
        let port = this.m_config.port;
        let rootPath = this.m_config.root;
        let self = this;

        global.server = {
            "root": path.normalize(process.cwd()),
            "wwwroot": path.normalize(path.join(process.cwd(), rootPath)),
            "port": port
        };

        // 扫描所有nsp文件并编译
        let nps = [];
        try {
            rd.eachFileFilterSync(rootPath, /\.nsp$/, function (f, s) {
                nps.push(f);
            });
        } catch (e) {
            logg(logError, "root path not exist: " + e);
            if (cb) cb(e);
            return;
        }

        if (nps.length > 0) {
            for (let i = 0; i < nps.length; ++i) {
                let end = (i == nps.length - 1);
                this.m_nps.compile(nps[i], (func, err) => {
                    if (err) {
                        logg(logError, "compile nsp file failed, error like this: ");
                        fs.writeFileSync(process.cwd() + "/errfile.js", err[1]);

                        require(process.cwd() + "/errfile.js");

                        if (cb) cb(err);
                    }
                    if (end) {
                        self.listen(port, cb);
                    }
                });
            }
        } else {
            this.listen(port, cb);
        }
    }

    listen(port, cb) {
        //创建一个服务
        var httpServer = http.createServer(this.processRequest.bind(this));

        httpServer.on("error", function (error) {
            logg(logError, error);
            if (cb) cb(error);
        });

        //在指定的端口监听服务
        httpServer.listen(port, function () {
            logg(logInfo, "HYHttpServer is running on " + port);
            if (cb) cb();
        });
    }

    parseMultipart(data, boundary) {

        let SEARCH_BOUNDARY_LINE = 0;
        let SEARCH_DISPOSITION_LINE = 1;
        let SEARCH_TYPE_LINE = 2;
        let SEARCH_SPLIT_LINE = 3;
        let SEARCH_DATA_LINE = 4;

        let offset = 0;
        let state = SEARCH_BOUNDARY_LINE;
        let curName = null;
        let curType = null;
        let curFilename = null;
        let curDisposition = null;
        let curDataStart = 0;

        let ret = [];
        let size = data.length - 1;
        for (let i = 0; i < size; ++i) {
            let f = data.readUInt16LE(i);
            // 找到换行
            if (f == 0xa0d) {
                let tmp = data.slice(offset, i);
                if (state == SEARCH_BOUNDARY_LINE) {
                    // 找到最初的boundary
                    let bstr = tmp.toString();
                    if (bstr.indexOf(boundary) >= 0) {
                        state = SEARCH_DISPOSITION_LINE;
                    }
                } else if (state == SEARCH_DISPOSITION_LINE) {
                    // 查找disposition行
                    let disposition = tmp.toString();
                    let ar = disposition.split(";");
                    if (ar[0]) {
                        curDisposition = ar[0].replace('Content-Disposition:', '');
                    }

                    if (ar[1]) {
                        curName = ar[1].split("=")[1];
                    }

                    if (ar[2]) {
                        curFilename = ar[2].split("=")[1].replace(/"/g, "");
                    }

                    if (curFilename) {
                        state = SEARCH_TYPE_LINE;
                    } else {
                        state = SEARCH_SPLIT_LINE;
                    }
                } else if (state == SEARCH_SPLIT_LINE) {
                    // 查找数据之前的空行
                    state = SEARCH_DATA_LINE;
                } else if (state == SEARCH_TYPE_LINE) {
                    // 查找文件类型行
                    let tpstr = tmp.toString();
                    curType = tpstr.replace('Content-Type:', '');
                    state = SEARCH_SPLIT_LINE;
                } else if (state == SEARCH_DATA_LINE) {
                    // 查找并填充数据
                    let bstr = tmp.toString();
                    if (bstr.indexOf(boundary) >= 0) {
                        state = SEARCH_DISPOSITION_LINE;
                        // 数据填充完毕，下一个数据
                        ret.push({
                            'disposition': curDisposition,
                            'name': curName,
                            'filename': curFilename,
                            'data': data.slice(curDataStart, offset - 2),
                            'type': curType
                        });

                        curName = null;
                        curType = null;
                        curFilename = null;
                        curDisposition = null;
                        curDataStart = 0;

                    } else if (curDataStart == 0) {
                        curDataStart = offset;
                    }
                }

                offset = i + 2;
            }
        }

        return ret;
    }

    parseParam(str, splitchar) {
        str = str.replace(/\s+/g, "");
        let ret = {};
        let ar = str.split(splitchar);
        for (let i = 0; i < ar.length; ++i) {
            let ep = ar[i].indexOf("=");
            let tmp = {};
            if (ep > 0) {
                ret[ar[i].substring(0, ep)] = ar[i].substring(ep + 1);
            } else {
                ret[ar[i]] = "";
            }
        }
        return ret;
    }

    processRequest(request, response) {
        response.startTime = getTimeMS();

        let self = this;
        // 跨域
        response.setHeader("Access-Control-Allow-Origin", "*");
        let urlstr = decodeURI(request.url);
        let urldata = url.parse(urlstr);
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
                for (let i = 0; i < this.m_config.default_page.length; ++i) {
                    let tmp = path.join(this.m_config.root, pathName + this.m_config.default_page[i]);
                    if (fs.existsSync(tmp)) {
                        pathName = pathName + this.m_config.default_page[i];
                        break;
                    }
                }
            }
        }

        //获取资源文件的相对路径
        var filePath = path.normalize(path.join(this.m_config.root, pathName));

        //获取对应文件的文档类型
        var contentType = this.getContentType(filePath);

        // 重写response.end函数，用来计算执行时间
        response.oldend = response.end;
        response.end = function (str) {
            if (str) {
                response.write(str);
            }
            this.oldend();
            this.ended = true;
            logg(logDebug, "visit " + filePath + " in " + (getTimeMS() - this.startTime) + "ms");
        }.bind(response);

        fs.lstat(filePath, (err, stats) => {
            let e404 = false;
            if (!err) {
                if (!stats.isDirectory()) {
                    let fileExtName = path.extname(filePath);
                    if (fileExtName == ".nsp") {
                        // nsp程序

                        request.query = {};
                        // 替换response上面的write函数，使其支持直接输出非字符串和Buffer格式
                        response.oldwrite = response.write.bind(response);
                        response.write = function (v) {
                            if (this.ended)
                                return;

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
                            // 填充query
                            let par = request.url.split("?");
                            if (par.length > 1) {
                                par[1].split("&").forEach(c => {
                                    let parts = c.split('=');
                                    request.query[parts[0].trim()] = (parts[1] || '').trim();
                                });
                            }

                            // 填充cookies
                            request.cookies = {};
                            if (request.headers.cookie != null) {
                                request.headers.cookie.split(';').forEach(c => {
                                    let parts = c.split('=');
                                    request.cookies[parts[0].trim()] = (parts[1] || '').trim();
                                });
                            }

                            // 执行脚本
                            response.writeHead(200, { "Content-Type": contentType });
                            self.m_nps.run(filePath, request, response, (data, err) => {
                                response.end();
                                if (err) {
                                    logg(logError, filePath + err);
                                }
                            });
                        }

                        request.method = request.method.toLowerCase();
                        if (request.method == "post") {
                            let temp = self.parseParam('content-type=' + request.headers["content-type"], ";");
                            let ctype = temp["content-type"];
                            let boundary = temp["boundary"];
                            let clength = parseInt(request.headers["content-length"]);

                            // 判断提交数据的大小，超过允许大小返回失败
                            let deflength = self.m_config.upload_limit || 0xfffffff;
                            if (clength > deflength) {
                                response.writeHead(500, { "content-type": "text/html" });
                                response.end("<h1>post data more then limit " + deflength + "</h1>");
                            } else if (clength > 0) {
                                // 接收上传的数据
                                let postData = Buffer.alloc(clength);
                                let offset = 0;
                                request.on("data", function (chunk) {
                                    chunk.copy(postData, offset);
                                    offset += chunk.length;
                                });

                                request.on("end", function () {
                                    // 接收完毕开始解析
                                    if (ctype == 'application/x-www-form-urlencoded') {
                                        request.url = decodeURIComponent(request.url + (request.url.indexOf('?') >= 0 ? '&' : '?') + postData.toString());
                                    } else if (ctype.indexOf("form-data") >= 0) {
                                        // 解析multipart/form-data
                                        let mpdata = self.parseMultipart(postData, boundary);
                                        if (mpdata) {
                                            // 把文件和键值对分开
                                            request.files = [];
                                            for (let i = 0; i < mpdata.length; ++i) {
                                                let it = mpdata[i];
                                                if (it.filename && it.data) {
                                                    request.files.push({ name: it.filename, data: it.data });
                                                } else if (it.name && it.data) {
                                                    request.query[it.name] = it.data.toString();
                                                }
                                            }
                                        }
                                    }
                                    doNsp();
                                });
                            }
                        } else {
                            doNsp();
                        }
                    } else {
                        // 静态文件
                        // 最后修改时间
                        let lastModified = stats.mtime.toUTCString();
                        let ifModifiedSince = "If-Modified-Since".toLowerCase();
                        response.setHeader("Last-Modified", lastModified);

                        // 过期时间
                        response.setHeader("Cache-Control", "max-age=" + 24 * 3600 * 2);

                        if (self.m_config.cache_first && request.headers[ifModifiedSince] && lastModified == request.headers[ifModifiedSince]) {
                            // 使用浏览器缓存
                            response.writeHead(304, "Not Modified");
                            response.end();
                        } else {
                            let raw = fs.createReadStream(filePath);
                            raw.on("error", function () {
                                response.writeHead(500, { "Content-Type": "text/html" });
                                response.end("<h1>500 Server Error</h1>");
                            });

                            let acceptEncoding = request.headers['accept-encoding'] || "";

                            // 是否支持压缩传输
                            let ccp = self.m_config.compress;
                            for (let i = 0; i < self.m_config.comp_ignores.length; ++i) {
                                if (self.m_config.comp_ignores[i] == fileExtName) {
                                    // 不需要压缩的文件扩展名
                                    ccp = false;
                                    break;
                                }
                            }

                            // 压缩传输数据
                            if (ccp && acceptEncoding.match(/\bgzip\b/)) {
                                response.writeHead(200, "Ok", { 'Content-Encoding': 'gzip', "Content-Type": contentType });
                                raw.pipe(zlib.createGzip()).pipe(response);
                            } else if (ccp && acceptEncoding.match(/\bdeflate\b/)) {
                                response.writeHead(200, "Ok", { 'Content-Encoding': 'deflate', "Content-Type": contentType });
                                raw.pipe(zlib.createDeflate()).pipe(response);
                            } else {
                                // 直接传输数据
                                response.writeHead(200, "Ok", { "Content-Type": contentType, "Content-Length": stats.size });
                                raw.pipe(response);
                            }
                        }
                    }
                } else if (self.m_config.dir_visit) {
                    response.writeHead(200, { "Content-Type": "text/html" });
                    var html = "<head><meta charset='utf-8'></head>";
                    try {
                        //用户访问目录
                        var filedir = filePath.substring(0, filePath.lastIndexOf('\\'));
                        //获取用户访问路径下的文件列表
                        fs.readdir(filedir, (err, data) => {
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
                } else {
                    e404 = true;
                }

            } else {
                e404 = true;
            }

            // 什么都没找到
            if (e404) {
                response.writeHead(404, { "Content-Type": "text/html" });
                response.end("<h1>404 Not Found</h1>");
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