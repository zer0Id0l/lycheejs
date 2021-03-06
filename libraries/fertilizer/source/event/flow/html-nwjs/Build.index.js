
(function(lychee, global) {

	if (lychee === undefined) {

		try {
			lychee = require('./crux.js')(__dirname);
		} catch (err) {
		}

	}


	let blob = ${blob};


	let environment = lychee.deserialize(blob);
	if (environment !== null) {
		environment.init();
	}

	lychee.ENVIRONMENTS['${id}'] = environment;

	return environment;

})(typeof lychee !== 'undefined' ? lychee : undefined, typeof global !== 'undefined' ? global : this);
