var Physics = function() {
	var this_ = this,

        objects = {},
        lastTime = 0;
    const EPSILON = 0.00001;

    this.CollisionMask = (function() {
        var marker = -1;
        return function() {
            this.id = Math.floor(Math.pow(2, marker++));
        }
    })();
    this.NullCollisionMask = new this.CollisionMask();

    this.register = function(object, mask, hitbox, friction) {
        if (!object instanceof THREE.Object3D) {
            throw "object not instance of THREE.Object3D";
        }
        if (mask === null) mask = this.NullCollisionMask;
        if (!mask instanceof this_.CollisionMask) {
            throw "mask not instance of Physics.CollisionMask";
        }
        if (hitbox === null) hitbox = object.geometry;
        if (!hitbox instanceof THREE.Geometry) {
            throw "object not instance of THREE.Geometry";
        }
        friction = friction || 1.02;
        if (!objects.hasOwnProperty(object.uuid)) {
            objects[object.uuid] = {
                velocity: new THREE.Vector3(),
                rotation: [],
                collisionMask: mask,
                hitbox: hitbox,
                lastPosition: object.position,
                lastRotation: object.rotation,
                object: object,
                friction: friction,
                maxSpeed: false,
                applyForce: function (vec) {
                    if (!vec instanceof THREE.Vector3) {
                        throw "vector not instance of THREE.Vector3";
                    }
                    this.velocity.add(vec);
                    if (this.maxSpeed && this.velocity.length() > this.maxSpeed) {
                        this.velocity.setLength(this.maxSpeed);
                    }
                },
                dampenForce: function (amount) {
                    this.velocity.divideScalar(amount);
                }
            }
        }
        return objects[object.uuid];
    };

    this.update = function(time) {
        var timeDiff = (time - lastTime) / 1000;

        for (id in objects) {
            if (objects.hasOwnProperty(id)) {
                var object = objects[id];
                var len = object.velocity.length();

                if (len > EPSILON) {
                    object.object.translateOnAxis(object.velocity, timeDiff * len);
                }

                object.velocity.divideScalar(object.friction);
            }
        }

        lastTime = time;
    }

    return this;
};
