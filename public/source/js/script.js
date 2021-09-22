// When the DOM is ready

document.addEventListener("DOMContentLoaded", function (event) {

    var audio = new Audio('/resources/phone.mp3');
    audio.loop = true;
    var ring = null;

    var peer_id;
    var username;
    var conn;
    let host = '192.168.0.105'; //change this to the servers address

    /**
     * Important: the host needs to be changed according to your requirements.
     * e.g if you want to access the Peer server from another device, the
     * host would be the IP of your host namely 192.xxx.xxx.xx instead
     * of localhost.
     *
     * The iceServers on this example are public and can be used for your project.
     */
    var peer = new Peer(getId(), {
        host: host, //todo:change this
        port: 9000,
        path: '/peerjs',
        debug: 3,
        config: {
            'iceServers': [
                {url: 'stun:stun1.l.google.com:19302'},
                {
                    url: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                }
            ]
        }
    });

    // Once the initialization succeeds:
    // Show the ID that allows other user to connect to your session.
    peer.on('open', function () {
        document.getElementById("peer-id-label").innerHTML = peer.id;
    });

    // When someone connects to your session:
    //
    // 1. Hide the peer_id field of the connection form and set automatically its value
    // as the peer of the user that requested the connection.
    // 2.
    peer.on('connection', function (connection) {
        conn = connection;
        peer_id = connection.peer;

        // Use the handleMessage to callback when a message comes in
        conn.on('data', handleMessage);

        // Hide peer_id field and set the incoming peer id as value

        document.getElementById("peer_id").className += " hidden";
        document.getElementById("peer_id").value = peer_id;
        document.getElementById("connected_peer").innerHTML = connection.metadata.username;
        document.getElementById('status').innerHTML = '1';

        document.getElementById("connect-to-peer-btn").innerHTML = 'Confirmar';
    });

    peer.on('error', function (err) {
        document.getElementById('status').innerHTML = '0';
        //alert("An error ocurred with peer: " + err);
        console.error(err);

        let id = getId();

        if (id.length >= 10) {
            let letters = id.replace(/[\W\d_]/g, '');

            document.location.replace('https://' + host + ':8443?id=' + letters + Math.floor(Math.random() * 101));

        } else {
            document.location.replace('https://' + host + ':8443?id=' + id + Math.floor(Math.random() * 101));

        }
    });

    peer.on('disconnected', function (err) {
        document.getElementById('status').innerHTML = '0';
    });

    /**
     * Handle the on receive call event
     */

    peer.on('call', function (call) {

        audio.play();


        Swal.fire({
            title: 'RECEBENDO LIGAÇÃO',
            text: "Aceitar ligação de DISS",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim',
            cancelButtonText: "Não"
        }).then((result) => {
            if (result.value) {
                audio.pause();
                // Answer the call with your own video/audio stream
                call.answer(window.localStream);

                // Receive data
                call.on('stream', function (stream) {
                    // Store a global reference of the other user stream
                    window.peer_stream = stream;
                    // Display the stream of the other user in the peer-camera video element !
                    onReceiveStream(stream, 'peer-camera');
                });

                // Handle when the call finishes
                call.on('close', function () {
                    alert("A ligação foi finalizada");
                    window.location.reload();
                });
            } else {
                audio.pause();
                document.getElementById('status').innerHTML = '0';
                console.log("Call denied !");
            }
        })

    });

    /**
     * Starts the request of the camera and microphone
     *
     * @param {Object} callbacks
     */
    function requestLocalVideo(callbacks) {
        // Monkeypatch for crossbrowser geusermedia
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        // Request audio an video
        navigator.getUserMedia({audio: true, video: false}, callbacks.success, callbacks.error);
    }

    /**
     * Handle the providen stream (video and audio) to the desired video element
     *
     * @param {*} stream
     * @param {*} element_id
     */
    function onReceiveStream(stream, element_id) {
        // Retrieve the video element according to the desired
        var video = document.getElementById(element_id);
        // Set the given stream as the video source
        video.srcObject = stream;

        // Store a global reference of the stream
        window.peer_stream = stream;
    }

    /**
     * Appends the received and sent message to the listview
     *
     * @param {Object} data
     */
    function handleMessage(data) {
        var orientation = "text-left";

        // If the message is yours, set text to right !
        if (data.from == username) {
            orientation = "text-right"
        }

        var messageHTML = '<a href="javascript:void(0);" class="list-group-item' + orientation + '">';
        messageHTML += '<h4 class="list-group-item-heading">' + data.from + '</h4>';
        messageHTML += '<p class="list-group-item-text">' + data.text + '</p>';
        messageHTML += '</a>';

        document.getElementById("messages").innerHTML += messageHTML;
    }

    /**
     * Handle the send message button
     */
    document.getElementById("send-message").addEventListener("click", function () {
        // Get the text to send
        var text = document.getElementById("message").value;

        // Prepare the data to send
        var data = {
            from: username,
            text: text
        };

        // Send the message with Peer
        conn.send(data);

        // Handle the message on the UI
        handleMessage(data);

        document.getElementById("message").value = "";
    }, false);

    /**
     *  Request a videocall the other user
     */
    document.getElementById("call").addEventListener("click", function () {
        console.log('Calling to ' + peer_id);
        console.log(peer);

        var call = peer.call(peer_id, window.localStream);

        call.on('stream', function (stream) {
            window.peer_stream = stream;

            onReceiveStream(stream, 'peer-camera');
        });
    }, false);

    document.getElementById("hang").addEventListener("click", function () {

        hang(reload);

    }, false);

    /**
     * On click the connect button, initialize connection with peer
     */
    document.getElementById("connect-to-peer-btn").addEventListener("click", function () {
        username = document.getElementById("name").value;
        peer_id = document.getElementById("peer_id").value;

        if (peer_id) {
            conn = peer.connect(peer_id, {
                metadata: {
                    'username': username
                }
            });

            conn.on('data', handleMessage);
        } else {
            alert("You need to provide a peer to connect with !");
            return false;
        }

        document.getElementById("chat").className = "";
        document.getElementById("connection-form").className += " hidden";
    }, false);


    /**
     * Initialize application by requesting your own video to test !
     */
    requestLocalVideo({
        success: function (stream) {
            window.localStream = stream;
            onReceiveStream(stream, 'my-camera');
        },
        error: function (err) {
            alert("Cannot get access to your camera and video !");
            console.error(err);
        }
    });


    function hang(callback) {
        peer.disconnect();
        callback();
    }

    function reload(){
        window.location.reload();
    }

}, false);

function getId() {
    let currentUrl = window.location.href;
    if (currentUrl.includes('id')) {
        let splitUrl = currentUrl.split('=');
        return splitUrl[1];
    } else {
        return '';
    }
}






