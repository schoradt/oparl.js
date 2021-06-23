/*
 * oparl.js, a JavaScript library for the OParl protocoll. https://github.com/tursics/oparl.js
 * 2017, Thomas Tursics
 */

/*jshint esversion: 6 */
/*jslint browser: true, esversion: 6*/
/*global module,define,require*/

(function (window, document) {
	'use strict';

	var OParl = {};
	OParl.version = '0.0.1';
	OParl.apiversion = '1.0';
	OParl.usingNodeJS = (typeof module === 'object' && typeof module.exports === 'object');

	// define OParl for Node module pattern loaders, including Browserify
	if (OParl.usingNodeJS) {
		module.exports = OParl;

	// define OParl as an AMD module
	} else if (typeof define === 'function' && define.amd) {
		define(OParl);
	}

	// define OParl as a global OParl variable
	window.OParl = OParl;

	OParl.namespaces = [];

	/*
	 * OParl.Util contains some helper functions
	 * https://oparl.org/spezifikation/online-ansicht/#entity-system
	 */

	OParl.Util = {
		getJSON: function (url) {
            var p = new Promise((resolve, reject) => {
                var http, https, xhr, body = '';

    			if (url === null) {
    				reject('URI is null');

    				return;
    			}

                if (OParl.usingNodeJS) {
    				http = require('http');
    				https = require('https');

    				if (url.indexOf('https://') === 0) {
    					https.get(url, function (res) {
    						res.on('data', function (chunk) {
    							body += chunk;
    						});

    						res.on('end', function () {
                                resolve(JSON.parse(body));
    						});
    					}).on('error', function (status) {
    						reject(status);
    					});
    				} else if (url.indexOf('http://') === 0) {
                        var request = http.get(url, function (res) {
    						res.on('data', function (chunk) {
                                body += chunk;
    						});

    						res.on('end', function () {
                                resolve(JSON.parse(body));
    						});
    					});
                        
                        request.on('error', function (status) {
    						reject(status);
    					});

                        request.end();
    				} else {
    					reject('Unknown URI schema');
    				}
    			} else {
    				// see http://stackoverflow.com/questions/12460378/how-to-get-json-from-url-in-javascript
    				xhr = new XMLHttpRequest();
    				xhr.open('GET', url, true);
    				xhr.responseType = 'json';
    				xhr.onload = function () {
    					var status = xhr.status;

    					if (status === 200) {
                            resolve(xhr.response);
    					} else {
    						reject(status);
    					}
    				};

    				xhr.onerror = function (e) {
    					if (0 === url.indexOf('http://')) {
    						// fallback: some (bad configured) OParl systems only serves http links in an https environment
    						OParl.Util.getJSON(url.replace('http://', 'https://'))
                                .then(data => { 
                                    resolve(data); 
                                })
                                .catch(err => { 
                                    reject(err); 
                                });
    					} else {
    						reject('Could not load ' + url);
    					}
    				};

    				xhr.send();
    			}
            });
			
            return p;
		},

		/*
		 * OParl.Util.registerNamespace register a new namespace parser function
		 */
		registerNamespace: function (namespace, parseFunc) {
			OParl.namespaces.push({namespace: namespace, func: parseFunc});
		},

		callParser: function (namespace, json) {
            var that = this;

            return new Promise(function(resolve, reject) {
                var i;

                var cb = (err, data) => {
                    if(err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                };

    			for (i = 0; i < OParl.namespaces.length; ++i) {
    				if (OParl.namespaces[i].namespace === namespace) {
    					OParl.namespaces[i].func(json, cb);

    					return;
    				}
    			}

    			reject('Unknown namespace ' + namespace);
            });
		},

		callObjectArrayParser: function () {
            var that = this;

            return new Promise(function(resolve, reject) { 
			    function analyseArray(data) {
                    var arr = [],
    					i;

    				for (i = 0; i < data.length; ++i) {
    					arr.push({
    						get: OParl.Util.callObjectParser,
    						data: data[i] || null
    					});
    				}

    				return arr;
    			}

    			if (that.data instanceof Array) {
    				resolve(analyseArray(that.data));
    			} else {
    				var url = that.data;

    				OParl.Util.getJSON(url)
                        .then(data => {
                            resolve(analyseArray(data.data));
                        })
                        .catch(err => {
                            reject(err);
                        });
    			}
            });
		},

		callObjectParser: function () {
            var that = this;

            return new Promise(function(resolve, reject) { 
    			if (that.data === null) {
    				resolve(null);
    			} else if ((Object.prototype.toString.call(that.data) === '[object Array]') && (that.data.length === 1)) {
    				OParl.Util.callParser(that.data[0].type, that.data[0]).then(data => {
                        resolve(data);
                    }).catch(err => {
                        reject(err);
                    });
    			} else if (that.data instanceof Object) {
    				OParl.Util.callParser(that.data.type, that.data).then(data => {
                        resolve(data);
                    }).catch(err => {
                        reject(err);
                    });
    			} else {
    				var url = that.data;

    				OParl.Util.getJSON(url)
                        .then(data => {
                            OParl.Util.callParser(data.type, data).then(data => {
                                resolve(data);
                            }).catch(err => {
                                reject(err);
                            });
                        })
                        .catch(err => {
                            reject(err);
                        });
    			}
            });
		}
	};

	OParl.Handler = {};

	OParl.Handler.handleSystem = function (json, callback) {
		var obj = {};
		obj.objectType = 'oparl:System';

		// mandatory
		obj.oparlVersion = json.oparlVersion || '';
		obj.body = {
			get: OParl.Util.callObjectArrayParser,
			data: json.body || []
		};

		// optional
		obj.otherOparlVersions = json.otherOparlVersions || [];
		obj.license = json.license || '';
		obj.name = json.name || '';
		obj.contactEmail = json.contactEmail || '';
		obj.contactName = json.contactName || '';
		obj.website = json.website || '';
		if (json.vendor) obj.vendor = json.vendor || '';
		obj.product = json.product || '';

		// do we need this?
		obj.id = json.id || '';
		obj.type = json.type || '';
		obj.created = new Date(Date.parse(json.created || null));
		obj.modified = new Date(Date.parse(json.modified || null));
		
        if (json.web) obj.web = json.web;

		obj.deleted = json.deleted || false;

		callback(null, obj);
	};

	OParl.Handler.handleBody = function (json, callback) {
		var obj = {};
		obj.objectType = 'oparl:Body';

		// mandatory
		obj.name = json.name || '';
		obj.organization = {
			get: OParl.Util.callObjectArrayParser,
			data: json.organization || []
		};
        
		obj.person = {
			get: OParl.Util.callObjectArrayParser,
			data: json.person || []
		};
		obj.meeting = {
			get: OParl.Util.callObjectArrayParser,
			data: json.meeting || []
		};
		obj.paper = {
			get: OParl.Util.callObjectArrayParser,
			data: json.paper || []
		};

        obj.legislativeTerm = {
			get: OParl.Util.callObjectArrayParser,
			data: json.legislativeTerm || []
		};

		obj.legislativeTermList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.legislativeTermList || []
		};

		// optional
		obj.system = {
			get: OParl.Util.callObjectParser,
			data: json.system || null
		};

		obj.shortName = json.shortName || '';
		obj.website = json.website || '';
		if (json.license) obj.license = json.license;
		if (json.licenseValidSince) obj.licenseValidSince = new Date(Date.parse(json.licenseValidSince || null));
		if (json.oparlSince) obj.oparlSince = new Date(Date.parse(json.oparlSince || null));
		obj.ags = json.ags || '';
		obj.rgs = json.rgs || '';
		obj.equivalent = json.equivalent || [];
		obj.contactEmail = json.contactEmail || '';
		obj.contactName = json.contactName || '';
		obj.classification = json.classification || '';
		obj.location = json.location || '';
		obj.modified = new Date(Date.parse(json.modified || null));

		// do we need this?
		obj.id = json.id;
		obj.type = json.type;
		obj.keyword = json.keyword || [];
		obj.created = new Date(Date.parse(json.created || null));
		
        if (json.web) obj.web = json.web;

		obj.deleted = json.deleted || false;

		callback(null, obj);
	};

	OParl.Handler.handleLegislativeTerm = function (json, callback) {
		var obj = {};
		obj.objectType = 'oparl:LegislativeTerm';

		// mandatory

		// optional
		obj.bodyObject = {
			get: OParl.Util.callObjectParser,
			data: json.body || null
		};
		obj.name = json.name || '';
		obj.startDate = new Date(Date.parse(json.startDate || null));
		obj.endDate = new Date(Date.parse(json.endDate || null));

        obj.id = json.id;
		obj.type = json.type;
		obj.keyword = json.keyword || [];

		if (json.web) obj.web = json.web;

		callback(null, obj);
	};

	OParl.Handler.handleOrganization = function (json, callback) {
		var obj = {};
		obj.objectType = 'oparl:Organization';

		// mandatory

		// optional
		obj.bodyObject = {
			get: OParl.Util.callObjectParser,
			data: json.body || null
		};
		obj.name = json.name || '';
		obj.membershipList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.membership || []
		};
		obj.meetingList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.meeting || []
		};
		obj.shortName = json.shortName || '';
		obj.post = json.post || [];
		obj.subOrganizationOfObject = {
			get: OParl.Util.callObjectParser,
			data: json.subOrganizationOf || null
		};
		obj.organizationType = json.organizationType || '';
		obj.classification = json.classification || '';
		obj.startDate = new Date(Date.parse(json.startDate || null));
		obj.endDate = new Date(Date.parse(json.endDate || null));
		obj.website = json.website || '';
		obj.locationObject = {
			get: OParl.Util.callObjectParser,
			data: json.location || null
		};
		obj.externalBodyObject = {
			get: OParl.Util.callObjectParser,
			data: json.externalBody || null
		};

		// do we need this?
		obj.id = json.id;
		obj.type = json.type;
		obj.keyword = json.keyword || [];
		obj.created = new Date(Date.parse(json.created || null));
		obj.modified = new Date(Date.parse(json.modified || null));

		if (json.web) obj.web = json.web;

		obj.deleted = json.deleted || false;

		callback(null, obj);
	};

	OParl.Handler.handleMeeting = function (json, callback) {
		var obj = {};
		obj.objectType = 'oparl:Meeting';

		// mandatory

		// optional
		obj.name = json.name || '';
		obj.meetingState = json.meetingState || '';
		obj.cancelled = json.cancelled || false;
		obj.start = new Date(Date.parse(json.start || null));
		obj.end = new Date(Date.parse(json.end || null));
		obj.locationObject = {
			get: OParl.Util.callObjectParser,
			data: json.location || null
		};
		obj.organizationList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.organization || []
		};
		obj.participantList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.participant || []
		};
		obj.invitationObject = {
			get: OParl.Util.callObjectParser,
			data: json.invitation || null
		};
		obj.resultsProtocolObject = {
			get: OParl.Util.callObjectParser,
			data: json.resultsProtocol || null
		};
		obj.verbatimProtocolObject = {
			get: OParl.Util.callObjectParser,
			data: json.verbatimProtocol || null
		};
		obj.auxiliaryFileList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.auxiliaryFile || []
		};
		obj.agendaItemList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.agendaItem || []
		};

		obj.id = json.id;
		obj.type = json.type;
		obj.keyword = json.keyword || [];
		obj.created = new Date(Date.parse(json.created || null));
		obj.modified = new Date(Date.parse(json.modified || null));
		if (json.web) obj.web = json.web;
		
        obj.deleted = json.deleted || false;

		callback(null, obj);
	};

	OParl.Handler.handlePerson = function (json, callback) {
		var obj = {};
		obj.objectType = 'oparl:Person';

		// mandatory

		// optional
		obj.bodyObject = {
			get: OParl.Util.callObjectParser,
			data: json.body || null
		};
		obj.name = json.name || '';
		obj.familyName = json.familyName || '';
		obj.givenName = json.givenName || '';
		obj.formOfAddress = json.formOfAddress || '';
		obj.affix = json.affix || '';
		obj.title = json.title || [];
		obj.gender = json.gender || '';
		obj.phone = json.phone || [];
		obj.email = json.email || [];
		obj.locationObject = {
			get: OParl.Util.callObjectParser,
			data: json.location || null
		};
		obj.status = json.status || [];
		obj.membershipList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.membership || []
		};
		obj.life = json.life || '';
		obj.lifeSource = json.lifeSource || '';

		// do we need this?
		obj.id = json.id;
		obj.type = json.type;
		obj.keyword = json.keyword || [];
		obj.created = new Date(Date.parse(json.created || null));
		obj.modified = new Date(Date.parse(json.modified || null));
		obj.web = json.web;
		obj.deleted = json.deleted || false;

		callback(null, obj);
	};

	OParl.Handler.handleMembership = function (json, callback) {
		var obj = {};
		obj.objectType = 'oparl:Membership';

		// mandatory

		// optional
		obj.personObject = {
			get: OParl.Util.callObjectParser,
			data: json.person || null
		};
		obj.organizationObject = {
			get: OParl.Util.callObjectParser,
			data: json.organization || null
		};
		obj.role = json.role || '';
		obj.votingRight = json.votingRight || false;
		obj.startDate = new Date(Date.parse(json.startDate || null));
		obj.endDate = new Date(Date.parse(json.endDate || null));
		obj.onBehalfOfObject = {
			get: OParl.Util.callObjectParser,
			data: json.onBehalfOf || null
		};

		// do we need this?
		// obj.id = json.id;
		// obj.type = json.type;
		// obj.keyword = json.keyword || [];
		// obj.web = json.web || '';

		callback(null, obj);
	};

	OParl.Handler.handleLocation = function (json, callback) {
		var obj = {};
		obj.objectType = 'oparl:Location';

		// mandatory

		// optional
		obj.description = json.description || '';
		obj.geojsonObject = {
			get: OParl.Util.callObjectParser,
			data: json.geojson || null
		};
		obj.streetAddress = json.streetAddress || '';
		obj.room = json.room || '';
		obj.postalCode = json.postalCode || '';
		obj.subLocality = json.subLocality || '';
		obj.locality = json.locality || '';
		obj.bodiesList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.bodies || []
		};
		obj.organizationList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.organization || []
		};
		obj.meetingList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.meeting || []
		};
		obj.papersList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.papers || []
		};

		// do we need this?
		// obj.id = json.id;
		// obj.type = json.type;
		// obj.keyword = json.keyword || [];
		// obj.created = new Date(Date.parse(json.created || null));
		// obj.modified = new Date(Date.parse(json.modified || null));
		// obj.web = json.web || '';
		// obj.deleted = json.deleted || false;

		callback(null, obj);
	};

	OParl.Handler.handleAgendaItem = function (json, callback) {
		var obj = {};
		obj.objectType = 'oparl:AgendaItem';

		// mandatory

		// optional
		obj.meeting = json.meeting || '';
		obj.number = json.number || '';
		obj.name = json.name || '';
		obj.publicly = json['public'] || true;
		obj.consultationObject = {
			get: OParl.Util.callObjectParser,
			data: json.consultation || null
		};
		obj.result = json.result || '';
		obj.resolutionText = json.resolutionText || '';
		obj.resolutionFileObject = {
			get: OParl.Util.callObjectParser,
			data: json.resolutionFile || null
		};
		obj.auxiliaryFileList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.auxiliaryFile || []
		};
		obj.start = new Date(Date.parse(json.start || null));
		obj.end = new Date(Date.parse(json.end || null));

		// do we need this?
		// obj.id = json.id;
		// obj.type = json.type;
		// obj.keyword = json.keyword || [];
		// obj.web = json.web || '';

		callback(null, obj);
	};

    OParl.Handler.handlePaper = function (json, callback) {
		var obj = {};
		obj.objectType = 'oparl:Paper';

		// mandatory
        obj.id = json.id;
		obj.type = json.type;

        obj.name = json.name;
        obj.reference = json.reference;

        obj.date = new Date(Date.parse(json.date || null));

        obj.paperType = json.paperType;

        obj.releatedPaperList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.relatedPaper || []
		};

        obj.superordinatedPaperList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.superordinatedPaper || []
		};

        obj.subordinatedPaperList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.subordinatedPaper || []
		};

        obj.mainFileObject = {
			get: OParl.Util.callObjectParser,
			data: json.mainFile || null
		};

        obj.auxiliaryFileList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.auxiliaryFile || []
		};

        obj.locationObject = {
			get: OParl.Util.callObjectParser,
			data: json.location || null
		};
		
        obj.originatorPersonList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.originatorPerson || []
		};

        obj.underDirectionOfList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.underDirectionOf || []
		};

        obj.originatorOrganizationList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.originatorOrganization || []
		};

        obj.consultationList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.consultation || []
		};

		obj.keyword = json.keyword || [];
        obj.created = new Date(Date.parse(json.created || null));
		obj.modified = new Date(Date.parse(json.modified || null));
		obj.web = json.web;
		obj.deleted = json.deleted || false;


		callback(null, obj);
	};


	OParl.Handler.handleConsultation = function (json, callback) {
		var obj = {};
		obj.objectType = 'oparl:Consultation';

		// mandatory

		// optional
		obj.paperObject = {
			get: OParl.Util.callObjectParser,
			data: json.paper || null
		};
		obj.agendaItemObject = {
			get: OParl.Util.callObjectParser,
			data: json.agendaItem || null
		};
		obj.meetingObject = {
			get: OParl.Util.callObjectParser,
			data: json.meeting || null
		};
		obj.organizationList = {
			get: OParl.Util.callObjectArrayParser,
			data: json.organization || []
		};
		obj.authoritative = json.authoritative || true;
		obj.role = json.role || '';

		// do we need this?
		// obj.id = json.id;
		// obj.type = json.type;
		// obj.keyword = json.keyword || [];
		// obj.web = json.web || '';

		callback(null, obj);
	};

	/*
	 * https://oparl.org/spezifikation/online-ansicht/#entity-system
	 */
	OParl.Util.registerNamespace('https://schema.oparl.org/1.0/System', OParl.Handler.handleSystem);
	OParl.Util.registerNamespace('https://schema.oparl.org/1.1/System', OParl.Handler.handleSystem);

	/*
	 * https://oparl.org/spezifikation/online-ansicht/#entity-body
	 */
	OParl.Util.registerNamespace('https://schema.oparl.org/1.0/Body', OParl.Handler.handleBody);
	OParl.Util.registerNamespace('https://schema.oparl.org/1.1/Body', OParl.Handler.handleBody);

	/*
	 * https://oparl.org/spezifikation/online-ansicht/#legislativeterm
	 */
	OParl.Util.registerNamespace('https://schema.oparl.org/1.0/LegislativeTerm', OParl.Handler.handleLegislativeTerm);
	OParl.Util.registerNamespace('https://schema.oparl.org/1.1/LegislativeTerm', OParl.Handler.handleLegislativeTerm);

	/*
	 * https://oparl.org/spezifikation/online-ansicht/#entity-organization
	 */
	OParl.Util.registerNamespace('https://schema.oparl.org/1.0/Organization', OParl.Handler.handleOrganization);
	OParl.Util.registerNamespace('https://schema.oparl.org/1.1/Organization', OParl.Handler.handleOrganization);

	/*
	 * https://oparl.org/spezifikation/online-ansicht/#entity-meeting
	 */
	OParl.Util.registerNamespace('https://schema.oparl.org/1.0/Meeting', OParl.Handler.handleMeeting);
	OParl.Util.registerNamespace('https://schema.oparl.org/1.1/Meeting', OParl.Handler.handleMeeting);

	/*
	 * https://oparl.org/spezifikation/online-ansicht/#entity-person
	 */
	OParl.Util.registerNamespace('https://schema.oparl.org/1.0/Person', OParl.Handler.handlePerson);
	OParl.Util.registerNamespace('https://schema.oparl.org/1.1/Person', OParl.Handler.handlePerson);

	/*
	 * https://oparl.org/spezifikation/online-ansicht/#membership
	 */
	OParl.Util.registerNamespace('https://schema.oparl.org/1.0/Membership', OParl.Handler.handleMembership);
	OParl.Util.registerNamespace('https://schema.oparl.org/1.1/Membership', OParl.Handler.handleMembership);

	/*
	 * https://oparl.org/spezifikation/online-ansicht/#entity-location
	 */
	OParl.Util.registerNamespace('https://schema.oparl.org/1.0/Location', OParl.Handler.handleLocation);
	OParl.Util.registerNamespace('https://schema.oparl.org/1.1/Location', OParl.Handler.handleLocation);

	/*
	 * https://oparl.org/spezifikation/online-ansicht/#agendaitem
	 */
	OParl.Util.registerNamespace('https://schema.oparl.org/1.0/AgendaItem', OParl.Handler.handleAgendaItem);
	OParl.Util.registerNamespace('https://schema.oparl.org/1.1/AgendaItem', OParl.Handler.handleAgendaItem);

    /*
	 * https://oparl.org/spezifikation/online-ansicht/#paper
	 */
    OParl.Util.registerNamespace('https://schema.oparl.org/1.0/Paper', OParl.Handler.handlePaper);
    OParl.Util.registerNamespace('https://schema.oparl.org/1.1/Paper', OParl.Handler.handlePaper);


	/*
	 * https://oparl.org/spezifikation/online-ansicht/#consultation
	 */
	OParl.Util.registerNamespace('https://schema.oparl.org/1.0/Consultation', OParl.Handler.handleConsultation);
	OParl.Util.registerNamespace('https://schema.oparl.org/1.1/Consultation', OParl.Handler.handleConsultation);

	/*
	 * OParl.open is the starting function
	 */

	OParl.open = function (url) {
        var p = new Promise((resolve, reject) => {
            OParl.Util.getJSON(url).then(data => {
                OParl.Util.callParser(data.type, data)
                    .then(data => {
                        resolve(data);
                    }).catch(err => {
                        reject(err);
                    });
            }).catch(reject);
        });

		return p;
	};

}(typeof window !== 'undefined' ? window : {}, typeof document !== 'undefined' ? document : {}));
