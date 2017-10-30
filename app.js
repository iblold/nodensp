require("./sys/def");
require("./sys/misc");
const httpserver = require("./sys/hyhttpserver.js");

(function(){

        let httpSvr = httpserver.create();
        if (!httpSvr.init("./web.json")){
            throw "无法创建web服务！"; 
        }

        httpSvr.start((err) => {
            if (err)
                logg(logError, "server error on start");
        });
})();