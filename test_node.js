/*jslint browser: true*/
/*global console,require*/

//-----------------------------------------------------------------------

function testConsultation(data) {
	'use strict';

	console.log();
	console.log('Consultation: ' + data.role);
}

//-----------------------------------------------------------------------

function testAgendaItem(data) {
	'use strict';

	console.log();
	console.log('Agenda: ' + data.number + '. ' + data.name);
	console.log('Result: ' + data.result);
	console.log('Text: ' + data.resolutionText);
	console.log('Start time: ' + (isNaN(data.start) ? '---' : data.start.toJSON().slice(11, 16)));
	console.log('End time: ' + (isNaN(data.end) ? '---' : data.end.toJSON().slice(11, 16)));

	data.consultationObject.get(function (err, dataConsultation) {
		if (err !== null) {
			console.error('Something went wrong: ' + err);
		} else {
			testConsultation(dataConsultation);
		}
	});
}

//-----------------------------------------------------------------------

function testLocation(data, callback) {
	'use strict';

	console.log();
	console.log('Location: ' + data.description);
	console.log('Address: ' + data.streetAddress);
	console.log('Room: ' + data.room);
	console.log('Locality: ' + data.locality + ' - ' + data.subLocality);
	console.log('ZIP: ' + data.postalCode);

	callback();
}

//-----------------------------------------------------------------------

function testMembership(data, callback) {
	'use strict';

	console.log();
	console.log('Membership as: ' + data.role);
	console.log('Voting right: ' + (data.votingRight ? 'yes' : 'no'));
	console.log('Start date: ' + (isNaN(data.startDate) ? '---' : data.startDate.toJSON().slice(0, 10)));
	console.log('End date: ' + (isNaN(data.endDate) ? '---' : data.endDate.toJSON().slice(0, 10)));

	callback();
}

//-----------------------------------------------------------------------

function testParticipant(data, callback) {
	'use strict';

	console.log();
	console.log('Participant name: ' + data.name);
	console.log('Participant name: ' + data.formOfAddress + ' ' + data.affix + ' ' + data.givenName + ' ' + data.familyName);
	console.log('Gender: ' + data.gender);
	console.log('Phone: ' + (data.phone.length === 0 ? '---' : data.phone[0]));
	console.log('Email: ' + (data.email.length === 0 ? '---' : data.email[0]));
	console.log('Status: ' + (data.status.length === 0 ? '---' : data.status[0]));
	console.log('Some text about the people: ' + data.life);
	console.log('Source: ' + data.lifeSource);

	data.membershipList.get(function (err, dataMembershipList) {
		if (err !== null) {
			console.error('Something went wrong: ' + err);
		} else {
			console.log('Membership count: ' + dataMembershipList.length);

			if (dataMembershipList.length > 0) {
				dataMembershipList[0].get(function (err, dataMembership) {
					if (err !== null) {
						console.error('Something went wrong: ' + err);
					} else {
						testMembership(dataMembership, function () {
							data.locationObject.get(function (err, dataLocation) {
								if (err !== null) {
									console.error('Something went wrong: ' + err);
								} else {
									testLocation(dataLocation, callback);
								}
							});
						});
					}
				});
			}
		}
	});
}

//-----------------------------------------------------------------------

function testMeeting(data) {
	'use strict';

	console.log();
	console.log('Meeting name: ' + data.name);
	console.log('Date: ' + (isNaN(data.start) ? '---' : data.start.toJSON().slice(0, 10)));
	console.log('Start time: ' + (isNaN(data.start) ? '---' : data.start.toJSON().slice(11, 16)));
	console.log('End time: ' + (isNaN(data.end) ? '---' : data.end.toJSON().slice(11, 16)));

	data.organizationList.get(function (err, dataOrganizationList) {
		if (err !== null) {
			console.error('Something went wrong: ' + err);
		} else {
			console.log('Organization count: ' + dataOrganizationList.length);

			data.participantList.get(function (err, dataParticipantList) {
				if (err !== null) {
					console.error('Something went wrong: ' + err);
				} else {
					console.log('Participant count: ' + dataParticipantList.length);

					data.auxiliaryFileList.get(function (err, dataAuxiliaryFileList) {
						if (err !== null) {
							console.error('Something went wrong: ' + err);
						} else {
							console.log('Auxiliary file count: ' + dataAuxiliaryFileList.length);

							data.agendaItemList.get(function (err, dataAgendaItemList) {
								if (err !== null) {
									console.error('Something went wrong: ' + err);
								} else {
									console.log('Agenda item count: ' + dataAgendaItemList.length);

									if (dataParticipantList.length > 0) {
										dataParticipantList[0].get(function (err, dataParticipant) {
											if (err !== null) {
												console.error('Something went wrong: ' + err);
											} else {
												testParticipant(dataParticipant, function () {
													if (dataAgendaItemList.length > 0) {
														dataAgendaItemList[0].get(function (err, dataAgendaItem) {
															if (err !== null) {
																console.error('Something went wrong: ' + err);
															} else {
																testAgendaItem(dataAgendaItem);
															}
														});
													}
												});
											}
										});
									}
								}
							});
						}
					});
				}
			});
		}
	});
}

//-----------------------------------------------------------------------

function testOrganization(data) {
	'use strict';

	console.log();
	console.log('Organization name: ' + data.name);
	console.log('Organization type: ' + data.organizationType);
	console.log('Classification: ' + data.classification);
	console.log('Start date: ' + (isNaN(data.startDate) ? '---' : data.startDate.toJSON().slice(0, 10)));
	console.log('End date: ' + (isNaN(data.endDate) ? '---' : data.endDate.toJSON().slice(0, 10)));

	data.membershipList.get(function (err, dataMembership) {
		if (err !== null) {
			console.error('Something went wrong: ' + err);
		} else {
			console.log('Membership count: ' + dataMembership.length);

			data.meetingList.get(function (err, dataMeetingList) {
				if (err !== null) {
					console.error('Something went wrong: ' + err);
				} else {
					console.log('Meeting count: ' + dataMeetingList.length);

					if (dataMeetingList.length > 0) {
						dataMeetingList[0].get(function (err, dataMeeting) {
							if (err !== null) {
								console.error('Something went wrong: ' + err);
							} else {
								testMeeting(dataMeeting);
							}
						});
					}
				}
			});
		}
	});
}

//-----------------------------------------------------------------------

function testLegislative(data, callback) {
	'use strict';

	console.log();
	console.log('Legislative term name: ' + data.name);

	data.bodyObject.get(function (err, dataBody) {
		if (err !== null) {
			console.error('Something went wrong: ' + err);
		} else {
			if (dataBody === null) {
				console.log('Body name: ---');
			} else {
				console.log('Body name: ' + dataBody.name);
			}
			console.log('Start date: ' + (isNaN(data.startDate) ? '---' : data.startDate.toJSON().slice(0, 10)));
			console.log('End date: ' + (isNaN(data.endDate) ? '---' : data.endDate.toJSON().slice(0, 10)));

			callback();
		}
	});
}

//-----------------------------------------------------------------------

function testBody(data) {
	'use strict';

	console.log();
	console.log('Body name: ' + data.name);
	console.log('Body license: ' + data.license);
	console.log('Body modified: ' + isNaN(data.modified) ? '' : data.modified.toJSON().substr(0, 10));

    data.system.get().then(data => {
        console.log('System name: ' + data.name);
    });

    data.organization.get().then(list => {
        console.log('Organization count: ' + list.length);
    });

    data.person.get().then(list => {
        console.log('Person count: ' + list.length);
    });

    data.meeting.get().then(list => {
        console.log('Meeting count: ' + list.length);
    });

    data.paper.get().then(list => {
        console.log('Paper count: ' + list.length);
    });

    data.legislativeTerm.get().then(list => {
        console.log('Legislative count: ' + list.length);
    });
}

//-----------------------------------------------------------------------

function testSystem(data) {
	'use strict';

	console.log();
	console.log('System name: ' + data.name);
	console.log('System license: ' + data.license);

	data.body.get().then(dataBodyList => {
        console.log('Body count: ' + dataBodyList.length);

		if (dataBodyList.length > 0) {
			dataBodyList[0].get().then(testBody);
		}
    });
}

//-----------------------------------------------------------------------

function start() {
	'use strict';

	var OParl = require('./lib/oparl-src');
//	OParl.open('https://www.lwl-pch.sitzung-online.de/oi/oparl/1.0/system.asp', function (err, data) {
//	OParl.open('https://api.kleineanfragen.de/oparl/v1', function (err, data) {
//	OParl.open('https://www.muenchen-transparent.de/oparl/v1.0', function (err, data) {
//	OParl.open('https://dev.oparl.org/api/v1/system/', function (err, data) {

    var myArgs = process.argv.slice(2);
    console.log('myArgs: ', myArgs);

    var testUrl = "https://api.kleineanfragen.de/oparl/v1";

    if (myArgs.length > 0) {
        testUrl = myArgs[0];
    }

    OParl.open(testUrl).then(testSystem).catch(err => {
        console.error('Something went wrong: ' + err);
    });
}

//-----------------------------------------------------------------------

try {
	start();
} catch (e) {
	console.error(e);
}

//-----------------------------------------------------------------------
//eof
