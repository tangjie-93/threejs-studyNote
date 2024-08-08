import { WebGLLights } from './WebGLLights.js';

/**
 * WebGL渲染状态类
 *
 * @param extensions WebGL扩展对象
 * @returns 返回一个包含WebGL渲染状态相关方法和属性的对象
 */
function WebGLRenderState( extensions ) {

	const lights = new WebGLLights( extensions );

	const lightsArray = [];
	const shadowsArray = [];

	/**
	 * 初始化函数
	 *
	 * @param camera 相机对象
	 * @returns 无返回值
	 */
	function init( camera ) {

		state.camera = camera;

		lightsArray.length = 0;
		shadowsArray.length = 0;

	}

	/**
	 * 将灯光对象推入灯光数组
	 *
	 * @param light 灯光对象
	 */
	function pushLight( light ) {

		lightsArray.push( light );

	}

	/**
	 * 将阴影灯光对象推入阴影灯光数组
	 *
	 * @param shadowLight 阴影灯光对象
	 */
	function pushShadow( shadowLight ) {

		shadowsArray.push( shadowLight );

	}

	/**
	 * 设置灯光
	 *
	 * @description 根据传入的灯光数组，调用 lights.setup 方法进行灯光设置
	 *
	 * @param {Array} lightsArray 灯光数组
	 *
	 * @returns {void} 无返回值
	 */
	function setupLights() {

		lights.setup( lightsArray );

	}

	/**
	 * 设置灯光视图
	 *
	 * @param camera 相机对象
	 * @returns 无返回值
	 */
	function setupLightsView( camera ) {

		lights.setupView( lightsArray, camera );

	}

	const state = {
		lightsArray: lightsArray,
		shadowsArray: shadowsArray,

		camera: null,

		lights: lights,

		transmissionRenderTarget: {}
	};

	return {
		init: init,
		state: state,
		setupLights: setupLights,
		setupLightsView: setupLightsView,

		pushLight: pushLight,
		pushShadow: pushShadow
	};

}

/**
 * @description
 * 创建一个WebGLRenderStates对象，用于管理场景的WebGL渲染状态。
 * 该对象包含两个方法：get和dispose。
 * get方法接收两个参数：scene（场景）和renderCallDepth（渲染调用深度），返回一个WebGLRenderState对象。
 * WebGLRenderState对象是一个WeakMap，用于存储场景的WebGL渲染状态。
 * 如果当前场景没有WebGL渲染状态，则会创建一个新的WebGLRenderState对象并将其添加到WeakMap中。
 * 如果当前场景已经有WebGL渲染状态，但是渲染调用深度超过了现有状态的长度，则会创建一个新的WebGLRenderState对象并将其添加到WeakMap中。
 * 否则，返回现有状态中对应的WebGLRenderState对象。
 * dispose方法用于释放WebGLRenderStates对象，重置所有WeakMap。
 *
 * @param {Object} extensions - WebGL扩展对象，包含常用的WebGL扩展，例如OES_texture_float、OES_element_index_uint等。
 * @returns {Object} 包含get和dispose两个方法的WebGLRenderStates对象。
 */
function WebGLRenderStates( extensions ) {

	let renderStates = new WeakMap();

	function get( scene, renderCallDepth = 0 ) {

		const renderStateArray = renderStates.get( scene );
		let renderState;

		if ( renderStateArray === undefined ) {

			renderState = new WebGLRenderState( extensions );
			renderStates.set( scene, [ renderState ] );

		} else {

			if ( renderCallDepth >= renderStateArray.length ) {

				renderState = new WebGLRenderState( extensions );
				renderStateArray.push( renderState );

			} else {

				renderState = renderStateArray[ renderCallDepth ];

			}

		}

		return renderState;

	}

	function dispose() {

		renderStates = new WeakMap();

	}

	return {
		get: get,
		dispose: dispose
	};

}


export { WebGLRenderStates };

		renderStates = new WeakMap();

	}

	return {
		get: get,
		dispose: dispose
	};

}


export { WebGLRenderStates };
