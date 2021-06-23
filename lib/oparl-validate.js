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
            if (o.hasOwnProperty('type')) {
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
            
            if (req && !this.validateRequired(o,type, name)) {
                reject("ERROR: " + type + " property '" + name + "' is required");

                return;
            }

            if (!o.hasOwnProperty(name)) {
                return;
            }

            var string = o[name];

            if (string instanceof Object) {
                string = string.data; 
            }

            try {
                url = new URL(string);
            } catch (_) {
                OParl.Validator.result.push("ERROR: " + type + " property '" + name + "' must be an URL (not "+string+")");

                return false;  
            }
          
            if (!(url.protocol === "http:" || url.protocol === "https:")) {
                OParl.Validator.result.push("WARNING: " + type + " property '" + name + "' - wrong URL scheme (see "+string+")");

                return false;
            }

            return true;
        },

        validateDate: function (o, type, name, req) {
            let url;
            
            if (req && !this.validateRequired(o,type, name)) {
                reject("ERROR: " + type + " property '" + name + "' is required");

                return;
            }

            if (!o.hasOwnProperty(name)) {
                return;
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
            
            if (req && !this.validateRequired(o,type, name)) {
                reject("ERROR: " + type + " property '" + name + "' is required");

                return;
            }

            if (!o.hasOwnProperty(name)) {
                return;
            }

            var date = o[name];

            if (!(Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date.getTime()))) {
                OParl.Validator.result.push("ERROR: " + type + " property '" + name + "' must be in format yyyy-mm-ddThh:mm:ss (not "+date+")");

                return false;
            }

            return true;
        },

        validateArray: function(o, type, name, req, test) {
            let res = true;

            if (req && !this.validateRequired(o,type, name)) {
                reject("ERROR: " + type + " property '" + name + "' is required");

                return;
            }

            let arr = o[name];

            var l = [];

            arr.forEach(element => {
                var testObject = {};
                testObject[name] = element;

                res = res && that[test](testObject, type, name, false);
            });

            return res;
        },

        validateObjectList: function (orig, type, name, req, subtype) {
            var that = this;

            return new Promise(function(resolve, reject) {
                if (req && !that.validateRequired(orig, type, name)) {
                    reject("ERROR: " + type + " property '" + name + "' is required");

                    return;
                }

                var o = orig[name];

                if (!o) {
                    resolve(true);

                    return;
                }

                o.get()
                    .then(objectList => {
                        // console.log("get body list", bodyList);

                        if (!objectList) {
                            OParl.Validator.result.push("ERROR: No data requested for body");

                            resolve(false);

                            return;
                        }

                        if (!(objectList instanceof Array)) {
                            OParl.Validator.result.push("ERROR: No data requested for body");

                            resolve(false);

                            return;
                        }

                        OParl.Validator.result.push("Validate object list (" + objectList.length + " elements) ...");
                        
                        var l = [];

                        var test = 'validate' + subtype;

                        objectList.forEach(element => {
                            l.push(that[test](element));
                        });

                        Promise.all(l).then(data => {
                            resolve(true);
                        }).catch(reject);
                    }).catch(err => {
                        reject(err);
                    });
            });
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
                that.validateUrl(o, 'System', 'body', true);
                that.validateUrl(o, 'System', 'website');
                that.validateUrl(o, 'System', 'vendor');
                that.validateUrl(o, 'System', 'product');
                that.validateUrl(o, 'System', 'web');

                that.validateDateTime(o, 'System', 'created', (that.version == '1.1'));
                that.validateDateTime(o, 'System', 'modified', (that.version == '1.1'));

                // that.validateBodyList(o.body).then(resolve).catch(reject);
                that.validateObjectList(o, 'System', 'body', true, 'Body').then(resolve).catch(reject);
            });

            return p;
        },

        validateBody: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                o.get().then(o => {
                    // console.log(o);

                    OParl.Validator.result.push("Validate body object " + o.id + " ...");

                    that.validateType(o, 'Body');

                    that.validateUrl(o, 'Body', 'id');

                    that.validateRequired(o, 'Body', 'name');

                    that.validateUrl(o, 'Body', 'website');
                    that.validateUrl(o, 'Body', 'license');
                    that.validateDateTime(o, 'Body', 'licenseValidSince', false);
                    that.validateDateTime(o, 'Body', 'oparlSince', false);
                    that.validateArray(o, 'Body', 'equivalent', false, 'validateUrl');
                    that.validateUrl(o, 'Body', 'organization', true);
                    that.validateUrl(o, 'Body', 'person', true);
                    that.validateUrl(o, 'Body', 'meeting', true);
                    that.validateUrl(o, 'Body', 'paper', true);
                    
                    that.validateDateTime(o, 'Body', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'Body', 'modified', (that.version == '1.1'));

                    that.validateUrl(o, 'Body', 'web', false);

                    var l = [];

                    l.push(that.validateObjectList(o, 'Body', 'legislativeTerm', true, 'LegislativeTerm'));

                    if (o.location) {
                        l.push(that.validateLocation(o.location));
                    }

                    l.push(that.validateObjectList(o, 'Body', 'organization', true, 'Organization'));
                    l.push(that.validateObjectList(o, 'Body', 'person', true, 'Person'));
                    l.push(that.validateObjectList(o, 'Body', 'meeting', true, 'Meeting'));
                    l.push(that.validateObjectList(o, 'Body', 'paper', true, 'Paper'));

                    Promise.all(l).then(data => {
                        resolve(true);
                    }).catch(reject);
                });
            });
        },

        validateLegislativeTerm: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                o.get().then(o => {
                    // console.log(o);

                    OParl.Validator.result.push("Validate legislative term object " + o.id + " ...");

                    that.validateType(o, 'LegislativeTerm');

                    that.validateUrl(o, 'LegislativeTerm', 'id');

                    that.validateRequired(o, 'LegislativeTerm', 'name');

                    that.validateDate(o, 'LegislativeTerm', 'starDate', false);
                    that.validateDate(o, 'LegislativeTerm', 'endDate', false);

                    that.validateUrl(o, 'LegislativeTerm', 'body', false);
                    
                    that.validateDateTime(o, 'LegislativeTerm', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'LegislativeTerm', 'modified', (that.version == '1.1'));

                    that.validateUrl(o, 'LegislativeTerm', 'web', false);

                    resolve(true);
                });
            });
        },

        validateLocation: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                o.get().then(o => {
                    console.log(o);

                    OParl.Validator.result.push("Validate location object " + o.id + " ...");

                    that.validateType(o, 'Location');

                    that.validateUrl(o, 'Location', 'id');
                    
                    that.validateDateTime(o, 'Location', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'Location', 'modified', (that.version == '1.1'));

                    that.validateUrl(o, 'Location', 'web', false);

                    that.validateArray(o, 'Location', 'bodies', false, 'validateUrl');
                    that.validateArray(o, 'Location', 'organization', false, 'validateUrl');
                    that.validateArray(o, 'Location', 'meeting', false, 'validateUrl');
                    that.validateArray(o, 'Location', 'papers', false, 'validateUrl');

                    resolve(true);
                });
            });
        },

        validateOrganization: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                o.get().then(o => {
                    // console.log(o);

                    OParl.Validator.result.push("Validate organization object " + o.id + " ...");

                    that.validateType(o, 'Organization');

                    that.validateUrl(o, 'Organization', 'id', true);
                    that.validateUrl(o, 'Organization', 'body', false);
                    that.validateUrl(o, 'Organization', 'membership', false);
                    that.validateUrl(o, 'Organization', 'meeting', false);
                    that.validateUrl(o, 'Organization', 'subOrganizationOf', false);
                    
                    that.validateDate(o, 'Organization', 'starDate', false);
                    that.validateDate(o, 'Organization', 'endDate', false);

                    that.validateDateTime(o, 'Organization', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'Organization', 'modified', (that.version == '1.1'));

                    var l = [];

                    if (o.location) l.push(that.validateLocation(o.location));

                    l.push(that.validateObjectList(o, 'Organization', 'meeting', false, 'Meeting'));
                    l.push(that.validateObjectList(o, 'Organization', 'membership', false, 'Membership'));
                    
                    Promise.all(l).then(data => {
                        resolve(true);
                    }).catch(reject);

                    resolve(true);
                });
            });
        },

        validatePerson: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                o.get().then(o => {
                    // console.log(o);

                    OParl.Validator.result.push("Validate Person object " + o.id + " ...");

                    that.validateType(o, 'Person');

                    that.validateUrl(o, 'Person', 'id');
                    
                    that.validateDateTime(o, 'Person', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'Person', 'modified', (that.version == '1.1'));

                    var l = [];

                    if (o.location) l.push(that.validateLocation(o.location));

                    l.push(that.validateObjectList(o, 'Person', 'membership', false, 'Membership'));
                    
                    Promise.all(l).then(data => {
                        resolve(true);
                    }).catch(reject);
                });
            });
        },

        validateMeeting: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                o.get().then(o => {
                    // console.log(o);

                    OParl.Validator.result.push("Validate Meeting object " + o.id + " ...");

                    that.validateType(o, 'Meeting');

                    that.validateUrl(o, 'Meeting', 'id');
                    
                    that.validateRequired(o, 'Meeting', 'name');

                    that.validateDateTime(o, 'Meeting', 'start', false);
                    that.validateDateTime(o, 'Meeting', 'end', false);

                    that.validateDateTime(o, 'Membership', 'start', false);
                    that.validateDateTime(o, 'Membership', 'end', false);

                    that.validateDateTime(o, 'Meeting', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'Meeting', 'modified', (that.version == '1.1'));

                    var l = [];

                    if (o.location) l.push(that.validateLocation(o.location));
                    if (o.invitation) l.push(that.validateFile(o.invitation));

                    if (o.resultsProtocol) l.push(that.validateFile(o.resultsProtocol));
                    if (o.verbatimProtocol) l.push(that.validateFile(o.verbatimProtocol));

                    l.push(that.validateObjectList(o, 'Meeting', 'auxiliaryFile', false, 'File'));

                    l.push(that.validateObjectList(o, 'Meeting', 'organization', false, 'Organization'));
                    l.push(that.validateObjectList(o, 'Meeting', 'participant', false, 'Person'));

                    l.push(that.validateObjectList(o, 'Meeting', 'agendaItem', false, 'AgendaItem'));
                    
                    Promise.all(l).then(data => {
                        resolve(true);
                    }).catch(reject);
                });
            });
        },

        validatePaper: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                o.get().then(o => {
                    // console.log(o);

                    OParl.Validator.result.push("Validate Paper object " + o.id + " ...");

                    that.validateType(o, 'Paper');

                    that.validateUrl(o, 'Paper', 'id');

                    that.validateRequired(o, 'Paper', 'name');
                    that.validateDate(o, 'Paper', 'date');
                    
                    that.validateDateTime(o, 'Paper', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'Paper', 'modified', (that.version == '1.1'));

                    var l = [];

                    if (o.location) l.push(that.validateLocation(o.location));
                    if (o.mainFile) l.push(that.validateFile(o.mainFile));
                    
                    l.push(that.validateObjectList(o, 'Paper', 'auxiliaryFile', false, 'File'));

                    l.push(that.validateObjectList(o, 'Paper', 'relatedPaper', false, 'Paper'));
                    l.push(that.validateObjectList(o, 'Paper', 'superordinatedPaper', false, 'Paper'));
                    l.push(that.validateObjectList(o, 'Paper', 'subordinatedPaper', false, 'Paper'));

                    l.push(that.validateObjectList(o, 'Paper', 'originatorPerson', false, 'Person'));
                    l.push(that.validateObjectList(o, 'Paper', 'underDirectionOf', false, 'Organization'));
                    l.push(that.validateObjectList(o, 'Paper', 'originatorOrganization', false, 'Organization'));

                    l.push(that.validateObjectList(o, 'Paper', 'consultation', false, 'Consultation'));
                    
                    Promise.all(l).then(data => {
                        resolve(true);
                    }).catch(reject);
                });
            });
        },

        validateMembership: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                o.get().then(o => {
                    // console.log(o);

                    OParl.Validator.result.push("Validate Membership object " + o.id + " ...");

                    that.validateType(o, 'Membership');

                    that.validateUrl(o, 'Membership', 'id');

                    that.validateUrl(o, 'Membership', 'person', true);
                    that.validateUrl(o, 'Membership', 'organisation', true);
                    that.validateUrl(o, 'Membership', 'onBehalfOf', false);
                    
                    that.validateDateTime(o, 'Membership', 'startDate', false);
                    that.validateDateTime(o, 'Membership', 'endDate', false);

                    that.validateUrl(o, 'Membership', 'web', false);

                    that.validateDateTime(o, 'Membership', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'Membership', 'modified', (that.version == '1.1'));

                    var l = [];

                    if (o.person) l.push(that.validatePerson(o.person));
                    if (o.organization) l.push(that.validateOrganization(o.organization));
                    if (o.onBehalfOf) l.push(that.validateOrganization(o.onBehalfOf));

                    Promise.all(l).then(data => {
                        resolve(true);
                    }).catch(reject);
                });
            });
        },

        validateFile: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                o.get().then(o => {
                    // console.log(o);

                    OParl.Validator.result.push("Validate File object " + o.id + " ...");

                    that.validateType(o, 'File');

                    that.validateUrl(o, 'File', 'id');

                    that.validateRequired(o, 'File', 'name');
                    that.validateRequired(o, 'File', 'fileName');
                    that.validateRequired(o, 'File', 'mimeType');

                    that.validateDate(o, 'File', 'date');

                    that.validateUrl(o, 'File', 'accessUrl', true);
                    that.validateUrl(o, 'File', 'downloadUrl', false);
                    
                    that.validateDateTime(o, 'File', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'File', 'modified', (that.version == '1.1'));

                    var l = [];

                    if (o.masterFile) l.push(that.validateFile(o.masterFile));
                    if (o.derivativeFile) l.push(that.validateFile(o.derivativeFile));

                    l.push(that.validateObjectList(o, 'File', 'meeting', false, 'Meeting'));
                    l.push(that.validateObjectList(o, 'File', 'paper', false, 'Paper'));
                    l.push(that.validateObjectList(o, 'File', 'agendaItem', false, 'AgendaItem'));
                    
                    Promise.all(l).then(data => {
                        resolve(true);
                    }).catch(reject);
                });
            });
        },

        validateConsultation: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                o.get().then(o => {
                    // console.log(o);

                    OParl.Validator.result.push("Validate Consultation object " + o.id + " ...");

                    that.validateType(o, 'Consultation');

                    that.validateUrl(o, 'Consultation', 'id');

                    that.validateDateTime(o, 'Consultation', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'Consultation', 'modified', (that.version == '1.1'));

                    // var l = [];

                    // if (o.masterFile) l.push(that.validateFile(o.masterFile));
                    // if (o.derivativeFile) l.push(that.validateFile(o.derivativeFile));

                    // l.push(that.validateObjectList(o, 'File', 'meeting', false, 'Meeting'));
                    // l.push(that.validateObjectList(o, 'File', 'paper', false, 'Paper'));
                    // // l.push(that.validateObjectList(o, 'File', 'agendaItem', false, 'AgendaItem'));
                    
                    // Promise.all(l).then(data => {
                    //     resolve(true);
                    // }).catch(reject);
                });
            });
        },

        validateAgendaItem: function(o) {
            var that = this;

            return new Promise(function(resolve, reject) { 
                o.get().then(o => {
                    // console.log(o);

                    OParl.Validator.result.push("Validate AgendaItem object " + o.id + " ...");

                    that.validateType(o, 'AgendaItem');

                    that.validateUrl(o, 'AgendaItem', 'id');

                    that.validateDateTime(o, 'AgendaItem', 'created', (that.version == '1.1'));
                    that.validateDateTime(o, 'AgendaItem', 'modified', (that.version == '1.1'));

                    // var l = [];

                    // if (o.masterFile) l.push(that.validateFile(o.masterFile));
                    // if (o.derivativeFile) l.push(that.validateFile(o.derivativeFile));

                    // l.push(that.validateObjectList(o, 'File', 'meeting', false, 'Meeting'));
                    // l.push(that.validateObjectList(o, 'File', 'paper', false, 'Paper'));
                    // // l.push(that.validateObjectList(o, 'File', 'agendaItem', false, 'AgendaItem'));
                    
                    // Promise.all(l).then(data => {
                    //     resolve(true);
                    // }).catch(reject);
                });
            });
        },
    };

    // define OParl for Node module pattern loaders, including Browserify
	if (OParl.usingNodeJS) {
		module.exports = OParl.Validator;

	// define OParl as an AMD module
	} else if (typeof define === 'function' && define.amd) {
		define(OParl.Validator);
	}

}(typeof window !== 'undefined' ? window : {}, typeof document !== 'undefined' ? document : {}));