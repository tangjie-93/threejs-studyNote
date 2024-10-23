class Clock {

	constructor( autoStart = true ) {

		// 设置是否自动启动
		// 如果autoStart为true，则自动启动；否则不自动启动
		this.autoStart = autoStart;

		// 初始化开始时间
		this.startTime = 0;
		// 初始化上一次的时间
		this.oldTime = 0;
		// 初始化已过去的时间
		this.elapsedTime = 0;

		// 初始化运行状态为停止
		this.running = false;

	}

	start() {

		this.startTime = now();

		this.oldTime = this.startTime;
		this.elapsedTime = 0;
		this.running = true;

	}

	stop() {

		this.getElapsedTime();
		this.running = false;
		this.autoStart = false;

	}

	getElapsedTime() {

		this.getDelta();
		return this.elapsedTime;

	}

	getDelta() {

		let diff = 0;

		if ( this.autoStart && ! this.running ) {

			this.start();
			return 0;

		}

		if ( this.running ) {

			const newTime = now();

			diff = ( newTime - this.oldTime ) / 1000;
			this.oldTime = newTime;

			this.elapsedTime += diff;

		}

		return diff;

	}

}

function now() {

	return ( typeof performance === 'undefined' ? Date : performance ).now(); // see #10732

}

export { Clock };
