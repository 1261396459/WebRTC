//兼容地获取媒体流
function getUserMedia(constrains, success, error) {
    if (navigator.mediaDevices.getUserMedia) {
    //最新标准API
       promise = navigator.mediaDevices.getUserMedia(constrains).then(success).catch(error);
    } else if (navigator.webkitGetUserMedia) {
    //webkit内核浏览器
       promise = navigator.webkitGetUserMedia(constrains).then(success).catch(error);
    } else if (navigator.mozGetUserMedia) {
    //Firefox浏览器
        promise = navagator.mozGetUserMedia(constrains).then(success).catch(error);
    } else if (navigator.getUserMedia) {
    //旧版API
        promise = navigator.getUserMedia(constrains).then(success).catch(error);
    }
}

//是否获取了媒体权限
function canGetUserMediaUse() {
    return !!(navigator.mediaDevices.getUserMedia 
        || navigator.webkitGetUserMedia
        || navigator.mozGetUserMedia 
        || navigator.msGetUserMedia
    );
}

var localVideoElm = null;
var socket = io();
function send(req,data){//向客户端发送消息
    socket.emit(req,data);
}
function recv(req,res){//接收服务器消息
    socket.on(req,res);
}
function Log(log){//自设打印函数，方便打印
    console.log(log);
}

$('document').ready(() => {//拍照设计
    $('#capture').click(() => {
        let video = localVideoElm//原生dom
        let isPlaying = !(video.paused || video.ended || video.seeking || video.readyState < video.HAVE_FUTURE_DATA)

        if (isPlaying) {
            let canvas = $('#capture-canvas')
            canvas.attr('width', localVideoElm.clientWidth);//设置canvas的宽度
            canvas.attr('height', localVideoElm.clientHeight);//设置canvas的高度

            let img = $('<img>')
            img.attr('width', localVideoElm.clientWidth);//设置图像的宽度
            img.attr('height', localVideoElm.clientHeight);//设置图像的高度

            //jQuery对象转dom
            var context = canvas[0].getContext('2d');
            //在canvas上绘图，其绘图坐标为0,0绘图大小为摄像头内容的宽度，高度
            context.drawImage(localVideoElm, 0, 0, localVideoElm.clientWidth,localVideoElm.clientHeight);
            //根据canvas内容进行编码，并赋值到图片上
            var data = canvas[0].toDataURL('image/png');
            img.attr('src', data);
            //插入到id为capture-list的有序列表里
            $('#capture-list').append($('<li></li>').html(img));
        }
    })
    $('#video-set').click(() => {
        var height = $('#video-h').val();
        var width = $('#video-w').val();
        localVideoElm.setAttribute('width', width);
        localVideoElm.setAttribute('height', height);
    });
    $('#video-change').click(() => {
        getPower("screen");//screen  environment
    });
    $('form').submit(function(e){
        e.preventDefault(); // prevents page reloading
        socket.emit('chat message', $('#m').val()); //触发事件
        $('#m').val(''); //清空输入框
        return false;
    });
});

const iceServer = {//转向服务器配置
    iceServers: [
    {
        urls: [ "stun:tk-turn1.xirsys.com" ]
    }, 
    {
        username: "p3YkNDPA_FNBGuj8IURZ-sUi7pUfycuntWM4YtoxdyeEXkZczgFI_rxi6KxOBfzYAAAAAF_oiOVhbHNvZWFzeQ==",
        credential: "900d7c8e-4845-11eb-b618-0242ac140004",
        urls: [
            "turn:tk-turn1.xirsys.com:80?transport=udp"
        ]
    }]  
};
//PeerConnection
var pc = [];
var localStream = null;

function getPower(select){//获取媒体播放权限
    switch(select){
        case "screen":
            Log("screen");
                getUserMedia({
                    video: {mediaSource: 'screen'},//共享屏幕{ facingMode: "user" } }前置摄像头 { facingMode: { exact: "environment" } } 后置摄像头
                    audio: true
                }, (stream) => {
                    localStream = stream;
                    localVideoElm.srcObject = stream;
                    $(localVideoElm).width(800);
                }, (err) => {
                    Log('访问用户媒体失败: ', err.name, err.message);
                });
                
            break;
        case "environment":
            if (canGetUserMediaUse()) {
                getUserMedia({
                    video: { facingMode: { exact: "environment" } },//{mediaSource: 'screen'}共享屏幕{ facingMode: "user" } }前置摄像头  后置摄像头
                    audio: true
                }, (stream) => {
                    localStream = stream;
                    localVideoElm.srcObject = stream;
                    $(localVideoElm).width(800);
                }, (err) => {
                    Log('访问用户媒体失败: ', err.name, err.message);
                });
                } else {
                alert('您的浏览器不兼容');
            }
            break;
        default:
            if (canGetUserMediaUse()) {
                getUserMedia({
                    //video: true,//{mediaSource: 'screen'}共享屏幕{ facingMode: "user" } }前置摄像头 { facingMode: { exact: "environment" } } 后置摄像头
                    video: true,
                    audio: true
                }, (stream) => {
                    localStream = stream;
                    localVideoElm.srcObject = stream;
                    $(localVideoElm).width(800);
                }, (err) => {
                    Log('访问用户媒体失败: ', err.name, err.message);
                });
                } else {
                alert('您的浏览器不兼容');
            }
            break;
    }
    
}

function InitCamera() {//初始化
    localVideoElm = document.getElementById("video-local");
    $('#video-h').val(400);
    $('#video-w').val(300);
    $('#video-set').click();
    getPower();
}

function StartCall(parterName, createOffer) {//para1 peer标识符 para2 是否创建offer

    pc[parterName] = new RTCPeerConnection(iceServer);
    //如果已经有本地流，那么直接获取Tracks并调用addTrack添加到RTC对象中。
    if (localStream) {
        localStream.getTracks().forEach((track) => {
            pc[parterName].addTrack(track, localStream);//指定要传输的视频流
        });
    }else{
    //否则需要重新启动摄像头并获取
        getPower();
    }
    //如果是呼叫方,那么需要createOffer请求
    if (createOffer) {
        //每当WebRTC基础结构需要你重新启动会话协商过程时，都会调用此函数。它的工作是创建和
        //发送一个请求，给被叫方，要求它与我们联系。
        pc[parterName].onnegotiationneeded = () => {
            pc[parterName].createOffer().then((offer) => {
                return pc[parterName].setLocalDescription(offer);
            }).then(() => {
            //把发起者的描述信息通过Signal Server发送到接收者
                send('sdp', {
                    type: 'video-offer',
                    description: pc[parterName].localDescription,
                    to: parterName,
                    sender: socket.id
                });
            })
        };
    }

    //当需要你通过信令服务器将一个ICE候选发送给另一个对等端时，本地ICE层将会调用你的
    //icecandidate 事件处理程序。有关更多信息，请参阅Sending ICE candidates 以查看此示例的代码。
    pc[parterName].onicecandidate = ({ candidate }) => {
        send('ice candidates', {
            candidate: candidate,
            to: parterName,
            sender: socket.id
        });
    };

    //当向连接中添加磁道时，track 事件的此处理程序由本地WebRTC层调用。例如，可以将传入媒体
    //连接到元素以显示它。详见 Receiving new streams 。
    pc[parterName].ontrack = (ev) => {
        let str = ev.streams[0];//获取流

        if (document.getElementById(`${parterName}-video`)) {
            document.getElementById(`${parterName}-video`).srcObject = str;
        } else {
            let newVideo = document.createElement('video');
            newVideo.id = `${parterName}-video`;//连接断开时利用id去掉视频
            newVideo.className = "ve";
            newVideo.autoplay = true;
            newVideo.controls = true;
            newVideo.srcObject = str;

            document.getElementById('videos').appendChild(newVideo);
        }
    }
}

recv('connect', () => {
    InitCamera();

    //输出内容 其中 socket.id 是当前socket连接的唯一ID
    Log('connect ' + socket.id);
    //显示本机ID
    $('#user-id').text("me : "+socket.id);
    pc.push(socket.id);

    send('new user greet', {
        sender: socket.id,
        msg: 'hello world'
    });

    recv('need connect', (data) => {
        Log(data);
        //创建新的li并添加到用户列表中
        let li = $('<li></li>').text(data.sender).attr('user-id', data.sender);
        $('#user-list').append(li);
        //同时创建一个按钮
        let button = $('<button class="call">通话</button>');
        button.appendTo(li);
        //监听按钮的点击事件, 这是个demo 需要添加很多东西，比如不能重复拨打已经连接的用户
        $(button).click(function () {
            //$(this).parent().attr('user-id')
            Log($(this).parent().attr('user-id'));
            //点击时，开启对该用户的通话
            StartCall($(this).parent().attr('user-id'), true);
        });

        send('ok we connect', { receiver: data.sender, sender: socket.id });
    });
    
    //某个用户失去连接时，我们需要获取到这个信息
    recv('user disconnected', (socket_id) => {
        Log('disconnect : ' + socket_id);
        $('#user-list li[user-id="' + socket_id + '"]').remove();
        $('#videos video[id="' + socket_id + '-video"]').remove();//用户失去连接时移除
    })
    
    //链接吧..
    recv('ok we connect', (data) => {
        Log(data);
        let li = $('<li></li>').text(data.sender).attr('user-id', data.sender);
        $('#user-list').append(li);
        //同时创建一个按钮
        let button = $('<button class="call">通话</button>');
        button.appendTo(li);
        //监听按钮的点击事件, 这是个demo 需要添加很多东西，比如不能重复拨打已经连接的用户
        $(button).click(function () {
            //$(this).parent().attr('user-id')
            Log($(this).parent().attr('user-id'));
            //点击时，开启对该用户的通话
            StartCall($(this).parent().attr('user-id'), true);
        });
    });

    recv('chat message', function(msg){
        $('#messages').append($('<li style="color: white">').text(msg));
    });

    //监听发送的sdp事件
    recv('sdp', (data) => {
        //如果时offer类型的sdp
        if (data.description.type === 'offer') {
            //那么被呼叫者需要开启RTC的一套流程，同时不需要createOffer，所以第二个参数为false
            StartCall(data.sender, false);
            //把发送者(offer)的描述，存储在接收者的remoteDesc中。
            let desc = new RTCSessionDescription(data.description);
            //按1-13流程走的
            pc[data.sender].setRemoteDescription(desc).then(() => {

                pc[data.sender].createAnswer().then((answer) => {
                    return pc[data.sender].setLocalDescription(answer);
                }).then(() => {
                    send('sdp', {
                        type: 'video-answer',
                        description: pc[data.sender].localDescription,
                        to: data.sender,
                        sender: socket.id
                    });
                }).catch(err => {
                    Log("sdp create err "+err);
                });//catch error function empty

            })
        } else if (data.description.type === 'answer') {
            //如果使应答类消息（那么接收到这个事件的是呼叫者）
            let desc = new RTCSessionDescription(data.description);
            pc[data.sender].setRemoteDescription(desc);
        }
    })

    //如果是ice candidates的协商信息
    recv('ice candidates', (data) => {
        Log('ice candidate: ' + data.candidate);
    //{ candidate: candidate, to: partnerName, sender: socketID }
    //如果ice candidate非空（当candidate为空时，那么本次协商流程到此结束了）
        if (data.candidate) {
            var candidate = new RTCIceCandidate(data.candidate);
            //讲对方发来的协商信息保存
            pc[data.sender].addIceCandidate(candidate).catch();//catch err functionempty
        }
    })
});
