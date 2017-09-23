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

	file: 	tabfile.js
	desc:	读取tabfile, 文件第一行是注释，第二行是表头，数据从第三行开始
	author: iblold@gmail.com
	date: 	2016.10.20
//////////////////////////////////////////////////////////////////////////*/
require("./misc.js");

exports.read = function(file, cb){
	
    // 判断文件存在
    let data = getFileTxt(file);
	if (data != null){
		
		// 结果集
		let result = [];
		
		// 确定行分割符
		let sp = "\r\n";
		let isDos = data.indexOf(sp) > 0;
		
		if (!isDos)
			sp = "\n";
		
		// 按行分割
		let lines = data.split(sp);
		
		// 
		if (lines.length < 3)
			return null;
		
		// 解析表头
		let head = lines[1].split("\t");
		
		// 解析每行数据
		for(let i = 2; i < lines.length; i++){
			let ln = lines[i];
			if (ln != ""){
				let buff = ln.split("\t");
				
				// 数据行和表头不匹配
				if (buff.length != head.length){
					if(cb != null) 
						cb({code:"HeadMatchError"});
					//return null;
				}
				
				let cells = {};
				// 填充行对象
				for(let j = 0; j < buff.length; j++){
					cells[head[j]] = buff[j];
				}
				
				// 加入结果集
                result.push(cells);
			}
        }

        return result;
		
	} else {
		if(cb != null) 
			cb({code:"nofile"});
	}
	
	return null;
}