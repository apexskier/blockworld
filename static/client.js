(function() {
    // constants
    const MOUSE_SENSITIVITY = 5; // higher is less sensitive
    const LOWER_TOUCH_BOUNDARY = 0.3;
    const SHORT_TAP_DURATION = 110;
    const MOBILE_PAN_CONTROL = "deviceorientation"; // "touchmove" or "deviceorientation"

    var socket = io.connect();

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    var height = document.documentElement.clientHeight;
    var width = document.documentElement.clientWidth;

    var canvas = document.getElementById("main");
    var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //var geometry = new THREE.BoxGeometry(1,1,1);
    //var material = new THREE.MeshLambertMaterial({ color: 0x00ff00, ambient: 0x00ff00 });
    //var cube = new THREE.Mesh(geometry, material);
    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1, 1, 1).normalize();
    var directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(1, -1, -1).normalize();
    var ambientLight = new THREE.AmbientLight(0x666666);

    var selfGeo = new THREE.SphereGeometry(0.4, 32, 32 );
    var selfMat = new THREE.MeshLambertMaterial({ color: 0xffffff, ambient: 0xffffff });
    selfObject = new THREE.Mesh(selfGeo, selfMat);

    var camDistance = 5;

    var controls = new THREE.CustomControls(canvas, camera, selfObject);
    controls.inverted = true;

    var physics = new Physics();
    selfPhysics = physics.register(selfObject);

    controls.keyHold('w', function () {
        selfPhysics.applyForce(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setLength(1));
    });
    controls.keyHold('s', function () {
        selfPhysics.applyForce(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setLength(-1));
    });

    //scene.add(cube);
    scene.add(selfObject);
    scene.add(directionalLight);
    scene.add(directionalLight2);
    scene.add(ambientLight);

    var objects = {}

    camera.position.z = 5;
    camera.position.x = 5;
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
            o.blockworld_id = info.id
            scene.add(o);
        }

        socket.on('remove', function(msg) {
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

        socket.on('remove', function(msg) {
            if (objects.hasOwnProperty(msg.id)) {
                scene.remove(objects[msg.id]);
                delete objects[msg.id];
            }
            lastObj = null;
            if (sceneline.line !== null) {
                scene.remove(sceneline.line);
            }
        });

        socket.on('info', function(msg) {
            console.log(msg);
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

    var touchPan = {};
    var savedTouches = {};
    var oldBase;

    var count = 0;
    var oldOrientation = {
        x: 0,
        y: 0,
        z: 0
    }
    if (typeof window.DeviceOrientationEvent !== "undefined" && MOBILE_PAN_CONTROL == "deviceorientation") {
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
        function handleOrientationInit(e) {
            oldOrientation.x = e.beta * radFactor;
            oldOrientation.y = e.gamma * radFactor;
            oldOrientation.z = e.alpha * radFactor;
            window.removeEventListener("deviceorientation", handleOrientationInit, true);
            window.addEventListener("deviceorientation", handleOrientation, true);
        }
        window.addEventListener("deviceorientation", handleOrientationInit, true);
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
                    placePlaceholder();
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
                        //if (diff < SHORT_TAP_DURATION) {
                            placeObject();
                        //}
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

    window.addEventListener("keydown", function(e) {
        switch (e.keyCode) {
            /*case 87: // W
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
                break;*/
            case 32: // <space>
                placePlaceholder();
                break;
            case 82: // r
                removeObject(lastObj.object);
                break;
            case 81: // q
                getInfo(lastObj.object);
                break;
            default:
                break;
        }
    });
    window.addEventListener("keyup", function(e) {
        switch (e.keyCode) {
            /*case 87: // W
            case 83: // S
                change.position.z = 0;
                break;
            case 65: // A
            case 68: // D
                change.position.x = 0;
                break;*/
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
        objectplace.copy(selfObject.position)
        objectplace.add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize().multiplyScalar(3));
        socket.emit('place', {
            position: {
                x: objectplace.x,
                y: objectplace.y,
                z: objectplace.z
            }
        });
        removePlaceholder();
    }

    function removeObject(obj) {
        socket.emit('remove', {
            id: obj.blockworld_id
        });
    }

    function getInfo(obj) {
        socket.emit('query', {
            id: obj.blockworld_id
        });
    }

    var placeholderCube = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({
        color: 0xffffff,
        ambient: 0xffffff,
        opacity: 0.5,
        transparent: true
    }));
    var placeholderActive = false

    function movePlaceholderCube() {
        if (placeholderActive) {
            var objectplace = new THREE.Vector3();
            objectplace.copy(selfObject.position)
            objectplace.add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize().multiplyScalar(3));
            placeholderCube.position.set(objectplace.x, objectplace.y, objectplace.z);
        }
    }

    function placePlaceholder() {
        var posVector = cloneVector(selfObject.position);
        posVector.add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize().multiplyScalar(3));
        placeholderCube.position.set(posVector.x, posVector.y, posVector.z);
        scene.add(placeholderCube);
        placeholderActive = true;
    }

    function removePlaceholder() {
        placeholderActive = false;
        scene.remove(placeholderCube);
    }

    var centerVector = new THREE.Vector3(0, 0, -1);
    var raycaster = new THREE.Raycaster(camera.position, centerVector, 0.5, 6);
    var lineMaterial = new THREE.LineBasicMaterial({
        color: 0x88aaff,
        opacity: 0.7,
        linewidth: 3,
        transparent: true
    });
    var sceneline = {
        line: null
    };
    var lastObj = null;

    function render(time) {
        requestAnimationFrame(render);

        controls.update();
        physics.update(time);

        //cube.rotation.x += 0.01;
        //cube.rotation.y += 0.01;

        socket.emit('move', {
            rotation: {
                x: selfObject.rotation.x,
                y: selfObject.rotation.y,
                z: selfObject.rotation.z
            },
            position: {
                x: selfObject.position.x,
                y: selfObject.position.y,
                z: selfObject.position.z
            }
        });

        centerVector.set(0, 0, -1);
        centerVector.applyQuaternion(camera.quaternion).normalize();

        raycaster.set(camera.position, centerVector);

        objLookAt = _.min(raycaster.intersectObjects(_.map(objects, function(v, k) {
            return v;
        })), function(v) {
            return v.distance;
        });

        if (objLookAt !== Infinity) {
            lastObj = objLookAt;
        }
        if (lastObj !== null) {
            var testVector = new THREE.Vector3();
            testVector.copy(camera.position);
            if (sceneline.line !== null) {
                scene.remove(sceneline.line);
            }
            if (Math.abs(testVector.sub(lastObj.object.position).length()) < 8) {
                var vertices = [];
                camera.translateY(-1);
                camera.translateZ(-75/2 * radFactor * 1);
                vertices.push(cloneVector(camera.position));
                camera.translateZ(-0.4);
                camera.translateY(0.4);
                vertices.push(cloneVector(camera.position));
                camera.translateY(-0.4);
                camera.translateZ(0.4);
                camera.translateZ(75/2 * radFactor * 1);
                camera.translateY(1);
                vertices.push(cloneVector(lastObj.object.position));

                var lineGeometry = new THREE.Geometry();
                var SUBDIVISIONS = 20;
                var curve = new THREE.QuadraticBezierCurve3();
                curve.v0 = vertices[0];
                curve.v1 = vertices[1];
                curve.v2 = vertices[2];
                for (j = 0; j < SUBDIVISIONS; j++) {
                    lineGeometry.vertices.push( curve.getPoint(j / SUBDIVISIONS) );
                }

                sceneline.line = new THREE.Line(lineGeometry, lineMaterial);
                scene.add(sceneline.line);
            }
        } else if (sceneline.line !== null) {
            scene.remove(sceneline.line);
        }

        movePlaceholderCube();

        renderer.render(scene, camera);
    }

    function cloneVector(oldVector) {
        return (function() {
            var v = new THREE.Vector3();
            v.copy(oldVector);
            return v;
        })()
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
