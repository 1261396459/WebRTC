var express = require("express");
var app = express();
const fs = require('fs');
let sslOptions = {
        key: fs.readFileSync('C:/privkey.key'),//私钥
        cert: fs.readFileSync('C:/cacert.pem')//证书
};
var https = require('https').createServer(sslOptions, app);  
var io = require('socket.io')(https);
 
//收到get请求则发送html文档
app.get('/test', (req, res) => {
    res.sendFile(__dirname + '/test.html');
})
    
//使用静态文件夹，连通css/js
app.use(express.static('public'));

//开启服务器
var server = https.listen(3000, () => {
  var host = server.address().address == "::" ? "127.0.0.1" : server.address().port;
  var port = server.address().port;
  var path = "/test";
  console.log("访问地址为 https://%s:%s%s", host, port, path);
});

io.on('connection', (socket) => {//连接加入子房间
    socket.join( socket.id );
    console.log("a user connected " + socket.id);

    function sendAll(req,data){//向客户端广播
        socket.broadcast.emit(req,data);
    }
    function recv(req,res){//接收客户端消息
        socket.on(req,res);
    }

    recv("disconnect", () => {//某个用户断开连接的时告诉所有还在线的用户
        console.log(socket.id+" disconnected");
        sendAll(socket.id+'user disconnected');
    });
    
    recv("chat message",(msg) => {//转发聊天消息
        console.log(socket.id + " say: " + msg);
        sendAll("chat message",socket.id + " say: "+msg);
        socket.emit("chat message",socket.id + " say: "+msg);
    });
    
    recv('new user greet', (data) => {//当有新用户加入告知所有在线用户。
        console.log(socket.id + ' greet ' + data.msg);
        sendAll('need connect', {sender: socket.id, msg : data.msg});
    });
    
    recv('ok we connect', (data) => {//在线用户回应新用户消息的转发
        io.to(data.receiver).emit('ok we connect', {sender : data.sender});
    });
    
    recv( 'sdp', ( data ) => {//sdp 消息的转发
          console.log('sdp: ' + data.sender + ' to:' + data.to);
          socket.to( data.to ).emit( 'sdp', {
              description: data.description,
              sender: data.sender
         } );
    } );
    
    recv( 'ice candidates', ( data ) => {//candidates 消息的转发
        console.log('ice candidates: ' + data.sender + ' to:' + data.to);
        socket.to( data.to ).emit( 'ice candidates', {
            candidate: data.candidate,
            sender: data.sender
         } );
    } );
});