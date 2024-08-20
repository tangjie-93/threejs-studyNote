import { Color } from '../../math/Color.js';
import { Matrix4 } from '../../math/Matrix4.js';
import { Vector2 } from '../../math/Vector2.js';
import { Vector3 } from '../../math/Vector3.js';
import { UniformsLib } from '../shaders/UniformsLib.js';

/**
 * 缓存统一变量对象
 *
 * @returns 返回包含各种灯光类型的统一变量对象的对象
 */
function UniformsCache() {

	const lights = {};

	return {

		get: function (light) {

			if (lights[light.id] !== undefined) {

				return lights[light.id];

			}

			let uniforms;

			switch (light.type) {

				case 'DirectionalLight':
					uniforms = {
						direction: new Vector3(),
						color: new Color()
					};
					break;

				case 'SpotLight':
					uniforms = {
						position: new Vector3(),
						direction: new Vector3(),
						color: new Color(),
						distance: 0,
						coneCos: 0,
						penumbraCos: 0,
						decay: 0
					};
					break;

				case 'PointLight':
					uniforms = {
						position: new Vector3(),
						color: new Color(),
						distance: 0,
						decay: 0
					};
					break;

				case 'HemisphereLight':
					uniforms = {
						direction: new Vector3(),
						skyColor: new Color(),
						groundColor: new Color()
					};
					break;

				case 'RectAreaLight':
					uniforms = {
						color: new Color(),
						position: new Vector3(),
						halfWidth: new Vector3(),
						halfHeight: new Vector3()
					};
					break;

			}

			lights[light.id] = uniforms;

			return uniforms;

		}

	};

}

/**
 * ShadowUniformsCache函数用于创建一个阴影统一变量缓存对象
 *
 * @returns 返回一个对象，包含以下属性：
 *   - get: 一个函数，用于获取指定光源的阴影统一变量
 */
function ShadowUniformsCache() {

	const lights = {};

	return {

		get: function (light) {

			if (lights[light.id] !== undefined) {

				return lights[light.id];

			}

			let uniforms;

			switch (light.type) {

				case 'DirectionalLight':
					uniforms = {
						shadowIntensity: 1,
						shadowBias: 0,
						shadowNormalBias: 0,
						shadowRadius: 1,
						shadowMapSize: new Vector2()
					};
					break;

				case 'SpotLight':
					uniforms = {
						shadowIntensity: 1,
						shadowBias: 0,
						shadowNormalBias: 0,
						shadowRadius: 1,
						shadowMapSize: new Vector2()
					};
					break;

				case 'PointLight':
					uniforms = {
						shadowIntensity: 1,
						shadowBias: 0,
						shadowNormalBias: 0,
						shadowRadius: 1,
						shadowMapSize: new Vector2(),
						shadowCameraNear: 1,
						shadowCameraFar: 1000
					};
					break;

				// TODO (abelnation): set RectAreaLight shadow uniforms

			}

			lights[light.id] = uniforms;

			return uniforms;

		}

	};

}



let nextVersion = 0;

/**
 * 根据灯光是否投射阴影和是否使用贴图进行排序
 *
 * @param lightA 灯光A
 * @param lightB 灯光B
 * @returns 返回两个灯光的排序权重差值
 */
function shadowCastingAndTexturingLightsFirst(lightA, lightB) {

	return (lightB.castShadow ? 2 : 0) - (lightA.castShadow ? 2 : 0) + (lightB.map ? 1 : 0) - (lightA.map ? 1 : 0);

}

/**
 * @description
 * 创建一个WebGLLights对象，用于管理场景中的光源信息。包括环境光、平行光、点光源、聚光灯和区域光源等。
 * 该对象提供了setup函数来更新光源信息，以及setupView函数来更新视图中的光源信息。
 *
 * @param {Object} extensions 可选参数，包含有关当前支持的WebGL扩展的信息，格式为{ has( extensionName ) }，其中extensionName是字符串类型。
 * @returns {Object} 返回一个对象，包含如下属性：setup、setupView、state。setup函数用于更新光源信息，setupView函数用于更新视图中的光源信息，state属性包含了所有的光源信息。
 */
function WebGLLights(extensions) {

	const cache = new UniformsCache();

	const shadowCache = ShadowUniformsCache();

	const state = {

		version: 0,

		hash: {
			directionalLength: - 1,
			pointLength: - 1,
			spotLength: - 1,
			rectAreaLength: - 1,
			hemiLength: - 1,

			numDirectionalShadows: - 1,
			numPointShadows: - 1,
			numSpotShadows: - 1,
			numSpotMaps: - 1,

			numLightProbes: - 1
		},

		ambient: [0, 0, 0],
		probe: [],

		directional: [],
		directionalShadow: [],
		directionalShadowMap: [],
		directionalShadowMatrix: [],

		spot: [],
		spotLightMap: [],
		spotShadow: [],
		spotShadowMap: [],
		spotLightMatrix: [],

		rectArea: [],
		rectAreaLTC1: null,
		rectAreaLTC2: null,

		point: [],
		pointShadow: [],
		pointShadowMap: [],
		pointShadowMatrix: [],

		hemi: [],
		numSpotLightShadowsWithMaps: 0,
		numLightProbes: 0

	};

	for (let i = 0; i < 9; i++) state.probe.push(new Vector3());

	const vector3 = new Vector3();
	const matrix4 = new Matrix4();
	const matrix42 = new Matrix4();

	function setup(lights) {

		let r = 0, g = 0, b = 0;

		for (let i = 0; i < 9; i++) state.probe[i].set(0, 0, 0);

		let directionalLength = 0;
		let pointLength = 0;
		let spotLength = 0;
		let rectAreaLength = 0;
		let hemiLength = 0;

		let numDirectionalShadows = 0;
		let numPointShadows = 0;
		let numSpotShadows = 0;
		let numSpotMaps = 0;
		let numSpotShadowsWithMaps = 0;

		let numLightProbes = 0;

		// ordering : [shadow casting + map texturing, map texturing, shadow casting, none ]
		lights.sort(shadowCastingAndTexturingLightsFirst);
		// 统计不同光源的数量，并给uniforms或者shadowUniforms赋值
		for (let i = 0, l = lights.length; i < l; i++) {
			const light = lights[i];
			const color = light.color;
			const intensity = light.intensity;
			const distance = light.distance;
			const shadowMap = (light.shadow && light.shadow.map) ? light.shadow.map.texture : null;
			// 判断光源类型
			if (light.isAmbientLight) {

				r += color.r * intensity;
				g += color.g * intensity;
				b += color.b * intensity;

			} else if (light.isLightProbe) {

				for (let j = 0; j < 9; j++) {
					state.probe[j].addScaledVector(light.sh.coefficients[j], intensity);
				}
				numLightProbes++;

			} else if (light.isDirectionalLight) {

				const uniforms = cache.get(light);

				uniforms.color.copy(light.color).multiplyScalar(light.intensity);
				// 是否产生光照
				if (light.castShadow) {

					const shadow = light.shadow;

					const shadowUniforms = shadowCache.get(light);

					shadowUniforms.shadowIntensity = shadow.intensity;
					shadowUniforms.shadowBias = shadow.bias;
					shadowUniforms.shadowNormalBias = shadow.normalBias;
					shadowUniforms.shadowRadius = shadow.radius;
					shadowUniforms.shadowMapSize = shadow.mapSize;

					state.directionalShadow[directionalLength] = shadowUniforms;
					state.directionalShadowMap[directionalLength] = shadowMap;
					state.directionalShadowMatrix[directionalLength] = light.shadow.matrix;

					numDirectionalShadows++;

				}

				state.directional[directionalLength] = uniforms;

				directionalLength++;

			} else if (light.isSpotLight) {

				const uniforms = cache.get(light);

				uniforms.position.setFromMatrixPosition(light.matrixWorld);

				uniforms.color.copy(color).multiplyScalar(intensity);
				uniforms.distance = distance;

				uniforms.coneCos = Math.cos(light.angle);
				uniforms.penumbraCos = Math.cos(light.angle * (1 - light.penumbra));
				uniforms.decay = light.decay;

				state.spot[spotLength] = uniforms;

				const shadow = light.shadow;
				//是否有贴图
				if (light.map) {
					state.spotLightMap[numSpotMaps] = light.map;
					numSpotMaps++;
					// make sure the lightMatrix is up to date
					// TODO : do it if required only
					shadow.updateMatrices(light);
					if (light.castShadow) numSpotShadowsWithMaps++;
				}
				state.spotLightMatrix[spotLength] = shadow.matrix;
				// 是否产生光照
				if (light.castShadow) {

					const shadowUniforms = shadowCache.get(light);

					shadowUniforms.shadowIntensity = shadow.intensity;
					shadowUniforms.shadowBias = shadow.bias;
					shadowUniforms.shadowNormalBias = shadow.normalBias;
					shadowUniforms.shadowRadius = shadow.radius;
					shadowUniforms.shadowMapSize = shadow.mapSize;

					state.spotShadow[spotLength] = shadowUniforms;
					state.spotShadowMap[spotLength] = shadowMap;

					numSpotShadows++;

				}

				spotLength++;

			} else if (light.isRectAreaLight) {

				const uniforms = cache.get(light);

				uniforms.color.copy(color).multiplyScalar(intensity);

				uniforms.halfWidth.set(light.width * 0.5, 0.0, 0.0);
				uniforms.halfHeight.set(0.0, light.height * 0.5, 0.0);

				state.rectArea[rectAreaLength] = uniforms;

				rectAreaLength++;

			} else if (light.isPointLight) {

				const uniforms = cache.get(light);

				uniforms.color.copy(light.color).multiplyScalar(light.intensity);
				uniforms.distance = light.distance;
				uniforms.decay = light.decay;
				//是否产生光照
				if (light.castShadow) {

					const shadow = light.shadow;

					const shadowUniforms = shadowCache.get(light);

					shadowUniforms.shadowIntensity = shadow.intensity;
					shadowUniforms.shadowBias = shadow.bias;
					shadowUniforms.shadowNormalBias = shadow.normalBias;
					shadowUniforms.shadowRadius = shadow.radius;
					shadowUniforms.shadowMapSize = shadow.mapSize;
					shadowUniforms.shadowCameraNear = shadow.camera.near;
					shadowUniforms.shadowCameraFar = shadow.camera.far;

					state.pointShadow[pointLength] = shadowUniforms;
					state.pointShadowMap[pointLength] = shadowMap;
					state.pointShadowMatrix[pointLength] = light.shadow.matrix;

					numPointShadows++;

				}

				state.point[pointLength] = uniforms;

				pointLength++;

			} else if (light.isHemisphereLight) {

				const uniforms = cache.get(light);

				uniforms.skyColor.copy(light.color).multiplyScalar(intensity);
				uniforms.groundColor.copy(light.groundColor).multiplyScalar(intensity);

				state.hemi[hemiLength] = uniforms;

				hemiLength++;

			}

		}
		//面光源特殊处理
		if (rectAreaLength > 0) {
			if (extensions.has('OES_texture_float_linear') === true) {
				state.rectAreaLTC1 = UniformsLib.LTC_FLOAT_1;
				state.rectAreaLTC2 = UniformsLib.LTC_FLOAT_2;
			} else {
				state.rectAreaLTC1 = UniformsLib.LTC_HALF_1;
				state.rectAreaLTC2 = UniformsLib.LTC_HALF_2;
			}
		}
		state.ambient[0] = r;
		state.ambient[1] = g;
		state.ambient[2] = b;

		const hash = state.hash;
		// 更新state的值
		if (hash.directionalLength !== directionalLength ||
			hash.pointLength !== pointLength ||
			hash.spotLength !== spotLength ||
			hash.rectAreaLength !== rectAreaLength ||
			hash.hemiLength !== hemiLength ||
			hash.numDirectionalShadows !== numDirectionalShadows ||
			hash.numPointShadows !== numPointShadows ||
			hash.numSpotShadows !== numSpotShadows ||
			hash.numSpotMaps !== numSpotMaps ||
			hash.numLightProbes !== numLightProbes) {

			state.directional.length = directionalLength;
			state.spot.length = spotLength;
			state.rectArea.length = rectAreaLength;
			state.point.length = pointLength;
			state.hemi.length = hemiLength;

			state.directionalShadow.length = numDirectionalShadows;
			state.directionalShadowMap.length = numDirectionalShadows;
			state.pointShadow.length = numPointShadows;
			state.pointShadowMap.length = numPointShadows;
			state.spotShadow.length = numSpotShadows;
			state.spotShadowMap.length = numSpotShadows;
			state.directionalShadowMatrix.length = numDirectionalShadows;
			state.pointShadowMatrix.length = numPointShadows;
			state.spotLightMatrix.length = numSpotShadows + numSpotMaps - numSpotShadowsWithMaps;
			state.spotLightMap.length = numSpotMaps;
			state.numSpotLightShadowsWithMaps = numSpotShadowsWithMaps;
			state.numLightProbes = numLightProbes;

			hash.directionalLength = directionalLength;
			hash.pointLength = pointLength;
			hash.spotLength = spotLength;
			hash.rectAreaLength = rectAreaLength;
			hash.hemiLength = hemiLength;

			hash.numDirectionalShadows = numDirectionalShadows;
			hash.numPointShadows = numPointShadows;
			hash.numSpotShadows = numSpotShadows;
			hash.numSpotMaps = numSpotMaps;

			hash.numLightProbes = numLightProbes;

			state.version = nextVersion++;

		}

	}

	/**
	 * 设置视图中的光源信息
	 *
	 * @param lights 光源数组
	 * @param camera 相机实例
	 * @returns 无返回值
	 */
	function setupView(lights, camera) {
		//统计不同光源的数量
		let directionalLength = 0;
		let pointLength = 0;
		let spotLength = 0;
		let rectAreaLength = 0;
		let hemiLength = 0;
		//视图矩阵 用于后续光源的位置和方向变换
		const viewMatrix = camera.matrixWorldInverse;

		for (let i = 0, l = lights.length; i < l; i++) {

			const light = lights[i];
			//根据光源类型来进行不同的处理
			//方向光源
			if (light.isDirectionalLight) {

				const uniforms = state.directional[directionalLength];

				uniforms.direction.setFromMatrixPosition(light.matrixWorld);
				vector3.setFromMatrixPosition(light.target.matrixWorld);
				uniforms.direction.sub(vector3);
				uniforms.direction.transformDirection(viewMatrix);

				directionalLength++;

			} else if (light.isSpotLight) {

				const uniforms = state.spot[spotLength];

				uniforms.position.setFromMatrixPosition(light.matrixWorld);
				uniforms.position.applyMatrix4(viewMatrix);

				uniforms.direction.setFromMatrixPosition(light.matrixWorld);
				vector3.setFromMatrixPosition(light.target.matrixWorld);
				uniforms.direction.sub(vector3);
				uniforms.direction.transformDirection(viewMatrix);

				spotLength++;

			} else if (light.isRectAreaLight) {

				const uniforms = state.rectArea[rectAreaLength];

				uniforms.position.setFromMatrixPosition(light.matrixWorld);
				uniforms.position.applyMatrix4(viewMatrix);

				// extract local rotation of light to derive width/height half vectors
				matrix42.identity();
				matrix4.copy(light.matrixWorld);
				matrix4.premultiply(viewMatrix);
				matrix42.extractRotation(matrix4);

				uniforms.halfWidth.set(light.width * 0.5, 0.0, 0.0);
				uniforms.halfHeight.set(0.0, light.height * 0.5, 0.0);

				uniforms.halfWidth.applyMatrix4(matrix42);
				uniforms.halfHeight.applyMatrix4(matrix42);

				rectAreaLength++;

			} else if (light.isPointLight) {

				const uniforms = state.point[pointLength];

				uniforms.position.setFromMatrixPosition(light.matrixWorld);
				uniforms.position.applyMatrix4(viewMatrix);

				pointLength++;

			} else if (light.isHemisphereLight) {

				const uniforms = state.hemi[hemiLength];

				uniforms.direction.setFromMatrixPosition(light.matrixWorld);
				uniforms.direction.transformDirection(viewMatrix);

				hemiLength++;

			}

		}

	}

	return {
		setup: setup,
		setupView: setupView,
		state: state
	};

}


export { WebGLLights };
