# nodensp
一个简单的http服务器，支持一般的http文件操作
提供了一种类似Asp的服务器活动页面:nsp
可以在nsp中使用全部node的功能

例如：

<%
  let times = resuest.query.times;
%>

<html>
  <%
     for (let i = 0; i < times; ++i){
  %>
  <p>这是第<%=i%>行</p>
  <%}%>
</html>
