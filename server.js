"use strict";
require("./sys/misc");
const httpServer = require("./hyhttpserver");

// �������
function main() {
    let server = httpServer.create();
    if (server.init("./config.json")) {
        server.start();
    } else {
        logg(logError, "server config error!");
    }
}

main();