"use strict";
/********************************************************
 NspInterpreter
HYHttpServer nsp文件解释器
将nsp文件解释成node.js脚本
nsp文件类似asp，不同的是使用node.js代码

auth: iblold@gmail.com
date: 2017.9.22
*******************************************************/
const fs = require("fs");
const path = require("path");
const crypto = require('crypto');

// 获取解析后函数名的函数
global.report_this_function = null;

/**
 * NspInterpreter 类
 */
class NspInterpreter {

    constructor() {
        this.m_nsps = {};
    }

    // 获取文件名md5值
    getFuncName(file) {
        let md5sum = crypto.createHash('md5');
        md5sum.update(file);
        return 'f_' + md5sum.digest('hex');
    }

    // 翻译nsp为js源码
    parse(file, cb) {
        let self = this;
        fs.exists(file, (exists) => {
            if (exists) {

                fs.readFile(file, (err, data) => {
                    if (!err) {
                        // 调用结束回调
                        let endfunc = "";
                        // 替换单斜杠为双斜杠，避免变成源码后被转义
                        let filestr = data.toString();//.replace("\\", "\\\\");

                        // 转换<%=...%>形式为<% response.write(...); %>
                        let rwBuff = filestr.match(/(<%=[\w\s"'\(\)\+\-\*\/\^&|\?\.\{\}\[\]\\\t\r\n><%=;,:]*?%>)/g);
                        if (rwBuff) {
                            for (let i = 0; i < rwBuff.length; ++i) {
                                let rwParam = rwBuff[i].match(/<%=([\w\s"'\(\)\+\-\*\/\^&|\?\.\{\}\[\]\\\t\r\n><%=;,:]*?)%>/);
                                filestr = filestr.replace(rwParam[0], "<% response.write(" + rwParam[1] + "); %>");
                            }
                        }

                        let fname = self.getFuncName(file);

                        let head = "function " + fname + "(request, response, pageEnd){\n";

                        if (filestr.indexOf("pageEnd(") < 0 && filestr.indexOf("response.end") < 0) {
                            endfunc = "pageEnd(null, null);";
                        }

                        let source = "";
                        let finish = false;
                        let offset = 0;
                        let strs = [];
                        // 转换所有<% %>为代码形式
                        while (!finish) {
                            
                            let spos = filestr.indexOf("<%", offset);
                            if (spos >= 0) {
                                let epos = filestr.indexOf("%>", spos);
                                if (epos >= 0) {
                                    // <%%>之外的内容作为字符串，用`括起并放到文件之前定义
                                    // 运行时直接用response输出
                                    let str = filestr.substring(offset, spos);
                                    if (str.length > 0) {
                                        source += ("response.write(str_" + strs.length + ");\n");
                                        strs.push(str);
                                    }

                                    // <%...%>中间的内容作为代码原样使用
                                    source += filestr.substring(spos + 2, epos);
                                    source += "\n";
                                    offset = epos + 2;

                                } else {
                                    cb(null, "<% has no %> at:" + file + ":" + spos);
                                }
                            } else {
                                finish = true;
                                // 结尾内容，全是字符串
                                let str = filestr.substring(offset);
                                if (str.length > 0) {
                                    source += ("response.write(str_" + strs.length + ");\n");
                                    strs.push(str);
                                }
                            }
                        }

                        let strdef = "";
                        for (let i = 0; i < strs.length; ++i) {
                            strdef += ("let str_" + i + " = `");
                            strdef += strs[i].replace("${", "\${"); // 使用模板字符串，${会形成替换字符，转义掉
                            strdef += "`;\n";
                        }

                        cb(head + strdef + source
                            + endfunc + "};\nreport_this_function("
                            + fname + ");", null);

                    } else {
                        cb(null, err);
                    }
                });

            } else {
                cb(bull, "no such file: " + file);
            }
        });
    }

    compile(file, cb) {
        file = path.resolve(file);
        // 先获取文件状态
        fs.lstat(file, (err, stats) => {
            if (!err) {
                // 翻译文件
                this.parse(file, (result, err) => {
                    if (!err) {
                        try {
                           // 记录eval编译的结果
                            report_this_function = (f) => {
                                this.m_nsps[file] = {"func": f, "stats": stats};
                            }
                            // 编译
                            eval(result);

                            let fst = this.m_nsps[file];
                            cb(fst.func, fst.func ? null : file + " compile failed.");
                        } catch (e) {
                            cb(null, [file + ":" + e, result]);
                        }
                    } else {
                        cb(null, err);
                    }
                });
            } else {
                cb(null, err);
            }
        });
    }

    run(file, req, res, cb) {
        file = path.resolve(file);
        // 获取文件状态，决定是否重新编译
        fs.lstat(file, (err, stats) => {
            if (!err) {
                let fst = this.m_nsps[file];
                // 文件一致直接运行编译结果
                if (fst && fst.stats.mtime.getTime() >= stats.mtime.getTime()) {
                    fst.func(req, res, cb);
                } else {
                    // 重新编译并运行
                    this.compile(file, (func, err) => {
                        if (!err) {
                            func(req, res, cb);
                        } else {
                            cb(null, err);
                        }
                    });
                }
            } else {
                cb(null, err);
            }
        });
    }
}

exports.class = NspInterpreter;