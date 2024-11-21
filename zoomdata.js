/*** zoomdata.js *** v1.0 *** auer404 ***/

function create_zoomdata(target_element, options = {}) {

    let zd = {
        owner: target_element,
        zoomfactor: 1, max_zoomfactor: options.max_zoomfactor || 2,
        prev_zoomfactor: 1,
        x: 0, y: 0,
        height: 0, width: 0,
        mouse_x: 0, mouse_y: 0,
        zoom_origin_x: 0, zoom_origin_y: 0,
        relative_zoom_origin_x: 0, relative_zoom_origin_y: 0,
        dezoom_origin_x: 0, dezoom_origin_y: 0,
        relative_dezoom_origin_x: 0, relative_dezoom_origin_y: 0,
        zoom_timeout: false,
        mouse_down: false, drag_key_down: false,
        dragstart_mouse_x: 0, dragstart_mouse_y: 0,
        dragstart_x: 0, dragstart_y: 0,
        objects: [], objects_to_update: [],
        options: options,

        setup: function () {
            this.height = this.owner.offsetHeight * this.zoomfactor;
            this.width = this.owner.offsetWidth * this.zoomfactor;

            if (this.options.mouse_based_zoom_origin == false || (this.options.zoom_on_mousewheel == false && this.options.mouse_based_zoom_origin != true)) {
                this.zoom_origin_x = Math.round(this.owner.offsetWidth / 2);
                this.zoom_origin_y = Math.round(this.owner.offsetHeight / 2);
            } else {
                this.zoom_origin_x = this.mouse_x;
                this.zoom_origin_y = this.mouse_y;
            }

            this.relative_zoom_origin_x = this.zoom_origin_x / this.owner.offsetWidth;
            this.relative_zoom_origin_y = this.zoom_origin_y / this.owner.offsetHeight;

            this.owner.addEventListener("mousemove", this.update_mouse_xy.bind(this));

            if (this.options.zoom_on_mousewheel != false) {
                this.owner.addEventListener("mousewheel", function (e) {

                    if (this.zoomdata.mouse_x <= this.zoomdata.x || this.zoomdata.mouse_y <= this.zoomdata.y) {
                        return;
                    }

                    zd.update_mouse_xy.bind(zd)(e);
                    zd.zoom(zd.zoomfactor + e.deltaY * -0.05);
                }, { passive: true });
            }

            this.owner.addEventListener("mousedown", function () {
                zd.mouse_down = true;
                if (zd.options.allow_drag != false && (zd.drag_key_down || !zd.options.drag_key)) {
                    zd.refresh_drag_coords();
                    zd.auto_cursor("grabbing", "drag");
                }
            });

            window.addEventListener("mouseup", function () {
                zd.mouse_down = false;
                if (zd.drag_key_down) {
                    zd.auto_cursor("grab", "drag");
                } else {
                    zd.auto_cursor("", "drag");
                }
            }
            );

            this.owner.addEventListener("contextmenu", function () {
                zd.mouse_down = false;
            });

            if (this.options.drag_key !== false && this.options.allow_drag != false) {

                window.addEventListener("keydown", function (e) {
                    if (e.code == zd.options.drag_key || e.key == zd.options.drag_key) {
                        zd.drag_key_down = true;
                        if (!zd.mouse_down) {
                            zd.auto_cursor("grab", "drag");
                        } else {
                            zd.auto_cursor("grabbing", "drag");
                            zd.refresh_drag_coords();
                        }
                    }
                });

                window.addEventListener("keyup", function (e) {
                    if (e.code == zd.options.drag_key || e.key == zd.options.drag_key) {
                        zd.drag_key_down = false;
                        zd.auto_cursor("", "drag");
                    }
                });

            }

            if (this.options.allow_drag != false) {

                this.owner.addEventListener("mousemove", function () {
                    if (zd.mouse_down && (zd.drag_key_down || !zd.options.drag_key)) {

                        let distance_x = zd.mouse_x - zd.dragstart_mouse_x;
                        let distance_y = zd.mouse_y - zd.dragstart_mouse_y;

                        let new_x = zd.dragstart_x + distance_x;
                        let new_y = zd.dragstart_y + distance_y;

                        zd.move_to(new_x, new_y, zd.refresh_drag_coords);

                    }
                });

            }

        },

        set_zoom_origin: function (x = false, y = false) {
            if (x) {
                this.zoom_origin_x = x;
            }
            if (y) {
                this.zoom_origin_y = y;
            }
            if (x || y) {
                this.update_relative_zoom_origin_xy();
            }
        },

        update_mouse_xy: function (e) {
            this.mouse_x = e.clientX - this.owner.offsetLeft;
            this.mouse_y = e.clientY - this.owner.offsetTop;

            if (this.mouse_x < this.x) {
                this.mouse_x = this.x;
            }
            if (this.mouse_y < this.y) {
                this.mouse_y = this.y;
            }
            if (this.mouse_x > this.x + this.width) {
                this.mouse_x = this.x + this.width;
            }
            if (this.mouse_y > this.y + this.height) {
                this.mouse_y = this.y + this.height
            }

            if (this.options.mouse_based_zoom_origin != false && this.options.zoom_on_mousewheel != false) {
                this.set_zoom_origin(this.mouse_x, this.mouse_y);
            }

        },

        update_relative_zoom_origin_xy: function () {
            this.relative_zoom_origin_x = (this.zoom_origin_x - this.x) / this.width;
            this.relative_zoom_origin_y = (this.zoom_origin_y - this.y) / this.height;
        },

        update_dezoom_origin_xy: function () {
            this.dezoom_origin_x = (- this.x * this.owner.offsetWidth) / (this.width - this.owner.offsetWidth);
            this.dezoom_origin_y = (- this.y * this.owner.offsetHeight) / (this.height - this.owner.offsetHeight);
            this.relative_dezoom_origin_x = (this.dezoom_origin_x - this.x) / this.width;
            this.relative_dezoom_origin_y = (this.dezoom_origin_y - this.y) / this.height;
        },

        update_zoomfactor: function (value) {
            return this.set_zoomfactor(this.zoomfactor + value);
        },

        set_zoomfactor: function (value) {
            if (value <= 1) {
                if (this.zoomfactor == 1) {
                    return false;
                }
                value = 1;
            } else if (value >= this.max_zoomfactor) {
                if (this.zoomfactor == this.max_zoomfactor) {
                    return false;
                }
                value = this.max_zoomfactor;
            }
            this.prev_zoomfactor = this.zoomfactor;
            this.zoomfactor = value;
            this.zoomfactor = Math.min(Math.max(1, this.zoomfactor), this.max_zoomfactor);
            return true;
        },

        update_zoom_values: function () {

            this.width = this.owner.offsetWidth * this.zoomfactor;
            this.height = this.owner.offsetHeight * this.zoomfactor;

            let origin_x, origin_y, rel_origin_x, rel_origin_y;

            if (this.zoomfactor > this.prev_zoomfactor) {

                origin_x = this.zoom_origin_x;
                origin_y = this.zoom_origin_y;
                rel_origin_x = this.relative_zoom_origin_x;
                rel_origin_y = this.relative_zoom_origin_y;

            } else {

                origin_x = this.dezoom_origin_x;
                origin_y = this.dezoom_origin_y;
                rel_origin_x = this.relative_dezoom_origin_x;
                rel_origin_y = this.relative_dezoom_origin_y;

            }


            let zoomed_offset_x_from_origin = rel_origin_x * this.width;
            let zoomed_offset_y_from_origin = rel_origin_y * this.height;

            this.x = 0 - (zoomed_offset_x_from_origin - origin_x);
            this.y = 0 - (zoomed_offset_y_from_origin - origin_y);

            if (this.zoomfactor < this.prev_zoomfactor && (this.x > 0 || this.zoomfactor == 1)) {
                this.x = 0;
            }

            if (this.zoomfactor < this.prev_zoomfactor && (this.y > 0 || this.zoomfactor == 1)) {
                this.y = 0;
            }

            this.update_relative_zoom_origin_xy();
            this.update_dezoom_origin_xy();

        },

        zoom: function (new_zoomfactor) {
            
            let prev_zoomfactor = this.zoomfactor;

            if (this.set_zoomfactor(new_zoomfactor)) {
                clearTimeout(this.zoom_timeout);
                if (new_zoomfactor > prev_zoomfactor) {
                    this.auto_cursor("zoom-in", "zoom");
                } else {
                    this.auto_cursor("zoom-out", "zoom");
                }
                this.zoom_timeout = setTimeout(function () {
                    zd.auto_cursor("", "zoom");
                }, 250);
                this.update_zoom_values();

                this.update_objects();
                this.onupdate();
            }
        },

        move_to: function (new_x = false, new_y = false, overflow_callback = function () { }) {

            let previous_x = this.x;
            let previous_y = this.y;

            if (new_x) {

                if (new_x > 0) {
                    this.x = 0;
                    overflow_callback();
                } else if (new_x < 0 - (this.width - this.width / this.zoomfactor)) {
                    this.x = 0 - (this.width - this.width / this.zoomfactor);
                    overflow_callback();
                } else {
                    this.x = new_x;
                }

            }

            if (new_y) {

                if (new_y > 0) {
                    this.y = 0;
                    overflow_callback();
                } else if (new_y < 0 - (this.height - this.height / this.zoomfactor)) {
                    this.y = 0 - (this.height - this.height / this.zoomfactor);
                    overflow_callback();
                } else {
                    this.y = new_y;
                }

            }

            this.update_relative_zoom_origin_xy();
            this.update_dezoom_origin_xy();

            if (this.x != previous_x || this.y != previous_y) {
                this.update_objects();
                this.onupdate();
            }

        },

        move_by: function (dist_x, dist_y, overflow_callback = function () { }) {

            let new_x = this.x + dist_x;
            let new_y = this.y + dist_y;
            this.move_to(new_x, new_y, overflow_callback);

        },

        refresh_drag_coords: function () {
            this.dragstart_mouse_x = this.mouse_x;
            this.dragstart_mouse_y = this.mouse_y;
            this.dragstart_x = this.x;
            this.dragstart_y = this.y;

        },

        auto_cursor: function (cursor_name, context) {

            if (this.options["auto_" + context + "_cursor"] === true) {
                this.owner.style.cursor = cursor_name;
            }

        },

        register_object: function (param_obj) {
            let obj = {}

            if (param_obj.use_parent_coords === true) {

                obj.base_x = 0;
                obj.base_y = 0;
                obj.base_width = zd.width;
                obj.base_height = zd.height;

                obj.update_zoom_values = function () {

                    this.x = zd.x;
                    this.y = zd.y;
                    this.width = zd.width;
                    this.height = zd.height;

                }

                obj.update_zoom_values();

            } else {

                obj.base_x = param_obj.x || 0;
                obj.base_y = param_obj.y || 0;
                obj.base_width = param_obj.width || 0;
                obj.base_height = param_obj.height || 0;

                obj.x = param_obj.x || 0;
                obj.y = param_obj.y || 0;
                obj.width = param_obj.width || 0;
                obj.height = param_obj.height || 0;

                obj.update_zoom_values = function () {
                    this.width = Math.round(this.base_width * zd.zoomfactor);
                    this.height = Math.round(this.base_height * zd.zoomfactor);
                    this.x = Math.round(this.base_x * zd.zoomfactor + zd.x);
                    this.y = Math.round(this.base_y * zd.zoomfactor + zd.y);
                }

            }

            if (param_obj.attach_to) {
                param_obj.attach_to.zoomdata = obj;
                obj.owner = param_obj.attach_to;
            } else {
                obj.owner = null;
            }

            obj.parent = zd;

            zd.objects.push(obj);
            if (param_obj.auto_update != false) {
                zd.objects_to_update.push(obj);
            }

            return obj;
        },

        update_objects: function () {
            if (this.options.auto_update_objects == false) { return }
            for (o of this.objects_to_update) {
                o.update_zoom_values();
            }
        },

        onupdate: function () {}

    }

    zd.setup();
    zd.owner.zoomdata = zd;
    return zd;

}