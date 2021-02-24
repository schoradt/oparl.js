/*jslint browser: true, esversion: 8 */
/*global console,require*/

//-----------------------------------------------------------------------

function test() {
	'use strict';

    var p = new Promise(function(resolve) { 
    	var OParl = require('./lib/oparl-src');
        var Validator = require('./lib/oparl-validate');

        var myArgs = process.argv.slice(2);

        var testUrl = "https://api.kleineanfragen.de/oparl/v1";

        if (myArgs.length > 0) {
            testUrl = myArgs[0];
        }

        OParl.open(testUrl)
            .then(data => {
                console.log("pre validation");

                Validator.validateSystem(data).then(function(val) {
                    console.log("Validation results: ");

                    Validator.result.forEach(element => {
                        console.log("    " + element);
                    });

                    resolve(true);
                });
            })
            .catch(err => {
                console.error('Something went wrong: ' + err);

                resolve(false);
            });
    });

    return p;
}

async function start() {
    console.log("start ");

    const result = await test();

    console.log("test result ", result);

    return result;
}

//-----------------------------------------------------------------------

(async () => {
    try {
        await start();
    } catch (e) {
        console.log("error ");
        console.error(e);
    }
    
})();


//-----------------------------------------------------------------------
//eof
