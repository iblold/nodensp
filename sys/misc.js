/*/////////////////////////////////////////////////////////////////////////

                           o                                   
     oo     oo             o   oo                              
     oo     oo             o  o  o                             
     o o   o o  o   o   oooo  o      oo   o ooo   o   oo   o oo
     o o   o o  o   o  o   o   o    o  o  oo  o   o  o  o  oo  
     o  o o  o  o   o  o   o    o   oooo  o    o o   oooo  o   
     o  o o  o  o   o  o   o     o  o     o    o o   o     o   
     o   o   o  o  oo  o   o  o  o  o     o     o    o     o   
     o   o   o   oo o   oooo   oo    ooo  o     o     ooo  o   	 

	file: 	misc.js000
	author: iblold@gmail.com
	date: 	2016.10.20
//////////////////////////////////////////////////////////////////////////*/

const filesys = require("fs");
const os = require("os");
const colors = require("./color.js");
const path = require("path");

require("./cstring.js");
require("./def.js");

var LogTarget = LogTarget || (logTarConsole | logTarFile);
var LogDir = LogDir || "./log";

(function () {

    templeString = function (str){
        Function("buff=`" + str + "`;")();
        return buff;
    }
	
	// 取当前时间字符串
	getDateTime = function (t) {
        let date = new Date();
        let s = [];

        s[0] = date.getFullYear();

        s[1] = date.getMonth() + 1;
        s[1] = (s[1] < 10 ? "0" : "") + s[1];

        s[2] = date.getDate();
        s[2] = (s[2] < 10 ? "0" : "") + s[2];

        s[3] = date.getHours();
        s[3] = (s[3] < 10 ? "0" : "") + s[3];

        s[4] = date.getMinutes();
        s[4] = (s[4] < 10 ? "0" : "") + s[4];

        s[5] = date.getSeconds();
        s[5] = (s[5] < 10 ? "0" : "") + s[5];

        if (t == null || t <= 0 || t > 6)
            t = 6;

        let ret = "";
        let n = t - 1;
        for (let i = 0; i < t; i++) {

            ret += s[i];
            if (i < 2 && i != n) {
                ret += "-"
            } else if (i == 2) {
                ret += " ";
            } else if (i < 5 && i != n) {
                ret += ":";
            }
        }

        return ret;
    }
    
    // 获得完整路径
    getFullPath = function (path){
        path = path.replace(/\\/g, "/");
        // 当前目录
        let curpath = process.cwd().replace(/\\/g, "/");
        
        let curdirs = curpath.split("/");
        let end = curdirs.length - 1;

        let r = "";
        // 顶级目录
        if (path.indexOf(":") >= 0 || path.indexOf("/") == 0) {
            return path;
        } else {
            // 每级目录
            let dirs = path.split("/");
            for (let i = 0; i < dirs.length; ++i) {
                let dir = dirs[i];
                if (dir != "") {
                    // 上一级
                    if (dir == "..") {
                        end--;
                    } else if (dir == ".") {
                        continue;
                    } else {
                        r += ("/" + dir);
                    }
                }
            }
        }
        
        // 加上运行目录
        for (let i = end; i >= 0; i--) {
            if (r.indexOf("/") != 0) {
                r = (curdirs[i] + "/" + r);
            } else {
                r = curdirs[i] + r;
            }
            
        }

        return r;
    }
	
	mkdir = function(path){
		path = path.replace(/\\/g, "/");
		let dirs = path.split("/");
		let buf = "";
		for(let i = 0; i < dirs.length; ++i){
			if (dirs[i] != "")
			{
				buf = buf + dirs[i];
				
				if (!filesys.existsSync(buf))
					filesys.mkdirSync(buf);
				
				buf += "/";
			}
		}
	}

    const logStr = [{ str: "Error: ", color: colors.red }, { str: "Wraning: ", color: colors.yellow},
        { str: "Info: ", color: colors.white }, { str: "Debug: ", color: colors.green }];
					
	let logFile;
	// 写日志
    logg = function (level, msg, param1, param2) {
		
		if (LogTarget == null || LogTarget <= 0 || LogTarget > 7)
			return;
        
        let lev = level - 1;

        if (lev < 0) {
            lev = 0;
        } else if (lev > 3){
            lev = 3;
        }

		let tarFile = LogTarget & logTarFile;
		let tarServer = LogTarget & logTarDBase;
		let tarConsole = LogTarget & logTarConsole;
		
		let tm = getDateTime();
		// 写日志到数据库
        if (tarServer) {
            /*exports.query("insert into tbl_log(typeid, msg, param1, param2) values (" + level + ",'" + msg + "'," + param1 + "," + (param2 == null?0:param2) + ")"
                , function (rs, fs) {
                console.log(rs.length);
            });*/
        } 

        let tmp = (new Error()).stack.split('\n')[2].match(/[\s\S]*\(([\s\S]*)\)/);
        let filestr = path.basename(tmp[1]);

        let str = "[" + tm + "]" + "(" + filestr + ")" + logStr[lev].str + msg;
            
		if (tarConsole)
			console.log(logStr[lev].color(str));
		
		if (tarFile){
			str = str + "\n";
			if (logFile == null) {
                mkdir(LogDir);
                let tmf = getDateTime(5);
                tmf = tmf.replace(/:/g, "_");
				let fn = LogDir + "/" + tmf + ".log";
				filesys.open(fn, "a", function (err, fd) { 
					if (err) {
                        console.log(colors.red("con't open log file! " + err));
                    } else {
                        logFile = fd;
						filesys.write(fd, str, 0, str.length, 0, function (err, bytes) { 
                            if (err) console.log(colors.red("con't write to log file! " + err));
						});
					}
				});
			} else {
				filesys.write(logFile, str, 0, str.length, 0, function (err, bytes) {
                    if (err) console.log(colors.red("con't write to log file!"));
				});
			}
		}
    }

    loggClose = function (){
        if (logFile) {
            filesys.close(logFile, function (err) {
                if (err) console.log(colors.red("con't close log file! " + err));
                logFile = null;
            });
        }
    }

    process.on("SIGINT", function () {
        appExit(0);
    });
    
    let tickHandle;
    
    // 开始Tick， v间隔毫秒， cb回调函数
    startTicks = function (v, cb) {
        tickHandle = setInterval(cb, v);
    }
    
    stopTicks = function (){
        if (tickHandle)
            clearInterval(tickHandle);
    }
    
    appExit = function (e){
        stopTicks();
        loggClose();
        process.exit(e);
    } 

    getTimeSE = function ()
    {
        return Math.floor((new Date()).getTime() / 1000);
    }
	
	getTimeMS = function ()
    {
		return new Date().getTime();
    }

    makeGuid = function ()
    {
        var inet = os.networkInterfaces();
        for (var x in inet) {

            var s = inet[x];

            if (s[0].mac != '00:00:00:00:00:00') {
                mac = s[0].mac;
                break;
            }
        } 

        return mac;
    }
    
    isBom = function (buf){
        return buf[0] == 0xEF && buf[1] == 0xBB && buf[2] == 0xBF;
    }

    getFileTxt = function (path){
        path = getFullPath(path);

        if (filesys.existsSync(path)) {
            let data = filesys.readFileSync(path);
            if (isBom(data)) {
                return data.slice(3).toString();
            } else {
                return data.toString();
            }
            
        } else {
            return null;
        }
    }

    hasChinese = function (buff){
        for (let c of buff){
            if (c > 0x80){
                return true;
            }
        }

        return false;
    }

    rand = function (min, max){
        if (min == null) {
            min = 0;
        }
        if (max == null) {
            max = 32768;
        }
        return Math.floor(min + Math.random() * (max - min + 1));
    }

    //IP转成整型
    ip2Int = function (ip) 
    {
        var num = 0;
        ip = ip.split(".");
        num = Number(ip[0]) * 256 * 256 * 256 + Number(ip[1]) * 256 * 256 + Number(ip[2]) * 256 + Number(ip[3]);
        num = num >>> 0;
        return num;
    }
    //整型解析为IP地址
    int2Ip = function (num) 
    {
        var str;
        var tt = new Array();
        tt[0] = (num >>> 24) >>> 0;
        tt[1] = ((num << 8) >>> 24) >>> 0;
        tt[2] = (num << 16) >>> 24;
        tt[3] = (num << 24) >>> 24;
        str = String(tt[0]) + "." + String(tt[1]) + "." + String(tt[2]) + "." + String(tt[3]);
        return str;
    }

    _KB = function (n) { return 1024 * n; }


    //requirePack = function (f) {
    //    packer.getFile()
    //}

    objectToSource = function (obj) {
        if (obj instanceof Object) {
            obj.zzzzDummy = 0;
            let str = JSON.stringify(obj);

            let strfunc = "";
            for (let v in obj) {
                let c = obj[v];
                if (c instanceof Function) {
                    let s = c.toString();
                    strfunc += (v + ':' + s);
                    strfunc += ","
                }
            }
            str = str.replace(/"zzzzDummy":0/g, strfunc.substring(0, strfunc.length - 1));
            obj.zzzzDummy = null;
            return str;
        }
        return null;
    }
})();