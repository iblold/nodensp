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

	file: 	cstring.js
	desc:	字符串扩充类
	author: iblold@gmail.com
	date: 	2016.10.27
//////////////////////////////////////////////////////////////////////////*/

require("./color.js");
(function () {
    // 字符串替换
    String.prototype.replaceAll = function (strfnd, repstr) {
        return this.replace(new RegExp(strfnd, "gm"), repstr);
    }
    
    //Trim the head and tail spaces
    String.prototype.trim = function () {
        return this.replace(/(^\s*)|(\s*$)/g, "");
    }
    
    //Trim the head spaces of current string
    String.prototype.leftTrim = function () {
        return this.replace(/(^\s*)/g, "");
    }
    
    //Trim the tail spaces of current string
    String.prototype.rightTrim = function () {
        return this.replace(/(\s*$)/g, "");
    }
    
    //Judge current string contains substring or not
    String.prototype.hasSub = function (subStr) {
        var currentIndex = this.indexOf(subStr);
        if (currentIndex != -1) {
            return true;
        }
        else {
            return false;
        }
    }

    String.prototype.setColor = function (code) {
        return code + this + NOR;
    }
})();