/*/////////////////////////////////////////////////////////////////////////

    descript: http request模块

    file: sys/urlrequest.js
    author: iblold@ gmail.com
    date: 	2017.8.18 18:00:30
//////////////////////////////////////////////////////////////////////////*/
const urllib = require('url');
const http = require("http");

exports.request = function (strurl, cb, type) {
    let url = urllib.parse(strurl);
    type = type || "GET";

    let opt = {
        method: type,
        host: url.host,
        port: url.port,
        path: url.path,
        headers: {
            "Content-Type": 'application/x-www-form-urlencoded',
            "Content-Length": url.query.length
        }
    };

    let req = http.request(opt, function (response) {
        if (response.statusCode == 200) {
            let body = "";
            response.on('data', function (data) {
                body += data;
            }).on('end', function () {
                cb(body, null);
            }).on('error', function (err) {
                Logg(logError, "our server response error: " + err);
                cb(null, err);
            });
        } else {
            Logg(logError, "our server response error: " + response.statusCode);
            cb(null, response.statusCode);
        }
    });

    try {
        req.write(url.query + "\n");
        req.end();
    } catch (err) {
        Logg(logError, "our server response error: " + err);
        cb(null, err);
    }
}
