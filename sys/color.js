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

	file: 	color.js
	author: iblold@gmail.com
	date: 	2016.10.20
//////////////////////////////////////////////////////////////////////////*/

(function(){
ESC = "";
CSI = ESC + "[";
 
                /*  Foreground Colors  */
 
BLK = ESC+"[30m";          /* Black    */
RED = ESC+"[31m";          /* Red      */
GRN = ESC+"[32m";          /* Green    */
YEL = ESC+"[33m";          /* Yellow   */
BLU = ESC+"[34m";          /* Blue     */
MAG = ESC+"[35m";          /* Magenta  */
CYN = ESC+"[36m";          /* Cyan     */
WHT = ESC+"[37m";          /* White    */
 
                /*   Hi Intensity Foreground Colors   */
 
HIR = ESC+"[1;31m";        /* Red      */
HIG = ESC+"[1;32m";        /* Green    */
HIY = ESC+"[1;33m";        /* Yellow   */
HIB = ESC+"[1;34m";        /* Blue     */
HIM = ESC+"[1;35m";        /* Magenta  */
HIC = ESC+"[1;36m";        /* Cyan     */
HIW = ESC+"[1;37m";        /* White    */

                /* High Intensity Background Colors  */

HBRED = ESC+"[41;1m";       /* Red      */
HBGRN = ESC+"[42;1m";       /* Green    */
HBYEL = ESC+"[43;1m";       /* Yellow   */
HBBLU = ESC+"[44;1m";       /* Blue     */
HBMAG = ESC+"[45;1m";       /* Magenta  */
HBCYN = ESC+"[46;1m";       /* Cyan     */
HBWHT = ESC+"[47;1m";       /* White    */
 
                /*  Background Colors  */
 
BBLK = ESC+"[40m";          /* Black    */
BRED = ESC+"[41m";          /* Red      */
BGRN = ESC+"[42m";          /* Green    */
BYEL = ESC+"[43m";          /* Yellow   */
BBLU = ESC+"[44m";          /* Blue     */
BMAG = ESC+"[45m";          /* Magenta  */
BCYN = ESC+"[46m";          /* Cyan     */
BWHT = ESC+"[47m";          /* White    */

NOR = ESC+"[2;37;0m";      /* Puts everything back to normal */
 
/*  Additional ansi Esc codes added to ansi.h by Gothic  april 23,1993 */
/* Note, these are Esc codes for VT100 terminals, and emmulators */
/*       and they may not all work within the mud               */
 
BOLD	 = ESC+"[1m";     /* Turn on bold mode */
CLR		 = ESC+"[2J";     /* Clear the screen  */
HOME	 = ESC+"[H";      /* Send cursor to home position */
REF		 = CLR+HOME;      /* Clear screen and home cursor */
BIGTOP	 = ESC+"#3";      /* Dbl height characters, top half */
BIGBOT	 = ESC+"#4";      /* Dbl height characters, bottem half */
SAVEC	 = ESC+"[s";      /* Save cursor position */
REST	 = ESC+"[u";      /* Restore cursor to saved position */
REVINDEX = ESC+"M";       /* Scroll screen in opposite direction */
SINGW	 = ESC+"#5";      /* Normal, single-width characters */
DBL		 = ESC+"#6";      /* Creates double-width characters */
FRTOP	 = ESC+"[2;25r";  /* Freeze top line */
FRBOT	 = ESC+"[1;24r";  /* Freeze bottom line */
UNFR	 = ESC+"[r";      /* Unfreeze top and bottom lines */
BLINK	 = ESC+"[5m";     /* Initialize blink mode */
U		 = ESC+"[4m";     /* Initialize underscore mode */
REV		 = ESC+"[7m";     /* Turns reverse video mode on */
HIREV	 = ESC+"[1,7m";   /* Hi intensity reverse video  */

})();

exports.red = function(str){
	return HIR + str + NOR;
}

exports.orange = function(str){
	return YEL + str + NOR;
}

exports.yellow = function(str){
	return HIY + str + NOR;
}

exports.green = function(str){
	return HIG + str + NOR;
}

exports.cyan = function(str){
	return HIC + str + NOR;
}

exports.blue = function(str){
	return HIB + str + NOR;
}

exports.purple = function(str){
	return HIM + str + NOR;
}

exports.black = function(str){
	return BLK + str + NOR;
}

exports.white = function(str){
	return HIW + str + NOR;
}