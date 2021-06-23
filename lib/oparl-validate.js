/*
 * oparl-validate.js, a JavaScript library for the OParl protocoll validation.
 * 2021, Sven Schoradt
 */

/*jslint browser: true, esversion: 6 */
/*global module,define,require*/

const OParl = require("./oparl-src");

(function (window, document) {
	'use strict';

    if (!OParl) {
        console.error("Oparl parser not found.");

        return;
    }

    OParl.Validator = {
        result: [],

        version: '1.0',

        reset: function() {
            OParl.Validator.result = [];

            OParl.Validator.version = '1.0';
        },

        validateType: function(o, type) {
            if (!o.hasOwnProperty('type')) {
                if (o.type !== 'https://schema.oparl.org/' + this.version + '/' + type) {
                    OParl.Validator.result.push("ERROR: " + type + " type is set but has wrong value - must be " + 'https://schema.oparl.org/' + this.version + '/' + type + " is '" + o.type + "'");

                    return false;
                }
            }

            return true;
        },

        validateRequired: function(o, type, name) {
            if (!o.hasOwnProperty(name)) {
                OParl.Validator.result.push("ERROR: "+type+" needs " + name);

                return false;
            }

            return true;
        },

        validateUrl: function (o, type, name, req) {
            let url;
            
            if (!o.hasOwnProperty(name)) {
                if (req) {
                    thOParl.Validatoris.result.push("ERROR: " + type + " property '" + name + "' is required");
                }

                return !req;
            }

            var string = o[name];

            if (string instanceof Object) {
                string = string.data; 
            }

            try {
                url = new URL(string);
            } catch (_) {
                OParl.Validator.result.push("ERROR: " + type + " property '" + name + "' must be an URL");

                return false;  
            }
          
            if (!(url.protocol === "http:" || url.protocol === "https:")) {
                OParl.Validator.result.push("WARNING: " + type + " property '" + name + "' - wrong URL scheme");

                return false;
            }

            return true;
        },

        validateDate: function (o, type, name, req) {
            let url;
            
            if (!o.hasOwnProperty(name)) {
                if (req) {
                    OParl.Validator.result.push("ERROR: " + type + " property '" + name + "' is required");
                }

                return !req;
            }

            var string = o[name];

            var dateFormat = /^\d{4}-\d{2}-\d{2}$/;

            if (dateFormat.test(string)) {
                OParl.Validator.result.push("ERROR: " + type + " property '" + name + "' must be in format yyyy-mm-dd");

                return false;
            }

            return true;
        },

        validateDateTime: function (o, type, name, req) {
            let url;
            
            if (!o.hasOwnProperty(name)) {
                if (req) {
                    OParl.Validator.result.push("ERROR: " + type + " property '" + name + "' is required");
                }

                return !req;
            }

            var date = o[name];

            return ( Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date.getTime()) );
        },

        validateSystem: function(o) {
            var that = this;

            var p = new Promise(function(resolve, reject) { 
                OParl.Validator.result.push("Validate system object ...");

                if (o.hasOwnProperty('oparlVersion')) {
                    var versionUri = o.oparlVersion;

                    if (versionUri === 'https://schema.oparl.org/1.0/') {
                        OParl.Validator.version = '1.0';
                    } else if (versionUri === 'https://schema.oparl.org/1.1/') {
                        OParl.Validator.version = '1.1';
                    } else {
                        OParl.Validator.result.push("ERROR: System needs oparlVersion");
                    }
                }

                if (!o.hasOwnProperty('body')) {
                    that.result.push("ERROR: System needs body");
                }

                that.validateType(o, 'System');

                that.validateUrl(o, 'System', 'id');
                that.validateUrl(o, 'System', 'license');
                that.validateUrl(o, 'System', 'body');
                that.validateUrl(o, 'System', 'website');
                that.validateUrl(o, 'System', 'vendor');
                that.validateUrl(o, 'System', 'product');
                that.validateUrl(o, 'System', 'web');

                that.validateDateTime(o, 'System', 'created', (that.version == '1.1'));
                that.validateDateTime(o, 'System', 'modified', (that.version == '1.1'));

                that.validateBodyList(o.body).then(resolve).catch(reject);
            });

            return p;
        },

        validateBodyList: function (o) {
            var that = this;

            return new Promise(function(resolve, reject) {
                console.log("get body list");

                o.get()
                    .then(bodyList => {
                        console.log("get body list", bodyList);

                        if (!bodyList) {
                            OParl.Validator.result.push("ERROR: No data requested for body");
                        }

                        if (!(bodyList instanceof Array)) {
                            OParl.Validator.result.push("ERROR: No data requested for body");
                        }

                        var l = [];

                        bodyList.forEach(element => {
                            l.push(that.validateBody(element));
                        });

                        Promise.all(l).then(data => {
                            resolve(true);
                        });
                    }).catch(err => {
                        reject(err);
                    });
            });
        },

        validateBody: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                console.log("Validate body object ...");

                o.get().then(o => {
                    console.log(o);

                    OParl.Validator.result.push("Validate body object " + o.id + " ...");

                    that.validateType(o, 'Body');

                    that.validateUrl(o, 'Body', 'id');

                    that.validateRequired(o, 'Body', 'name');

                    that.validateUrl(o, 'Body', 'website');
                    that.validateUrl(o, 'Body', 'license');
                    that.validateUrl(o, 'Body', 'organisation');
                    that.validateUrl(o, 'Body', 'person');
                    that.validateUrl(o, 'Body', 'meeting');
                    that.validateUrl(o, 'Body', 'paper');
                    that.validateUrl(o, 'Body', 'web');
                    
                    that.validateDateTime(o, 'Body', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'Body', 'modified', (that.version == '1.1'));

                    resolve(true);
                });
            });
        }

    };

    // define OParl for Node module pattern loaders, including Browserify
	if (OParl.usingNodeJS) {
		module.exports = OParl.Validator;

	// define OParl as an AMD module
	} else if (typeof define === 'function' && define.amd) {
		define(OParl.Validator);
	}

}(typeof window !== 'undefined' ? window : {}, typeof document !== 'undefined' ? document : {}));