"use strict";
/********************************************************
 NspInterpreter
HYHttpServer nsp�ļ�������
��nsp�ļ����ͳ�node.js�ű�
nsp�ļ�����asp����ͬ����ʹ��node.js����

auth: iblold@gmail.com
date: 2017.9.22
*******************************************************/
const fs = require("fs");
const path = require("path");
const crypto = require('crypto');

// ��ȡ�����������ĺ���
global.report_this_function = null;

/**
 * NspInterpreter ��
 */
class NspInterpreter {

    constructor() {
        this.m_nsps = {};
    }

    // ��ȡ�ļ���md5ֵ
    getFuncName(file) {
        let md5sum = crypto.createHash('md5');
        md5sum.update(file);
        return 'f_' + md5sum.digest('hex');
    }

    // ����nspΪjsԴ��
    parse(file, cb) {
        let self = this;
        fs.exists(file, (exists) => {
            if (exists) {

                fs.readFile(file, (err, data) => {
                    if (!err) {
                        // ���ý����ص�
                        let endfunc = "";
                        // �滻��б��Ϊ˫б�ܣ�������Դ���ת��
                        let filestr = data.toString();//.replace("\\", "\\\\");

                        // ת��<%=...%>��ʽΪ<% response.write(...); %>
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
                        // ת������<% %>Ϊ������ʽ
                        while (!finish) {
                            
                            let spos = filestr.indexOf("<%", offset);
                            if (spos >= 0) {
                                let epos = filestr.indexOf("%>", spos);
                                if (epos >= 0) {
                                    // <%%>֮���������Ϊ�ַ�������`���𲢷ŵ��ļ�֮ǰ����
                                    // ����ʱֱ����response���
                                    let str = filestr.substring(offset, spos);
                                    if (str.length > 0) {
                                        source += ("response.write(str_" + strs.length + ");\n");
                                        strs.push(str);
                                    }

                                    // <%...%>�м��������Ϊ����ԭ��ʹ��
                                    source += filestr.substring(spos + 2, epos);
                                    source += "\n";
                                    offset = epos + 2;

                                } else {
                                    cb(null, "<% has no %> at:" + file + ":" + spos);
                                }
                            } else {
                                finish = true;
                                // ��β���ݣ�ȫ���ַ���
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
                            strdef += strs[i].replace("${", "\${"); // ʹ��ģ���ַ�����${���γ��滻�ַ���ת���
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
        // �Ȼ�ȡ�ļ�״̬
        fs.lstat(file, (err, stats) => {
            if (!err) {
                // �����ļ�
                this.parse(file, (result, err) => {
                    if (!err) {
                        try {
                           // ��¼eval����Ľ��
                            report_this_function = (f) => {
                                this.m_nsps[file] = {"func": f, "stats": stats};
                            }
                            // ����
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
        // ��ȡ�ļ�״̬�������Ƿ����±���
        fs.lstat(file, (err, stats) => {
            if (!err) {
                let fst = this.m_nsps[file];
                // �ļ�һ��ֱ�����б�����
                if (fst && fst.stats.mtime.getTime() >= stats.mtime.getTime()) {
                    fst.func(req, res, cb);
                } else {
                    // ���±��벢����
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