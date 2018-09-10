
lychee.define('fertilizer.Main').requires([
	'lychee.event.Queue',
	'fertilizer.event.flow.Build',
	'fertilizer.event.flow.Configure',
	'fertilizer.event.flow.Fertilize',
	'fertilizer.event.flow.Package',
	'fertilizer.event.flow.html.Build'
]).includes([
	'lychee.event.Emitter'
]).exports(function(lychee, global, attachments) {

	const _flow      = lychee.import('fertilizer.event.flow');
	const _lychee    = lychee.import('lychee');
	const _Build     = lychee.import('fertilizer.event.flow.Build');
	const _Configure = lychee.import('fertilizer.event.flow.Configure');
	const _Emitter   = lychee.import('lychee.event.Emitter');
	const _Fertilize = lychee.import('fertilizer.event.flow.Fertilize');
	const _Package   = lychee.import('fertilizer.event.flow.Package');
	const _Queue     = lychee.import('lychee.event.Queue');



	/*
	 * HELPERS
	 */

	const _create_flows = function(data, queue) {

		queue = queue instanceof _Queue ? queue : new _Queue();



		let platform = data.target.split('/').shift() || null;
		if (platform !== null) {

			let Configure = _Configure;
			let Build     = _Build;
			let Package   = _Package;
			let Fertilize = _Fertilize;

			if (_flow[platform] !== undefined) {

				if (_flow[platform].Configure !== undefined) Configure = _flow[platform].Configure;
				if (_flow[platform].Build !== undefined)     Build     = _flow[platform].Build;
				if (_flow[platform].Package !== undefined)   Package   = _flow[platform].Package;

			}


			let action = data.action;
			if (action === 'fertilize') {

				let flow_fertilize = new Fertilize(data);
				let flow_configure = new Configure(data);
				let flow_build     = new Build(data);
				let flow_package   = new Package(data);

				if (Configure !== _Configure) {

					flow_fertilize.unbind('configure-project');

					flow_configure.transfer('configure-project', flow_fertilize);

				}

				if (Build !== _Build) {

					flow_fertilize.unbind('read-package');
					flow_fertilize.unbind('read-assets');
					flow_fertilize.unbind('read-assets-crux');
					flow_fertilize.unbind('build-environment');
					flow_fertilize.unbind('build-assets');
					flow_fertilize.unbind('write-assets');
					flow_fertilize.unbind('build-project');

					flow_build.transfer('read-package',      flow_fertilize);
					flow_build.transfer('read-assets',       flow_fertilize);
					flow_build.transfer('read-assets-crux',  flow_fertilize);
					flow_build.transfer('build-environment', flow_fertilize);
					flow_build.transfer('build-assets',      flow_fertilize);
					flow_build.transfer('write-assets',      flow_fertilize);
					flow_build.transfer('build-project',     flow_fertilize);

				}

				if (Package !== _Package) {

					flow_fertilize.unbind('package-runtime');
					flow_fertilize.unbind('package-project');

					flow_package.transfer('package-runtime', flow_fertilize);
					flow_package.transfer('package-project', flow_fertilize);

				}

				queue.then(flow_fertilize);

			} else if (action === 'configure') {

				queue.then(new Configure(data));

			} else if (action === 'build') {

				queue.then(new Build(data));

			} else if (action === 'package') {

				queue.then(new Package(data));

			}

		}


		return queue;

	};

	const _init_queue = function(queue) {

		let autofixed = false;

		queue.bind('update', function(flow, oncomplete) {

			flow.bind('complete', function() {

				if (flow._autofixed === true) {
					autofixed = true;
				}

				oncomplete(true);

			}, this);

			flow.bind('error', function(event) {

				console.error('WTF FLOW HAZ ERRORS! ' + event);
				console.log(flow.displayName, flow.project, flow.target);
				console.log(Object.keys(flow.___events));
				console.log(flow.___stack.map(s => s.event));

				oncomplete(false);

			}, this);

			flow.init();

		}, this);

		queue.bind('complete', function(flow) {

			if (autofixed === true) {
				process.exit(2);
			} else {
				process.exit(0);
			}

		}, this);

		queue.bind('error', function(event) {
			process.exit(1);
		}, this);

		queue.init();

	};



	/*
	 * IMPLEMENTATION
	 */

	const Composite = function(states) {

		this.settings = _lychee.assignunlink({
			action:  null,
			debug:   false,
			project: null,
			target:  null
		}, states);

		this.defaults = _lychee.assignunlink({
			action:  null,
			debug:   false,
			project: null,
			target:  null
		}, this.settings);


		let debug = this.settings.debug;
		if (debug === true) {
			console.log('fertilizer.Main: Parsed settings are ...');
			console.log(this.settings);
		}


		_Emitter.call(this);

		states = null;



		/*
		 * INITIALIZATION
		 */

		this.bind('load', function() {

			let project = this.settings.project || null;
			if (project !== null) {

				lychee.ROOT.project                           = _lychee.ROOT.lychee + project;
				lychee.environment.global.lychee.ROOT.project = _lychee.ROOT.lychee + project;

				this.trigger('init');

			} else {

				console.error('fertilizer: FAILURE ("' + project + '") at "load" event.');

				this.destroy(1);

			}

		}, this, true);

		this.bind('init', function() {

			let action  = this.settings.action  || null;
			let debug   = this.settings.debug   || false;
			let project = this.settings.project || null;
			let target  = this.settings.target  || null;

			if (action !== null && project !== null && target !== null) {

				let queue = _create_flows({
					action:  action,
					debug:   debug,
					project: project,
					target:  target
				});

				_init_queue.call(this, queue);

			} else if (action !== null && project !== null) {

				let pkg = new _Package({
					url:  project + '/lychee.pkg',
					type: 'build'
				});


				setTimeout(function() {

					let targets = pkg.getEnvironments().map(env => env.id);
					if (targets.length > 0) {

						let queue = new _Queue();

						targets.forEach(target => {

							_create_flows({
								action:  action,
								debug:   debug,
								project: project,
								target:  target
							}, queue);

						});

						_init_queue.call(this, queue);

					} else {

						this.destroy(0);

					}

				}.bind(this), 200);

			}

		}, this, true);

	};


	Composite.prototype = {

		/*
		 * ENTITY API
		 */

		// deserialize: function(blob) {},

		serialize: function() {

			let data = _Emitter.prototype.serialize.call(this);
			data['constructor'] = 'fertilizer.Main';


			let states = _lychee.assignunlink({}, this.settings);
			let blob   = data['blob'] || {};


			data['arguments'][0] = states;
			data['blob']         = Object.keys(blob).length > 0 ? blob : null;


			return data;

		},



		/*
		 * MAIN API
		 */

		init: function() {

			let action  = this.settings.action  || null;
			let project = this.settings.project || null;
			let target  = this.settings.target  || null;

			if (action !== null && project !== null && target !== null) {

				this.trigger('load');

				return true;

			}


			return false;

		},

		destroy: function(code) {

			code = typeof code === 'number' ? code : 0;


			this.trigger('destroy', [ code ]);

			return true;

		}

	};


	return Composite;

});

