"use strict";
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

	file: 	dbase.js
	desc:	redis数据库连接类
	author: iblold@gmail.com
	date: 	2016.10.20
//////////////////////////////////////////////////////////////////////////*/
const redis = require("redis");

exports.connect = function (host, port, passwd, cb) {

    if (typeof (port) == "undefined" || typeof (host) == "undefined") {
        cb("DBServer.port or DBServer.host is null.");
        return;
    }

    let opt = {};
    if (typeof (passwd) != "undefined" && passwd != "") {
        opt.auth_pass = passwd;
    }

    let self = this;

    let client = redis.createClient(port, host, opt);

    client.on('ready', function (err) {
        cb(err, client);
    });

    client.on("error", function (err) {
        cb(err, null);
    });
}

