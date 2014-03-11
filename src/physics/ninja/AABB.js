/**
* @author       Richard Davey <rich@photonstorm.com>
* @copyright    2014 Photon Storm Ltd.
* @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
*/

/**
* Ninja Physics AABB constructor.
* Note: This class could be massively optimised and reduced in size. I leave that challenge up to you.
*
* @class Phaser.Physics.Ninja.AABB
* @classdesc Arcade Physics Constructor
* @constructor
* @param {Phaser.Physics.Ninja.Body} body - The body that owns this shape.
* @param {number} x - The x coordinate to create this shape at.
* @param {number} y - The y coordinate to create this shape at.
* @param {number} width - The width of this AABB.
* @param {number} height - The height of this AABB.
*/
Phaser.Physics.Ninja.AABB = function (body, x, y, width, height) {
    
    /**
    * @property {Phaser.Physics.Ninja.Body} system - A reference to the body that owns this shape.
    */
    this.body = body;

    /**
    * @property {Phaser.Physics.Ninja} system - A reference to the physics system.
    */
    this.system = body.system;

    /**
    * @property {Phaser.Point} pos - The position of this object.
    */
    this.pos = new Phaser.Point(x, y);

    /**
    * @property {Phaser.Point} oldpos - The position of this object in the previous update.
    */
    this.oldpos = new Phaser.Point(x, y);

    /**
    * @property {number} xw - Half the width.
    * @readonly
    */
    this.xw = Math.abs(width / 2);

    /**
    * @property {number} xw - Half the height.
    * @readonly
    */
    this.yw = Math.abs(height / 2);

    /**
    * @property {number} width - The width.
    * @readonly
    */
    this.width = width;

    /**
    * @property {number} height - The height.
    * @readonly
    */
    this.height = height;

    /**
    * @property {number} oH - Internal var.
    * @private
    */
    this.oH = 0;

    /**
    * @property {number} oV - Internal var.
    * @private
    */
    this.oV = 0;

    /**
    * @property {Phaser.Point} velocity - The velocity of this object.
    */
    this.velocity = new Phaser.Point();

    /**
    * @property {object} aabbTileProjections - All of the collision response handlers.
    */
    this.aabbTileProjections = {};

    this.aabbTileProjections[Phaser.Physics.Ninja.Tile.TYPE_FULL] = this.projAABB_Full;
    this.aabbTileProjections[Phaser.Physics.Ninja.Tile.TYPE_45DEG] = this.projAABB_45Deg;
    this.aabbTileProjections[Phaser.Physics.Ninja.Tile.TYPE_CONCAVE] = this.projAABB_Concave;
    this.aabbTileProjections[Phaser.Physics.Ninja.Tile.TYPE_CONVEX] = this.projAABB_Convex;
    this.aabbTileProjections[Phaser.Physics.Ninja.Tile.TYPE_22DEGs] = this.projAABB_22DegS;
    this.aabbTileProjections[Phaser.Physics.Ninja.Tile.TYPE_22DEGb] = this.projAABB_22DegB;
    this.aabbTileProjections[Phaser.Physics.Ninja.Tile.TYPE_67DEGs] = this.projAABB_67DegS;
    this.aabbTileProjections[Phaser.Physics.Ninja.Tile.TYPE_67DEGb] = this.projAABB_67DegB;
    this.aabbTileProjections[Phaser.Physics.Ninja.Tile.TYPE_HALF] = this.projAABB_Half;

};

Phaser.Physics.Ninja.AABB.prototype.constructor = Phaser.Physics.Ninja.AABB;

Phaser.Physics.Ninja.AABB.COL_NONE = 0;
Phaser.Physics.Ninja.AABB.COL_AXIS = 1;
Phaser.Physics.Ninja.AABB.COL_OTHER = 2;

Phaser.Physics.Ninja.AABB.prototype = {

    /**
    * Updates this AABBs position.
    *
    * @method Phaser.Physics.Ninja.AABB#integrate
    */
    integrate: function () {

        var px = this.pos.x;
        var py = this.pos.y;

        //  integrate
        this.pos.x += (this.body.drag * this.pos.x) - (this.body.drag * this.oldpos.x);
        this.pos.y += (this.body.drag * this.pos.y) - (this.body.drag * this.oldpos.y) + (this.system.gravity * this.body.gravityScale);

        //  store
        this.velocity.set(this.pos.x - px, this.pos.y - py);
        this.oldpos.set(px, py);

    },

    /**
    * Process a world collision and apply the resulting forces.
    *
    * @method Phaser.Physics.Ninja.AABB#reportCollisionVsWorld
    * @param {number} px - The tangent velocity
    * @param {number} py - The tangent velocity
    * @param {number} dx - Collision normal
    * @param {number} dy - Collision normal
    * @param {number} obj - Object this AABB collided with
    */
    reportCollisionVsWorld: function (px, py, dx, dy, obj) {

        var p = this.pos;
        var o = this.oldpos;

        //  Calc velocity
        var vx = p.x - o.x;
        var vy = p.y - o.y;

        //  Find component of velocity parallel to collision normal
        var dp = (vx * dx + vy * dy);
        var nx = dp * dx;   //project velocity onto collision normal

        var ny = dp * dy;   //nx,ny is normal velocity

        var tx = vx - nx;   //px,py is tangent velocity
        var ty = vy - ny;

        //  We only want to apply collision response forces if the object is travelling into, and not out of, the collision
        var b, bx, by, fx, fy;

        if (dp < 0)
        {
            fx = tx * this.body.friction;
            fy = ty * this.body.friction;

            b = 1 + this.body.bounce;

            bx = (nx * b);
            by = (ny * b);

            if (dx === 1)
            {
                this.body.touching.left = true;
            }
            else if (dx === -1)
            {
                this.body.touching.right = true;
            }

            if (dy === 1)
            {
                this.body.touching.up = true;
            }
            else if (dy === -1)
            {
                this.body.touching.down = true;
            }
        }
        else
        {
            //  Moving out of collision, do not apply forces
            bx = by = fx = fy = 0;
        }

        //  Project object out of collision
        p.x += px;
        p.y += py;

        //  Apply bounce+friction impulses which alter velocity
        o.x += px + bx + fx;
        o.y += py + by + fy;

    },

    /**
    * Process a body collision and apply the resulting forces.
    *
    * @method Phaser.Physics.Ninja.AABB#reportCollisionVsBody
    * @param {number} px - The tangent velocity
    * @param {number} py - The tangent velocity
    * @param {number} dx - Collision normal
    * @param {number} dy - Collision normal
    * @param {number} obj - Object this AABB collided with
    */
    reportCollisionVsBody: function (px, py, dx, dy, obj) {

        var vx1 = this.pos.x - this.oldpos.x;   //  Calc velocity of this object
        var vy1 = this.pos.y - this.oldpos.y;
        var dp1 = (vx1 * dx + vy1 * dy);         //  Find component of velocity parallel to collision normal
        var nx1 = dp1 * dx;                      //  Project velocity onto collision normal
        var ny1 = dp1 * dy;                      //  nx, ny is normal velocity

        var dx2 = dx * -1;
        var dy2 = dy * -1;
        var vx2 = obj.pos.x - obj.oldpos.x;      //  Calc velocity of colliding object
        var vy2 = obj.pos.y - obj.oldpos.y;
        var dp2 = (vx2 * dx2 + vy2 * dy2);         //  Find component of velocity parallel to collision normal
        var nx2 = dp2 * dx2;                      //  Project velocity onto collision normal
        var ny2 = dp2 * dy2;                      //  nx, ny is normal velocity

        console.log(this.body.sprite.name, 'hit', obj.body.sprite.name, 'at', px, py, 'dx', dx, dy, 'dx2', dx2, dy2);
        console.log(this.body.sprite.name, 'x', (this.pos.x + this.xw), obj.body.sprite.name, 'x', (obj.pos.x - obj.xw));
        console.log('vx1', vx1, vy1, 'dp1', dp1, 'nx1', nx1, ny1);
        console.log('vx2', vx2, vy2, 'dp2', dp2, 'nx2', nx2, ny2);

        //  We only want to apply collision response forces if the object is travelling into, and not out of, the collision

        if (this.body.immovable && obj.body.immovable)
        {
            //  Split the separation then return, no forces applied as they come to a stand-still
            px *= 0.5;
            py *= 0.5;

            this.pos.add(px, py);
            this.oldpos.set(this.pos.x, this.pos.y);

            obj.pos.subtract(px, py);
            obj.oldpos.set(obj.pos.x, obj.pos.y);

            return;
        }
        else if (!this.body.immovable && !obj.body.immovable)
        {
            px *= 0.5;
            py *= 0.5;

            this.pos.add(px, py);
            this.oldpos.set(this.pos.x, this.pos.y);

            obj.pos.subtract(px, py);
            obj.oldpos.set(obj.pos.x, obj.pos.y);

            //  x velocity
            var nv1 = Math.sqrt((vx2 * vx2 * 1) / 1) * ((vx2 > 0) ? 1 : -1);
            var nv2 = Math.sqrt((vx1 * vx1 * 1) / 1) * ((vx1 > 0) ? 1 : -1);
            var avg = (nv1 + nv2) * 0.5;
            nv1 -= avg;
            nv2 -= avg;

            this.pos.x += avg + nv1 * this.body.bounce;
            obj.pos.x += avg + nv2 * obj.body.bounce;

            //  y velocity
            var nv1 = Math.sqrt((vy2 * vy2 * 1) / 1) * ((vy2 > 0) ? 1 : -1);
            var nv2 = Math.sqrt((vy1 * vy1 * 1) / 1) * ((vy1 > 0) ? 1 : -1);
            var avg = (nv1 + nv2) * 0.5;
            nv1 -= avg;
            nv2 -= avg;

            this.pos.y += avg + nv1 * this.body.bounce;
            obj.pos.y += avg + nv2 * obj.body.bounce;
        }
        else if (!this.body.immovable)
        {
            /*
            if (dp1 < 0)
            {
                this.pos.add(px, py);
                //  px + bounce + friction
                this.oldpos.x += px + (nx1 * (1 + this.body.bounce)) + ((vx2 - nx1) * this.body.friction);
                this.oldpos.y += py + (ny1 * (1 + this.body.bounce)) + ((vy2 - ny1) * this.body.friction);
            }
            else
            {
                //  Moving out of collision, do not apply forces
                this.pos.add(px, py);
                this.oldpos.add(px, py);
            }
            */
        }
        else if (!obj.body.immovable)
        {
            /*
            if (dp2 < 0)
            {
                obj.pos.add(px, py);
                //  px + bounce + friction
                obj.oldpos.x += px + (nx2 * (1 + obj.body.bounce)) + ((vx2 - nx2) * obj.body.friction);
                obj.oldpos.y += py + (ny2 * (1 + obj.body.bounce)) + ((vy2 - ny2) * obj.body.friction);
            }
            else
            {
                //  Moving out of collision, do not apply forces
                obj.pos.add(px, py);
                obj.oldpos.add(px, py);
            }
            */
        }



        /*
                if (!body1.immovable && !body2.immovable)
                {
                    this._overlap *= 0.5;

                    body1.x = body1.x - this._overlap;
                    body2.x += this._overlap;

                    this._newVelocity1 = Math.sqrt((this._velocity2 * this._velocity2 * body2.mass) / body1.mass) * ((this._velocity2 > 0) ? 1 : -1);
                    this._newVelocity2 = Math.sqrt((this._velocity1 * this._velocity1 * body1.mass) / body2.mass) * ((this._velocity1 > 0) ? 1 : -1);
                    this._average = (this._newVelocity1 + this._newVelocity2) * 0.5;
                    this._newVelocity1 -= this._average;
                    this._newVelocity2 -= this._average;

                    body1.velocity.x = this._average + this._newVelocity1 * body1.bounce.x;
                    body2.velocity.x = this._average + this._newVelocity2 * body2.bounce.x;
                }
                else if (!body1.immovable)
                {
                    body1.x = body1.x - this._overlap;
                    body1.velocity.x = this._velocity2 - this._velocity1 * body1.bounce.x;
                }
                else if (!body2.immovable)
                {
                    body2.x += this._overlap;
                    body2.velocity.x = this._velocity1 - this._velocity2 * body2.bounce.x;
                }

        */

    },

    /**
    * Collides this AABB against the world bounds.
    *
    * @method Phaser.Physics.Ninja.AABB#collideWorldBounds
    */
    collideWorldBounds: function () {

        var dx = this.system.bounds.x - (this.pos.x - this.xw);

        if (0 < dx)
        {
            this.reportCollisionVsWorld(dx, 0, 1, 0, null);
        }
        else
        {
            dx = (this.pos.x + this.xw) - this.system.bounds.width;

            if (0 < dx)
            {
                this.reportCollisionVsWorld(-dx, 0, -1, 0, null);
            }
        }

        var dy = this.system.bounds.y - (this.pos.y - this.yw);

        if (0 < dy)
        {
            this.reportCollisionVsWorld(0, dy, 0, 1, null);
        }
        else
        {
            dy = (this.pos.y + this.yw) - this.system.bounds.height;

            if (0 < dy)
            {
                this.reportCollisionVsWorld(0, -dy, 0, -1, null);
            }
        }

    },

    /**
    * Collides this AABB against a AABB.
    *
    * @method Phaser.Physics.Ninja.AABB#collideAABBVsAABB
    * @param {Phaser.Physics.Ninja.AABB} aabb - The AABB to collide against.
    */
    collideAABBVsAABB: function (aabb) {

        var pos = this.pos;
        var c = aabb;

        var tx = c.pos.x;
        var ty = c.pos.y;
        var txw = c.xw;
        var tyw = c.yw;

        var dx = pos.x - tx;//tile->obj delta
        var px = (txw + this.xw) - Math.abs(dx);//penetration depth in x

        if (0 < px)
        {
            var dy = pos.y - ty;//tile->obj delta
            var py = (tyw + this.yw) - Math.abs(dy);//pen depth in y

            if (0 < py)
            {
                //object may be colliding with tile; call tile-specific collision function

                //calculate projection vectors
                if (px < py)
                {
                    //project in x
                    if (dx < 0)
                    {
                        //project to the left
                        px *= -1;
                        py = 0;
                    }
                    else
                    {
                        //proj to right
                        py = 0;
                    }
                }
                else
                {
                    //project in y
                    if (dy < 0)
                    {
                        //project up
                        px = 0;
                        py *= -1;
                    }
                    else
                    {
                        //project down
                        px = 0;
                    }
                }

                // return this.aabbTileProjections[1](px, py, this, c);

                var l = Math.sqrt(px * px + py * py);
                // this.reportCollisionVsWorld(px, py, px / l, py / l, c);
                this.reportCollisionVsBody(px, py, px / l, py / l, c);

                return Phaser.Physics.Ninja.AABB.COL_AXIS;

            }
        }

        return false;

    },

    /**
    * Collides this AABB against a Tile.
    *
    * @method Phaser.Physics.Ninja.AABB#collideAABBVsTile
    * @param {Phaser.Physics.Ninja.Tile} tile - The Tile to collide against.
    */
    collideAABBVsTile: function (tile) {

        var pos = this.pos;
        var c = tile;

        var tx = c.pos.x;
        var ty = c.pos.y;
        var txw = c.xw;
        var tyw = c.yw;

        var dx = pos.x - tx;//tile->obj delta
        var px = (txw + this.xw) - Math.abs(dx);//penetration depth in x

        if (0 < px)
        {
            var dy = pos.y - ty;//tile->obj delta
            var py = (tyw + this.yw) - Math.abs(dy);//pen depth in y

            if (0 < py)
            {
                //object may be colliding with tile; call tile-specific collision function

                //calculate projection vectors
                if (px < py)
                {
                    //project in x
                    if (dx < 0)
                    {
                        //project to the left
                        px *= -1;
                        py = 0;
                    }
                    else
                    {
                        //proj to right
                        py = 0;
                    }
                }
                else
                {
                    //project in y
                    if (dy < 0)
                    {
                        //project up
                        px = 0;
                        py *= -1;
                    }
                    else
                    {
                        //project down
                        px = 0;
                    }
                }

                return this.resolveTile(px, py, this, c);
            }
        }

        return false;

    },

    /**
    * Resolves tile collision.
    *
    * @method Phaser.Physics.Ninja.AABB#resolveTile
    * @param {number} x - Penetration depth on the x axis.
    * @param {number} y - Penetration depth on the y axis.
    * @param {Phaser.Physics.Ninja.AABB} body - The AABB involved in the collision.
    * @param {Phaser.Physics.Ninja.Tile} tile - The Tile involved in the collision.
    * @return {boolean} True if the collision was processed, otherwise false.
    */
    resolveTile: function (x, y, body, tile) {

        if (0 < tile.id)
        {
            return this.aabbTileProjections[tile.type](x, y, body, tile);
        }
        else
        {
            // console.warn("Ninja.AABB.resolveTile was called with an empty (or unknown) tile!: id=" + tile.id + ")");
            return false;
        }

    },

    /**
    * Resolves Full tile collision.
    *
    * @method Phaser.Physics.Ninja.AABB#projAABB_Full
    * @param {number} x - Penetration depth on the x axis.
    * @param {number} y - Penetration depth on the y axis.
    * @param {Phaser.Physics.Ninja.AABB} obj - The AABB involved in the collision.
    * @param {Phaser.Physics.Ninja.Tile} t - The Tile involved in the collision.
    * @return {number} The result of the collision.
    */
    projAABB_Full: function (x, y, obj, t) {

        var l = Math.sqrt(x * x + y * y);
        obj.reportCollisionVsWorld(x, y, x / l, y / l, t);

        return Phaser.Physics.Ninja.AABB.COL_AXIS;

    },

    /**
    * Resolves Half tile collision.
    *
    * @method Phaser.Physics.Ninja.AABB#projAABB_Half
    * @param {number} x - Penetration depth on the x axis.
    * @param {number} y - Penetration depth on the y axis.
    * @param {Phaser.Physics.Ninja.AABB} obj - The AABB involved in the collision.
    * @param {Phaser.Physics.Ninja.Tile} t - The Tile involved in the collision.
    * @return {number} The result of the collision.
    */
    projAABB_Half: function (x, y, obj, t) {

        //signx or signy must be 0; the other must be -1 or 1
        //calculate the projection vector for the half-edge, and then 
        //(if collision is occuring) pick the minimum
        
        var sx = t.signx;
        var sy = t.signy;
            
        var ox = (obj.pos.x - (sx*obj.xw)) - t.pos.x;//this gives is the coordinates of the innermost
        var oy = (obj.pos.y - (sy*obj.yw)) - t.pos.y;//point on the AABB, relative to the tile center

        //we perform operations analogous to the 45deg tile, except we're using 
        //an axis-aligned slope instead of an angled one..

        //if the dotprod of (ox,oy) and (sx,sy) is negative, the corner is in the slope
        //and we need toproject it out by the magnitude of the projection of (ox,oy) onto (sx,sy)
        var dp = (ox*sx) + (oy*sy);

        if (dp < 0)
        {
            //collision; project delta onto slope and use this to displace the object
            sx *= -dp;//(sx,sy) is now the projection vector
            sy *= -dp;      
                
            var lenN = Math.sqrt(sx*sx + sy*sy);
            var lenP = Math.sqrt(x*x + y*y);
            
            if (lenP < lenN)
            {
                //project along axis; note that we're assuming that this tile is horizontal OR vertical
                //relative to the AABB's current tile, and not diagonal OR the current tile.
                obj.reportCollisionVsWorld(x,y,x/lenP, y/lenP, t);

                return Phaser.Physics.Ninja.AABB.COL_AXIS;
            }
            else
            {       
                //note that we could use -= instead of -dp
                obj.reportCollisionVsWorld(sx,sy,t.signx, t.signy, t);
                    
                return Phaser.Physics.Ninja.AABB.COL_OTHER;
            }
        }
            
        return Phaser.Physics.Ninja.AABB.COL_NONE;

    },

    /**
    * Resolves 45 Degree tile collision.
    *
    * @method Phaser.Physics.Ninja.AABB#projAABB_45Deg
    * @param {number} x - Penetration depth on the x axis.
    * @param {number} y - Penetration depth on the y axis.
    * @param {Phaser.Physics.Ninja.AABB} obj - The AABB involved in the collision.
    * @param {Phaser.Physics.Ninja.Tile} t - The Tile involved in the collision.
    * @return {number} The result of the collision.
    */
    projAABB_45Deg: function (x, y, obj, t) {

        var signx = t.signx;
        var signy = t.signy;

        var ox = (obj.pos.x - (signx*obj.xw)) - t.pos.x;//this gives is the coordinates of the innermost
        var oy = (obj.pos.y - (signy*obj.yw)) - t.pos.y;//point on the AABB, relative to the tile center

        var sx = t.sx;
        var sy = t.sy;
            
        //if the dotprod of (ox,oy) and (sx,sy) is negative, the corner is in the slope
        //and we need toproject it out by the magnitude of the projection of (ox,oy) onto (sx,sy)
        var dp = (ox*sx) + (oy*sy);

        if (dp < 0)
        {
            //collision; project delta onto slope and use this to displace the object
            sx *= -dp;//(sx,sy) is now the projection vector
            sy *= -dp;      
            
            var lenN = Math.sqrt(sx*sx + sy*sy);
            var lenP = Math.sqrt(x*x + y*y);

            if (lenP < lenN)
            {
                //project along axis
                obj.reportCollisionVsWorld(x,y,x/lenP, y/lenP, t);

                return Phaser.Physics.Ninja.AABB.COL_AXIS;
            }
            else
            {
                //project along slope
                obj.reportCollisionVsWorld(sx,sy,t.sx,t.sy);

                return Phaser.Physics.Ninja.AABB.COL_OTHER;
            }
        }
        
        return Phaser.Physics.Ninja.AABB.COL_NONE;
    },

    /**
    * Resolves 22 Degree tile collision.
    *
    * @method Phaser.Physics.Ninja.AABB#projAABB_22DegS
    * @param {number} x - Penetration depth on the x axis.
    * @param {number} y - Penetration depth on the y axis.
    * @param {Phaser.Physics.Ninja.AABB} obj - The AABB involved in the collision.
    * @param {Phaser.Physics.Ninja.Tile} t - The Tile involved in the collision.
    * @return {number} The result of the collision.
    */
    projAABB_22DegS: function (x, y, obj, t) {
        
        var signx = t.signx;
        var signy = t.signy;

        //first we need to check to make sure we're colliding with the slope at all
        var py = obj.pos.y - (signy*obj.yw);
        var penY = t.pos.y - py;//this is the vector from the innermost point on the box to the highest point on
                                //the tile; if it is positive, this means the box is above the tile and
                                //no collision is occuring
        if (0 < (penY*signy))
        {
            var ox = (obj.pos.x - (signx*obj.xw)) - (t.pos.x + (signx*t.xw));//this gives is the coordinates of the innermost
            var oy = (obj.pos.y - (signy*obj.yw)) - (t.pos.y - (signy*t.yw));//point on the AABB, relative to a point on the slope
                                                        
            var sx = t.sx;//get slope unit normal
            var sy = t.sy;
            
            //if the dotprod of (ox,oy) and (sx,sy) is negative, the corner is in the slope
            //and we need toproject it out by the magnitude of the projection of (ox,oy) onto (sx,sy)
            var dp = (ox*sx) + (oy*sy);

            if (dp < 0)
            {
                //collision; project delta onto slope and use this to displace the object
                sx *= -dp;//(sx,sy) is now the projection vector
                sy *= -dp;      

                var lenN = Math.sqrt(sx*sx + sy*sy);
                var lenP = Math.sqrt(x*x + y*y);
                
                var aY = Math.abs(penY);

                if (lenP < lenN)
                {
                    if (aY < lenP)
                    {
                        obj.reportCollisionVsWorld(0, penY, 0, penY/aY, t);
                        
                        return Phaser.Physics.Ninja.AABB.COL_OTHER;
                    }
                    else
                    {
                        obj.reportCollisionVsWorld(x,y,x/lenP, y/lenP, t);
                        
                        return Phaser.Physics.Ninja.AABB.COL_AXIS;
                    }
                }
                else
                {
                    if (aY < lenN)
                    {
                        obj.reportCollisionVsWorld(0, penY, 0, penY/aY, t);
                        
                        return Phaser.Physics.Ninja.AABB.COL_OTHER;
                    }
                    else
                    {
                        obj.reportCollisionVsWorld(sx,sy,t.sx,t.sy,t);

                        return Phaser.Physics.Ninja.AABB.COL_OTHER;
                    }
                }
            }
        }
        
        //if we've reached this point, no collision has occured
        return Phaser.Physics.Ninja.AABB.COL_NONE;
    },

    /**
    * Resolves 22 Degree tile collision.
    *
    * @method Phaser.Physics.Ninja.AABB#projAABB_22DegB
    * @param {number} x - Penetration depth on the x axis.
    * @param {number} y - Penetration depth on the y axis.
    * @param {Phaser.Physics.Ninja.AABB} obj - The AABB involved in the collision.
    * @param {Phaser.Physics.Ninja.Tile} t - The Tile involved in the collision.
    * @return {number} The result of the collision.
    */
    projAABB_22DegB: function (x, y, obj, t) {

        var signx = t.signx;
        var signy = t.signy;

        var ox = (obj.pos.x - (signx*obj.xw)) - (t.pos.x - (signx*t.xw));//this gives is the coordinates of the innermost
        var oy = (obj.pos.y - (signy*obj.yw)) - (t.pos.y + (signy*t.yw));//point on the AABB, relative to a point on the slope
            
        var sx = t.sx;//get slope unit normal
        var sy = t.sy;
            
        //if the dotprod of (ox,oy) and (sx,sy) is negative, the corner is in the slope
        //and we need toproject it out by the magnitude of the projection of (ox,oy) onto (sx,sy)
        var dp = (ox*sx) + (oy*sy);

        if (dp < 0)
        {
            //collision; project delta onto slope and use this to displace the object
            sx *= -dp;//(sx,sy) is now the projection vector
            sy *= -dp;      

            var lenN = Math.sqrt(sx*sx + sy*sy);
            var lenP = Math.sqrt(x*x + y*y);

            if (lenP < lenN)
            {
                obj.reportCollisionVsWorld(x,y,x/lenP, y/lenP, t);
                    
                return Phaser.Physics.Ninja.AABB.COL_AXIS;
            }
            else
            {       
                obj.reportCollisionVsWorld(sx,sy,t.sx,t.sy,t);
                                    
                return Phaser.Physics.Ninja.AABB.COL_OTHER;
            }
        
        }
            
        return Phaser.Physics.Ninja.AABB.COL_NONE;

    },

    /**
    * Resolves 67 Degree tile collision.
    *
    * @method Phaser.Physics.Ninja.AABB#projAABB_67DegS
    * @param {number} x - Penetration depth on the x axis.
    * @param {number} y - Penetration depth on the y axis.
    * @param {Phaser.Physics.Ninja.AABB} obj - The AABB involved in the collision.
    * @param {Phaser.Physics.Ninja.Tile} t - The Tile involved in the collision.
    * @return {number} The result of the collision.
    */
    projAABB_67DegS: function (x, y, obj, t) {

        var signx = t.signx;
        var signy = t.signy;

        var px = obj.pos.x - (signx*obj.xw);
        var penX = t.pos.x - px;

        if (0 < (penX*signx))
        {
            var ox = (obj.pos.x - (signx*obj.xw)) - (t.pos.x - (signx*t.xw));//this gives is the coordinates of the innermost
            var oy = (obj.pos.y - (signy*obj.yw)) - (t.pos.y + (signy*t.yw));//point on the AABB, relative to a point on the slope

            var sx = t.sx;//get slope unit normal
            var sy = t.sy;
            
            //if the dotprod of (ox,oy) and (sx,sy) is negative, the corner is in the slope
            //and we need to project it out by the magnitude of the projection of (ox,oy) onto (sx,sy)
            var dp = (ox*sx) + (oy*sy);

            if (dp < 0)
            {
                //collision; project delta onto slope and use this to displace the object
                sx *= -dp;//(sx,sy) is now the projection vector
                sy *= -dp;      

                var lenN = Math.sqrt(sx*sx + sy*sy);
                var lenP = Math.sqrt(x*x + y*y);

                var aX = Math.abs(penX);

                if (lenP < lenN)
                {
                    if (aX < lenP)
                    {
                        obj.reportCollisionVsWorld(penX, 0, penX/aX, 0, t);
                        
                        return Phaser.Physics.Ninja.AABB.COL_OTHER;
                    }
                    else
                    {
                        obj.reportCollisionVsWorld(x,y,x/lenP, y/lenP, t);
                        
                        return Phaser.Physics.Ninja.AABB.COL_AXIS;
                    }
                }
                else
                {
                    if (aX < lenN)
                    {
                        obj.reportCollisionVsWorld(penX, 0, penX/aX, 0, t);
                        
                        return Phaser.Physics.Ninja.AABB.COL_OTHER;
                    }
                    else
                    {               
                        obj.reportCollisionVsWorld(sx,sy,t.sx,t.sy,t);

                        return Phaser.Physics.Ninja.AABB.COL_OTHER;
                    }
                }
            }
        }
        
        //if we've reached this point, no collision has occured
        return Phaser.Physics.Ninja.AABB.COL_NONE;    

    },

    /**
    * Resolves 67 Degree tile collision.
    *
    * @method Phaser.Physics.Ninja.AABB#projAABB_67DegB
    * @param {number} x - Penetration depth on the x axis.
    * @param {number} y - Penetration depth on the y axis.
    * @param {Phaser.Physics.Ninja.AABB} obj - The AABB involved in the collision.
    * @param {Phaser.Physics.Ninja.Tile} t - The Tile involved in the collision.
    * @return {number} The result of the collision.
    */
    projAABB_67DegB: function (x, y, obj, t) {

        var signx = t.signx;
        var signy = t.signy;
            
        var ox = (obj.pos.x - (signx*obj.xw)) - (t.pos.x + (signx*t.xw));//this gives is the coordinates of the innermost
        var oy = (obj.pos.y - (signy*obj.yw)) - (t.pos.y - (signy*t.yw));//point on the AABB, relative to a point on the slope
                                                        
        var sx = t.sx;//get slope unit normal
        var sy = t.sy;
            
        //if the dotprod of (ox,oy) and (sx,sy) is negative, the corner is in the slope
        //and we need toproject it out by the magnitude of the projection of (ox,oy) onto (sx,sy)
        var dp = (ox*sx) + (oy*sy);

        if (dp < 0)
        {
            //collision; project delta onto slope and use this to displace the object
            sx *= -dp;//(sx,sy) is now the projection vector
            sy *= -dp;      
                
            var lenN = Math.sqrt(sx*sx + sy*sy);
            var lenP = Math.sqrt(x*x + y*y);
                
            if (lenP < lenN)
            {
                obj.reportCollisionVsWorld(x,y,x/lenP, y/lenP, t);

                return Phaser.Physics.Ninja.AABB.COL_AXIS;
            }
            else
            {       
                obj.reportCollisionVsWorld(sx,sy,t.sx,t.sy,t);
                    
                return Phaser.Physics.Ninja.AABB.COL_OTHER;
            }
        }
            
        return Phaser.Physics.Ninja.AABB.COL_NONE;    
    },

    /**
    * Resolves Convex tile collision.
    *
    * @method Phaser.Physics.Ninja.AABB#projAABB_Convex
    * @param {number} x - Penetration depth on the x axis.
    * @param {number} y - Penetration depth on the y axis.
    * @param {Phaser.Physics.Ninja.AABB} obj - The AABB involved in the collision.
    * @param {Phaser.Physics.Ninja.Tile} t - The Tile involved in the collision.
    * @return {number} The result of the collision.
    */
    projAABB_Convex: function (x, y, obj, t) {

        //if distance from "innermost" corner of AABB is less than than tile radius,
        //collision is occuring and we need to project

        var signx = t.signx;
        var signy = t.signy;

        var ox = (obj.pos.x - (signx * obj.xw)) - (t.pos.x - (signx * t.xw));//(ox,oy) is the vector from the circle center to
        var oy = (obj.pos.y - (signy * obj.yw)) - (t.pos.y - (signy * t.yw));//the AABB
        var len = Math.sqrt(ox * ox + oy * oy);

        var twid = t.xw * 2;
        var rad = Math.sqrt(twid * twid + 0);//this gives us the radius of a circle centered on the tile's corner and extending to the opposite edge of the tile;
        //note that this should be precomputed at compile-time since it's constant

        var pen = rad - len;

        if (((signx * ox) < 0) || ((signy * oy) < 0))
        {
            //the test corner is "outside" the 1/4 of the circle we're interested in
            var lenP = Math.sqrt(x * x + y * y);
            obj.reportCollisionVsWorld(x, y, x / lenP, y / lenP, t);

            return Phaser.Physics.Ninja.AABB.COL_AXIS;//we need to report 		
        }
        else if (0 < pen)
        {
            //project along corner->circle vector
            ox /= len;
            oy /= len;
            obj.reportCollisionVsWorld(ox * pen, oy * pen, ox, oy, t);

            return Phaser.Physics.Ninja.AABB.COL_OTHER;
        }

        return Phaser.Physics.Ninja.AABB.COL_NONE;

    },

    /**
    * Resolves Concave tile collision.
    *
    * @method Phaser.Physics.Ninja.AABB#projAABB_Concave
    * @param {number} x - Penetration depth on the x axis.
    * @param {number} y - Penetration depth on the y axis.
    * @param {Phaser.Physics.Ninja.AABB} obj - The AABB involved in the collision.
    * @param {Phaser.Physics.Ninja.Tile} t - The Tile involved in the collision.
    * @return {number} The result of the collision.
    */
    projAABB_Concave: function (x, y, obj, t) {

        //if distance from "innermost" corner of AABB is further than tile radius,
        //collision is occuring and we need to project

        var signx = t.signx;
        var signy = t.signy;

        var ox = (t.pos.x + (signx * t.xw)) - (obj.pos.x - (signx * obj.xw));//(ox,oy) is the vector form the innermost AABB corner to the
        var oy = (t.pos.y + (signy * t.yw)) - (obj.pos.y - (signy * obj.yw));//circle's center

        var twid = t.xw * 2;
        var rad = Math.sqrt(twid * twid + 0);//this gives us the radius of a circle centered on the tile's corner and extending to the opposite edge of the tile;
        //note that this should be precomputed at compile-time since it's constant

        var len = Math.sqrt(ox * ox + oy * oy);
        var pen = len - rad;

        if (0 < pen)
        {
            //collision; we need to either project along the axes, or project along corner->circlecenter vector

            var lenP = Math.sqrt(x * x + y * y);

            if (lenP < pen)
            {
                //it's shorter to move along axis directions
                obj.reportCollisionVsWorld(x, y, x / lenP, y / lenP, t);

                return Phaser.Physics.Ninja.AABB.COL_AXIS;
            }
            else
            {
                //project along corner->circle vector
                ox /= len;//len should never be 0, since if it IS 0, rad should be > than len
                oy /= len;//and we should never reach here

                obj.reportCollisionVsWorld(ox * pen, oy * pen, ox, oy, t);

                return Phaser.Physics.Ninja.AABB.COL_OTHER;
            }

        }

        return Phaser.Physics.Ninja.AABB.COL_NONE;
		
    }

}
