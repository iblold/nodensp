/*/////////////////////////////////////////////////////////////////////////

    descript: 实现网络通讯的基本功能

	file: 	network.js
	author: iblold@gmail.com
	date: 	2016.10.20
//////////////////////////////////////////////////////////////////////////*/
require("./misc");

MaxPacketSize = _KB(8);

const c_net = require("net");

// 连接句柄队列
var s_clientsArray = [];

// 网络消息回调函数表
var s_msgCallbackMap = new Map();

var s_onCloseCallback = null;

var s_onConnectCallback = null;

var s_onErrorCallback = null;

// 服务器实例
var s_server = null;

// 检测消息包合法
var checkMsg = function (msg) {
    if (msg.isNetPacket == true) {
        return true;
    } else {
        logg(logError, "msg is not invaid netpacket!");
    }
    return false;
}

// 消息分发函数
var dispatchNetMsg = function(client, buff){
    let id = buff.readUInt16LE(3);
    if (s_msgCallbackMap.has(id)) {
        let dc = s_msgCallbackMap.get(id);
        dc.callback(client, new dc.msgtemp(buff));
    } else {
        logg(logError, "packet type don't exist in callback map: " + id + " from " + client.addrDesc);
    }
}

// 把Buffer一段内容移到另一段
var moveToSelf = function (buff, src, dest) {
    // 两段不重叠
    if (src.end - src.begin != dest.end - dest.begin) {
        logg(logError, "moveToFront error");
        return;
    }

    if (src.end < dest.begin || src.begin > dest.end) {
        buff.copy(buff, dest.begin, src.begin, src.end);
    } else {
        let size = src.end - src.begin;
        
        __swap_buffer_for_movetoself__ = __swap_buffer_for_movetoself__ || Buffer.alloc(size);

        if (size > __swap_buffer_for_movetoself__.length) __swap_buffer_for_movetoself__ = Buffer.alloc(size);

        buff.copy(__swap_buffer_for_movetoself__, 0, src.begin, src.end);
        __swap_buffer_for_movetoself__.copy(buff, dest.begin, 0, size);
    }
}

// 设置连接属性
var setConn = function (client) {

    // 连接远端地址
    client.addrDesc = client.remoteAddress + ":" + client.remotePort;

    // 连接成功的时间
    client.incommingTime = getTimeMS();

    // 接收缓冲区
    client.recvBuffer = Buffer.alloc(MaxPacketSize * 4);
    client.recvUsed = 0;

    client.sendList = [];

    // 发送消息包
    client.sendMsg = function (msg) {
        if (checkMsg(msg) && client && client.write instanceof Function) {
            logg(logDebug, msg.getMsgName() + ":" + msg.getMsgLength());
            if (!client.write(msg.getBytes().slice(0, msg.getMsgLength()))) {
                client.sendList.push(msg);
            };
        }
    }

    // 发送消息并且断开
    client.sendAndClose = function (msg) {
        if (checkMsg(msg)) {
            client.end(msg.getBytes().slice(0, msg.getMsgLength()));
        } 
    }

    // 连接放入缓存
    s_clientsArray.push(client);

    logg(logInfo, client.addrDesc + " connected.");

    if (s_onConnectCallback) {
        s_onConnectCallback(client);
    }

    // 检测消息包头标志
    var checkFlag = function (buff) { return buff.readUInt8(0) == 0xbd; }

    // 数据响应函数
    client.on("data", function (buff) {
        // 数据写入接收缓冲
        buff.copy(client.recvBuffer, client.recvUsed);
        client.recvUsed += buff.length;

        // 收到错误消息包，断开此链接
        if (!checkFlag(client.recvBuffer)) {
            logg(logError, "recive error packet " + client.addrDesc);
            client.close();
        } else {

            // 当前包大小
            let cursize = client.recvBuffer.readUInt16LE(1);
            // 收到半包，继续等待
            if (cursize > client.recvUsed)  return;

            let offset = 0;
            while (offset < client.recvUsed) {

                let msg = client.recvBuffer.slice(offset, offset + cursize);
                dispatchNetMsg(client, msg);

                offset += cursize;

                if (offset >= client.recvUsed) {
                    client.recvUsed = 0;
                    return;
                }else {
                    // 不够读出下一个包体大小
                    if (offset + 3 > client.recvUsed) {
                        let size = client.recvUsed - offset;
                        moveToSelf(client.recvBuffer, { begin: offset, end: client.recvUsed }, { begin: 0, end: size });
                        client.recvUsed = size;
                    } else {
                        cursize = client.recvBuffer.readUInt16LE(offset + 1);

                        // 只剩下半包可读
                        if (offset + cursize > client.recvUsed) {
                            let size = client.recvUsed - offset;
                            moveToSelf(client.recvBuffer, { begin: offset, end: client.recvUsed }, { begin: 0, end: size });
                            client.recvUsed = size;
                            return;
                        }

                    }
                }
            }
        }
    });

    // 掉线处理
    client.on("close", function (data) {

        s_clientsArray.splice(s_clientsArray.indexOf(client), 1);
        logg(logInfo, client.addrDesc + " closed.");

        if (s_onCloseCallback) {
            s_onCloseCallback(client);
        }

        client.destroy();
        client = null;
    });

    // 错误处理
    client.on("error", function (error) {
        var loglev = logError;

        // 掉线提示
        if (error.code == "ECONNRESET")
            loglev = logInfo;

        if (s_onErrorCallback) {
            s_onErrorCallback(client);
        }

        logg(loglev, client.addrDesc + error.toString());
    }); 
}

exports.tick = function () {
    for (let i = 0; i < s_clientsArray.length; ++i) {
        client = s_clientsArray[i];
        client.sendList = [];
        /*for (let j = 0; j < buff.length; ++j) {
            msg = buff[j];
            client.sendMsg(msg);
        }*/
    }
}

// 启动服务器
exports.startServer = function (host, port) {
    s_server = c_net.createServer(function (client) {
        setConn(client);
    });

    // 服务器错误
    s_server.on('error', function (err) {
        logg(logError, "server error: (" + err.code + ")" + err.message);
        appExit();
    });

    // 开始监听
    s_server.listen(port, host, function () {
        logg(logInfo, "server is listening port: " + port);
    });
}

// 踢人下线
exports.kickOut = function (client) {
    client.close();
    logg(logInfo, "kickout client " + client.addrDesc);
}

// 关闭服务器
exports.shutDown = function () {
    s_server.close();
}

// 向外连接
exports.connectTo = function (host, port, cb) {
    let client = c_net.connect(port, host, function () {
        setConn(client);
        cb(client);
    });
}

// 注册消息分发
exports.onMessage = function (msg, cb) {
    if (msg instanceof Function) {
        let s = new msg();
        if (checkMsg(s)) {
            s_msgCallbackMap.set(s.getTypeId(), { callback: cb, msgtemp: msg });
            return;
        }
    }
  
    logg(logError, "onMessage arg msg error");
}

exports.onClose = function (cb) {
    s_onCloseCallback = cb;
}

exports.onConnect = function (cb) {
    s_onConnectCallback = cb;
}

exports.onError = function (cb) {
    s_onErrorCallback = cb;
}