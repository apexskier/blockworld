(function() {
    // constants
    const MOUSE_SENSITIVITY = 5; // higher is less sensitive
    const LOWER_TOUCH_BOUNDARY = 0.3;
    const SHORT_TAP_DURATION = 100;
    const MOBILE_PAN_CONTROL = "deviceorientation"; // "touchmove" or "deviceorientation"

    var socket = io.connect();

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    var canvas = document.getElementById("main");
    var renderer = new THREE.WebGLRenderer({
        canvas: canvas
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    var geometry = new THREE.BoxGeometry(1,1,1);
    var material = new THREE.MeshLambertMaterial({ color: 0x00ff00, ambient: 0x00ff00 });
    var cube = new THREE.Mesh(geometry, material);
    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1, 4, 7).normalize();
    var ambientLight = new THREE.AmbientLight(0x666666);

    scene.add(cube);
    scene.add(directionalLight);
    scene.add(ambientLight);

    var objects = {}

    camera.position.z = 5;
    camera.rotation.order = 'ZXY';

    socket.on('connect', function(msg) {
        console.log("connected to ws");
        var now = new Date();
        socket.emit('ping', {});
        socket.on('pong', function(msg) {
            console.log('pong');
            console.log(new Date() - now);
        });

        socket.on('add', function(msg) {
            console.log(msg);
            if (msg.type == "collection") {
                for (i in msg) {
                    if (i != "type") {
                        addObject(msg[i]);
                    }
                }
            } else {
                addObject(msg);
            }
        });
        function addObject(info) {
            console.log("adding object");
            console.log(info);
            var geometry;
            if (info.hasOwnProperty('size')) {
                geometry = new THREE.BoxGeometry(info.size,info.size,info.size);
            } else {
                geometry = new THREE.BoxGeometry(1,1,1);
            }
            var material = new THREE.MeshLambertMaterial({ color: info.color, ambient: info.color });
            objects[info.id] = new THREE.Mesh(geometry, material);
            var o = objects[info.id]
            if (info.hasOwnProperty('position')) {
                o.position.x = info.position.x;
                o.position.y = info.position.y;
                o.position.z = info.position.z;
            } else {
                o.position.z = 3;
            }
            o.rotation.order = 'ZXY';
            scene.add(o);
        }

        socket.on('remove', function(msg) {
            console.log('remove');
            scene.remove(objects[msg.id]);
            delete objects[msg.id];
        });

        socket.on('move', function(msg) {
            if (objects.hasOwnProperty(msg.id)) {
                var o = objects[msg.id];
                if (msg.hasOwnProperty('position')) {
                    if (msg.position.hasOwnProperty('x')) {
                        o.position.x = msg.position.x;
                    }
                    if (msg.position.hasOwnProperty('y')) {
                        o.position.y = msg.position.y;
                    }
                    if (msg.position.hasOwnProperty('z')) {
                        o.position.z = msg.position.z;
                    }
                }
                if (msg.hasOwnProperty('rotation')) {
                    if (msg.rotation.hasOwnProperty('x')) {
                        o.rotation.x = msg.rotation.x;
                    }
                    if (msg.rotation.hasOwnProperty('y')) {
                        o.rotation.y = msg.rotation.y;
                    }
                    if (msg.rotation.hasOwnProperty('z')) {
                        o.rotation.z = msg.rotation.z;
                    }
                }
            }
        });
    });

    var radFactor = Math.PI / 180;
    var base = {
        rotation: {
            x: 0,
            y: 0,
            z: 0
        },
        position: {
            x: 0,
            y: 0,
            z: 0
        }
    };
    var change = {
        position: {
            x: 0,
            y: 0,
            z: 0
        },
        rotation: {
            x: 0,
            y: 0,
            z: 0
        }
    };

    var height = document.documentElement.clientHeight;

    var touchPan = {};
    var savedTouches = {};
    var oldBase;

    var count = 0;
    var oldOrientation = {
        x: 0,
        y: 0,
        z: 0
    }
    if (typeof window.DeviceOrientationEvent != "undefined" && MOBILE_PAN_CONTROL == "deviceorientation") {
        window.addEventListener("deviceorientation", handleOrientationInit, true);
        function handleOrientationInit(e) {
            oldOrientation.x = e.beta * radFactor;
            oldOrientation.y = e.gamma * radFactor;
            oldOrientation.z = e.alpha * radFactor;
            window.removeEventListener("deviceorientation", handleOrientationInit, true);
            window.addEventListener("deviceorientation", handleOrientation, true);
        }

        function handleOrientation(e) {
            //event.absolute;
            /*
            var oldX = camera.rotation.x - oldOrientation.x;
                oldY = camera.rotation.y - oldOrientation.y;
                oldZ = camera.rotation.z - oldOrientation.z;

            var newOrientationX = e.beta * radFactor,
                newOrientationY = e.gamma * radFactor,
                newOrientationZ = e.alpha * radFactor;

            camera.rotation.set(0, 0, 0);

            camera.rotation.x = newOrientationX + oldX;
            camera.rotation.y = newOrientationY + oldY;
            camera.rotation.z = newOrientationZ + oldZ;

            oldOrientation = {
                x: newOrientationX,
                y: newOrientationY,
                z: newOrientationZ
            }
            */

            camera.rotation.x = e.beta * radFactor;
            camera.rotation.y = e.gamma * radFactor;
            camera.rotation.z = e.alpha * radFactor;
        }
    }

    /*
    window.addEventListener("orientationchange", setOrientation, false);
    function setOrientation() {
        if (window.orientation == 0) {
            camera.rotation.order = 'ZXY';
        } else if (window.orientation == 90) {
            camera.rotation.order = 'XYZ';
        }
    }
    setOrientation();
    */

    var lowerTouches = 0;
    window.addEventListener("touchstart", function(e) {
        for (var k in e.changedTouches) {
            var testK = parseInt(k);
            if (testK === testK) { // if isn't NaN
                var t = e.changedTouches[k];
                if (height - t.clientY < LOWER_TOUCH_BOUNDARY * height) {
                    lowerTouches++;
                    savedTouches[t.identifier] = "lower";
                    if (lowerTouches == 1) {
                        change.position.z = 0.1;
                    } else {
                        change.position.z = -0.1;
                    }
                } else {
                    if (MOBILE_PAN_CONTROL == "touchmove" && touchPan.id === null) {
                        // start panning
                        oldBase = clone(base);
                        touchPan.id = t.identifier;
                        touchPan.x = t.clientX;
                        touchPan.y = t.clientY;
                    }
                    savedTouches[t.identifier] = {
                        time: new Date()
                    }
                }
            }
        }
        e.preventDefault();
    });
    window.addEventListener("touchend", function(e) {
        for (var k in e.changedTouches) {
            var testK = parseInt(k);
            if (testK === testK) { // if isn't NaN
                var t = e.changedTouches[k];
                var saved = savedTouches[t.identifier];
                if (saved == "lower") {
                    lowerTouches--;
                    if (lowerTouches == 1) {
                        change.position.z = 0.1;
                    } else if (lowerTouches === 0) {
                        change.position.z = 0;
                    }
                } else {
                    if (t.identifier === touchPan.id) {
                        // stop panning
                        touchPan.id = null;
                    }
                    if (saved.hasOwnProperty("time")) {
                        var diff = new Date() - saved.time;
                        // short tap
                        if (diff < SHORT_TAP_DURATION) {
                            placeObject();
                        }
                    }
                }
            }
        }
        if (e.touches.length == 0) {
            // just in case
            touchPan.id = null;
            change.position.z = 0;
            lowerTouches = 0;
            savedTouches = {};
        }
        e.preventDefault();
    });
    window.addEventListener("touchmove", function(e) {
        for (var k in e.changedTouches) {
            var testK = parseInt(k);
            if (testK === testK) { // if isn't NaN
                var t = e.changedTouches[k];
                if (MOBILE_PAN_CONTROL == "touchmove" && t.identifier === touchPan.id) {
                    // panning
                    camera.rotateY((t.clientX - touchPan.x) * radFactor / 5);
                    camera.rotateX((t.clientY - touchPan.y) * radFactor / 5);

                    touchPan.x = t.clientX;
                    touchPan.y = t.clientY;
                }
            }
        }
        e.preventDefault();
    });

    /*
     * Desktop controls
     */
    canvas.onclick = function() {
        canvas.requestPointerLock();
    }
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
    function lockChangeAlert() {
        if (document.pointerLockElement === canvas ||
                document.mozPointerLockElement === canvas ||
                document.webkitPointerLockElement === canvas) {
            document.addEventListener("mousemove", handleMouseMove, false);
        } else {
            document.removeEventListener("mousemove", handleMouseMove, false);
        }
    }
    function handleMouseMove(e) {
        var movementX = e.movementX ||
                        e.mozMovementX          ||
                        e.webkitMovementX       ||
                        0;
        var movementY = e.movementY ||
                        e.mozMovementY      ||
                        e.webkitMovementY   ||
                        0;
        camera.rotateY(-movementX * radFactor / MOUSE_SENSITIVITY);
        camera.rotateX(-movementY * radFactor / MOUSE_SENSITIVITY);
    }

    window.addEventListener("keydown", function(e) {
        switch (e.keyCode) {
            case 87: // W
                change.position.z = 0.1;
                break;
            case 83: // S
                change.position.z = -0.1;
                break;
            case 65: // A
                change.position.x = -0.1;
                break;
            case 68: // D
                change.position.x = 0.1;
                break;
            case 37: // <-
                change.rotation.y = 2 * radFactor;
                e.preventDefault();
                break;
            case 39: // ->
                change.rotation.y = -2 * radFactor;
                e.preventDefault();
                break;
            case 38: // up
                change.rotation.x = 2 * radFactor;
                break;
            case 40: // down
                change.rotation.x = -2 * radFactor;
                break;
            default:
                break;
        }
    });
    window.addEventListener("keyup", function(e) {
        switch (e.keyCode) {
            case 87: // W
            case 83: // S
                change.position.z = 0;
                break;
            case 65: // A
            case 68: // D
                change.position.x = 0;
                break;
            case 37: // <-
            case 39: // ->
                change.rotation.y = 0;
                break;
            case 38: // up
            case 40: // down
                change.rotation.x = 0;
                break;
            case 32: // <space>
                placeObject();
            default:
                break;
        }
    });


    function placeObject() {
        var objectplace = new THREE.Vector3();
        objectplace.copy(camera.position)
        objectplace.add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize().multiplyScalar(3));
        socket.emit('place', {
            position: {
                x: objectplace.x,
                y: objectplace.y,
                z: objectplace.z
            }
        });
    }

    function render() {
        requestAnimationFrame(render);

        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        camera.translateZ(-change.position.z);
        camera.translateX(change.position.x);
        camera.rotateY(change.rotation.y);
        camera.rotateX(change.rotation.x);

        socket.emit('move', {
            rotation: {
                x: camera.rotation.x,
                y: camera.rotation.y,
                z: camera.rotation.z
            },
            position: {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            }
        });

        renderer.render(scene, camera);
    }

    render();

    function clone(obj) {
        if(obj == null || typeof(obj) != 'object')
            return obj;

        var temp = obj.constructor(); // changed

        for(var key in obj) {
            if(obj.hasOwnProperty(key)) {
                temp[key] = clone(obj[key]);
            }
        }
        return temp;
    }
})();
