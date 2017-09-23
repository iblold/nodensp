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

	file: 	def.js
	author: iblold@gmail.com
	date: 	2016.10.20
//////////////////////////////////////////////////////////////////////////*/


(function(){
	
	// 日志类型
	logError = 1;		// 错误
    logWran = 2;		// 警告
    logInfo = 3;		// 提示
	logDebug = 4;		// 调试信息
	
	// 日志输出位置
	logTarConsole = 1;	// 输出到控制台
	logTarDBase = 2;	// 输出到数据库
    logTarFile = 4;		// 输出到文件
            
    // 用户状态
    clientOffline = 0;          // 离线 
    clientConnected = 1;    // 连接完成
    clientOnline = 2;           // 在线
    clientIdle = 3;               // 发呆
    clientLost = 4;              // 断线

    // 仿类
    Class = function (prop) {

        // 从Class往下第二层继承需要用到prototype
        var supers = this.prototype || null;

        // 创建prototype， 这时候不需要重新初始化基类
        __initializing = true;
        var prototype = Object.create(supers);
        __initializing = false;

        // 用prop初始化子类数据
        for (name in prop) {
            if (typeof (prop[name]) == "function") {

                // 子类方法
                prototype[name] = (function (nm, fn) {
                    return function () {
                        // 将_super定义为子类方法的新属性，先尝试保存，以免冲突
                        var tmp = this._spuer;
                        if (supers) {
                            this._super = supers[name];
                        }
                        // 函数参数传递
                        var ret = fn.apply(this, arguments);
                        this._super = tmp;

                        return ret;
                    }
                } )(name, prop[name]);

            } else {
                prototype[name] = prop[name];
            }
        }

        // 子类构造函数
        classImpl = function () {
            if (!__initializing) {
                this.ctor && this.ctor.apply(this, arguments);
            }
        }

        classImpl.prototype = prototype;

        classImpl.prototype.constructor = Class;

        return classImpl;
    };
})();