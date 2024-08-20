import { BackSide, DoubleSide, CubeUVReflectionMapping, ObjectSpaceNormalMap, TangentSpaceNormalMap, NoToneMapping, NormalBlending, LinearSRGBColorSpace, SRGBTransfer } from '../../constants.js';
import { Layers } from '../../core/Layers.js';
import { WebGLProgram } from './WebGLProgram.js';
import { WebGLShaderCache } from './WebGLShaderCache.js';
import { ShaderLib } from '../shaders/ShaderLib.js';
import { UniformsUtils } from '../shaders/UniformsUtils.js';
import { ColorManagement } from '../../math/ColorManagement.js';

function WebGLPrograms(renderer, cubemaps, cubeuvmaps, extensions, capabilities, bindingStates, clipping) {

	const _programLayers = new Layers();
	const _customShaders = new WebGLShaderCache();
	const _activeChannels = new Set();
	const programs = [];

	const logarithmicDepthBuffer = capabilities.logarithmicDepthBuffer;
	const SUPPORTS_VERTEX_TEXTURES = capabilities.vertexTextures;

	let precision = capabilities.precision;
	// 材质编号映射
	const shaderIDs = {
		MeshDepthMaterial: 'depth',
		MeshDistanceMaterial: 'distanceRGBA',
		MeshNormalMaterial: 'normal',
		MeshBasicMaterial: 'basic',
		MeshLambertMaterial: 'lambert',
		MeshPhongMaterial: 'phong',
		MeshToonMaterial: 'toon',
		MeshStandardMaterial: 'physical',
		MeshPhysicalMaterial: 'physical',
		MeshMatcapMaterial: 'matcap',
		LineBasicMaterial: 'basic',
		LineDashedMaterial: 'dashed',
		PointsMaterial: 'points',
		ShadowMaterial: 'shadow',
		SpriteMaterial: 'sprite'
	};

	/**
	 * 获取频道名
	 *
	 * @param value 频道值
	 * @returns 返回频道名
	 */
	function getChannel(value) {

		_activeChannels.add(value);

		if (value === 0) return 'uv';

		return `uv${value}`;

	}
	// 获取对象属性 material和 geometry的属性并返回
	function getParameters(material, lights, shadows, scene, object) {
		const fog = scene.fog;
		const geometry = object.geometry;
		const environment = material.isMeshStandardMaterial ? scene.environment : null;
		const envMap = (material.isMeshStandardMaterial ? cubeuvmaps : cubemaps).get(material.envMap || environment);
		const envMapCubeUVHeight = (!!envMap) && (envMap.mapping === CubeUVReflectionMapping) ? envMap.image.height : null;
		// 根据材质类型获取着色器ID
		const shaderID = shaderIDs[material.type];
		// heuristics to create shader parameters according to lights in the scene
		// (not to blow over maxLights budget)
		if (material.precision !== null) {
			precision = capabilities.getMaxPrecision(material.precision);
			if (precision !== material.precision) {
				console.warn('THREE.WebGLProgram.getParameters:', material.precision, 'not supported, using', precision, 'instead.');
			}
		}
		const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
		const morphTargetsCount = (morphAttribute !== undefined) ? morphAttribute.length : 0;
		let morphTextureStride = 0;
		if (geometry.morphAttributes.position !== undefined) morphTextureStride = 1;
		if (geometry.morphAttributes.normal !== undefined) morphTextureStride = 2;
		if (geometry.morphAttributes.color !== undefined) morphTextureStride = 3;
		let vertexShader, fragmentShader;
		let customVertexShaderID, customFragmentShaderID;
		// 根据shanderID获取对应的着色器数据
		if (shaderID) {
			const shader = ShaderLib[shaderID];
			vertexShader = shader.vertexShader;
			fragmentShader = shader.fragmentShader;
		} else {
			vertexShader = material.vertexShader;
			fragmentShader = material.fragmentShader;
			_customShaders.update(material);
			customVertexShaderID = _customShaders.getVertexShaderID(material);
			customFragmentShaderID = _customShaders.getFragmentShaderID(material);
		}
		const currentRenderTarget = renderer.getRenderTarget();
		const IS_INSTANCEDMESH = object.isInstancedMesh === true;
		const IS_BATCHEDMESH = object.isBatchedMesh === true;
		//  是否有相应的纹理贴图
		const HAS_MAP = !!material.map;
		const HAS_MATCAP = !!material.matcap;
		const HAS_ENVMAP = !!envMap;
		const HAS_AOMAP = !!material.aoMap;
		const HAS_LIGHTMAP = !!material.lightMap;
		const HAS_BUMPMAP = !!material.bumpMap;
		const HAS_NORMALMAP = !!material.normalMap;
		const HAS_DISPLACEMENTMAP = !!material.displacementMap;
		const HAS_EMISSIVEMAP = !!material.emissiveMap;

		const HAS_METALNESSMAP = !!material.metalnessMap;
		const HAS_ROUGHNESSMAP = !!material.roughnessMap;

		const HAS_ANISOTROPY = material.anisotropy > 0;
		const HAS_CLEARCOAT = material.clearcoat > 0;
		const HAS_DISPERSION = material.dispersion > 0;
		const HAS_IRIDESCENCE = material.iridescence > 0;
		const HAS_SHEEN = material.sheen > 0;
		const HAS_TRANSMISSION = material.transmission > 0;

		const HAS_ANISOTROPYMAP = HAS_ANISOTROPY && !!material.anisotropyMap;

		const HAS_CLEARCOATMAP = HAS_CLEARCOAT && !!material.clearcoatMap;
		const HAS_CLEARCOAT_NORMALMAP = HAS_CLEARCOAT && !!material.clearcoatNormalMap;
		const HAS_CLEARCOAT_ROUGHNESSMAP = HAS_CLEARCOAT && !!material.clearcoatRoughnessMap;

		const HAS_IRIDESCENCEMAP = HAS_IRIDESCENCE && !!material.iridescenceMap;
		const HAS_IRIDESCENCE_THICKNESSMAP = HAS_IRIDESCENCE && !!material.iridescenceThicknessMap;

		const HAS_SHEEN_COLORMAP = HAS_SHEEN && !!material.sheenColorMap;
		const HAS_SHEEN_ROUGHNESSMAP = HAS_SHEEN && !!material.sheenRoughnessMap;

		const HAS_SPECULARMAP = !!material.specularMap;
		const HAS_SPECULAR_COLORMAP = !!material.specularColorMap;
		const HAS_SPECULAR_INTENSITYMAP = !!material.specularIntensityMap;

		const HAS_TRANSMISSIONMAP = HAS_TRANSMISSION && !!material.transmissionMap;
		const HAS_THICKNESSMAP = HAS_TRANSMISSION && !!material.thicknessMap;

		const HAS_GRADIENTMAP = !!material.gradientMap;

		const HAS_ALPHAMAP = !!material.alphaMap;

		const HAS_ALPHATEST = material.alphaTest > 0;

		const HAS_ALPHAHASH = !!material.alphaHash;

		const HAS_EXTENSIONS = !!material.extensions;

		let toneMapping = NoToneMapping;

		if (material.toneMapped) {

			if (currentRenderTarget === null || currentRenderTarget.isXRRenderTarget === true) {

				toneMapping = renderer.toneMapping;

			}

		}

		const parameters = {

			shaderID: shaderID,
			shaderType: material.type,
			shaderName: material.name,

			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
			defines: material.defines,

			customVertexShaderID: customVertexShaderID,
			customFragmentShaderID: customFragmentShaderID,

			isRawShaderMaterial: material.isRawShaderMaterial === true,
			glslVersion: material.glslVersion,

			precision: precision,

			batching: IS_BATCHEDMESH,
			batchingColor: IS_BATCHEDMESH && object._colorsTexture !== null,
			instancing: IS_INSTANCEDMESH,
			instancingColor: IS_INSTANCEDMESH && object.instanceColor !== null,
			instancingMorph: IS_INSTANCEDMESH && object.morphTexture !== null,

			supportsVertexTextures: SUPPORTS_VERTEX_TEXTURES,
			outputColorSpace: (currentRenderTarget === null) ? renderer.outputColorSpace : (currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : LinearSRGBColorSpace),
			alphaToCoverage: !!material.alphaToCoverage,

			map: HAS_MAP,
			matcap: HAS_MATCAP,
			envMap: HAS_ENVMAP,
			envMapMode: HAS_ENVMAP && envMap.mapping,
			envMapCubeUVHeight: envMapCubeUVHeight,
			aoMap: HAS_AOMAP,
			lightMap: HAS_LIGHTMAP,
			bumpMap: HAS_BUMPMAP,
			normalMap: HAS_NORMALMAP,
			displacementMap: SUPPORTS_VERTEX_TEXTURES && HAS_DISPLACEMENTMAP,
			emissiveMap: HAS_EMISSIVEMAP,

			normalMapObjectSpace: HAS_NORMALMAP && material.normalMapType === ObjectSpaceNormalMap,
			normalMapTangentSpace: HAS_NORMALMAP && material.normalMapType === TangentSpaceNormalMap,

			metalnessMap: HAS_METALNESSMAP,
			roughnessMap: HAS_ROUGHNESSMAP,

			anisotropy: HAS_ANISOTROPY,
			anisotropyMap: HAS_ANISOTROPYMAP,

			clearcoat: HAS_CLEARCOAT,
			clearcoatMap: HAS_CLEARCOATMAP,
			clearcoatNormalMap: HAS_CLEARCOAT_NORMALMAP,
			clearcoatRoughnessMap: HAS_CLEARCOAT_ROUGHNESSMAP,

			dispersion: HAS_DISPERSION,

			iridescence: HAS_IRIDESCENCE,
			iridescenceMap: HAS_IRIDESCENCEMAP,
			iridescenceThicknessMap: HAS_IRIDESCENCE_THICKNESSMAP,

			sheen: HAS_SHEEN,
			sheenColorMap: HAS_SHEEN_COLORMAP,
			sheenRoughnessMap: HAS_SHEEN_ROUGHNESSMAP,

			specularMap: HAS_SPECULARMAP,
			specularColorMap: HAS_SPECULAR_COLORMAP,
			specularIntensityMap: HAS_SPECULAR_INTENSITYMAP,

			transmission: HAS_TRANSMISSION,
			transmissionMap: HAS_TRANSMISSIONMAP,
			thicknessMap: HAS_THICKNESSMAP,

			gradientMap: HAS_GRADIENTMAP,

			opaque: material.transparent === false && material.blending === NormalBlending && material.alphaToCoverage === false,

			alphaMap: HAS_ALPHAMAP,
			alphaTest: HAS_ALPHATEST,
			alphaHash: HAS_ALPHAHASH,

			combine: material.combine,

			//

			mapUv: HAS_MAP && getChannel(material.map.channel),
			aoMapUv: HAS_AOMAP && getChannel(material.aoMap.channel),
			lightMapUv: HAS_LIGHTMAP && getChannel(material.lightMap.channel),
			bumpMapUv: HAS_BUMPMAP && getChannel(material.bumpMap.channel),
			normalMapUv: HAS_NORMALMAP && getChannel(material.normalMap.channel),
			displacementMapUv: HAS_DISPLACEMENTMAP && getChannel(material.displacementMap.channel),
			emissiveMapUv: HAS_EMISSIVEMAP && getChannel(material.emissiveMap.channel),

			metalnessMapUv: HAS_METALNESSMAP && getChannel(material.metalnessMap.channel),
			roughnessMapUv: HAS_ROUGHNESSMAP && getChannel(material.roughnessMap.channel),

			anisotropyMapUv: HAS_ANISOTROPYMAP && getChannel(material.anisotropyMap.channel),

			clearcoatMapUv: HAS_CLEARCOATMAP && getChannel(material.clearcoatMap.channel),
			clearcoatNormalMapUv: HAS_CLEARCOAT_NORMALMAP && getChannel(material.clearcoatNormalMap.channel),
			clearcoatRoughnessMapUv: HAS_CLEARCOAT_ROUGHNESSMAP && getChannel(material.clearcoatRoughnessMap.channel),

			iridescenceMapUv: HAS_IRIDESCENCEMAP && getChannel(material.iridescenceMap.channel),
			iridescenceThicknessMapUv: HAS_IRIDESCENCE_THICKNESSMAP && getChannel(material.iridescenceThicknessMap.channel),

			sheenColorMapUv: HAS_SHEEN_COLORMAP && getChannel(material.sheenColorMap.channel),
			sheenRoughnessMapUv: HAS_SHEEN_ROUGHNESSMAP && getChannel(material.sheenRoughnessMap.channel),

			specularMapUv: HAS_SPECULARMAP && getChannel(material.specularMap.channel),
			specularColorMapUv: HAS_SPECULAR_COLORMAP && getChannel(material.specularColorMap.channel),
			specularIntensityMapUv: HAS_SPECULAR_INTENSITYMAP && getChannel(material.specularIntensityMap.channel),

			transmissionMapUv: HAS_TRANSMISSIONMAP && getChannel(material.transmissionMap.channel),
			thicknessMapUv: HAS_THICKNESSMAP && getChannel(material.thicknessMap.channel),

			alphaMapUv: HAS_ALPHAMAP && getChannel(material.alphaMap.channel),

			//

			vertexTangents: !!geometry.attributes.tangent && (HAS_NORMALMAP || HAS_ANISOTROPY),
			vertexColors: material.vertexColors,
			vertexAlphas: material.vertexColors === true && !!geometry.attributes.color && geometry.attributes.color.itemSize === 4,

			pointsUvs: object.isPoints === true && !!geometry.attributes.uv && (HAS_MAP || HAS_ALPHAMAP),

			fog: !!fog,
			useFog: material.fog === true,
			fogExp2: (!!fog && fog.isFogExp2),

			flatShading: material.flatShading === true,

			sizeAttenuation: material.sizeAttenuation === true,
			logarithmicDepthBuffer: logarithmicDepthBuffer,

			skinning: object.isSkinnedMesh === true,

			morphTargets: geometry.morphAttributes.position !== undefined,
			morphNormals: geometry.morphAttributes.normal !== undefined,
			morphColors: geometry.morphAttributes.color !== undefined,
			morphTargetsCount: morphTargetsCount,
			morphTextureStride: morphTextureStride,

			numDirLights: lights.directional.length,
			numPointLights: lights.point.length,
			numSpotLights: lights.spot.length,
			numSpotLightMaps: lights.spotLightMap.length,
			numRectAreaLights: lights.rectArea.length,
			numHemiLights: lights.hemi.length,

			numDirLightShadows: lights.directionalShadowMap.length,
			numPointLightShadows: lights.pointShadowMap.length,
			numSpotLightShadows: lights.spotShadowMap.length,
			numSpotLightShadowsWithMaps: lights.numSpotLightShadowsWithMaps,

			numLightProbes: lights.numLightProbes,

			numClippingPlanes: clipping.numPlanes,
			numClipIntersection: clipping.numIntersection,

			dithering: material.dithering,

			shadowMapEnabled: renderer.shadowMap.enabled && shadows.length > 0,
			shadowMapType: renderer.shadowMap.type,

			toneMapping: toneMapping,

			decodeVideoTexture: HAS_MAP && (material.map.isVideoTexture === true) && (ColorManagement.getTransfer(material.map.colorSpace) === SRGBTransfer),

			premultipliedAlpha: material.premultipliedAlpha,

			doubleSided: material.side === DoubleSide,
			flipSided: material.side === BackSide,

			useDepthPacking: material.depthPacking >= 0,
			depthPacking: material.depthPacking || 0,

			index0AttributeName: material.index0AttributeName,

			extensionClipCullDistance: HAS_EXTENSIONS && material.extensions.clipCullDistance === true && extensions.has('WEBGL_clip_cull_distance'),
			extensionMultiDraw: (HAS_EXTENSIONS && material.extensions.multiDraw === true || IS_BATCHEDMESH) && extensions.has('WEBGL_multi_draw'),

			rendererExtensionParallelShaderCompile: extensions.has('KHR_parallel_shader_compile'),

			customProgramCacheKey: material.customProgramCacheKey()

		};

		// the usage of getChannel() determines the active texture channels for this shader

		parameters.vertexUv1s = _activeChannels.has(1);
		parameters.vertexUv2s = _activeChannels.has(2);
		parameters.vertexUv3s = _activeChannels.has(3);

		_activeChannels.clear();

		return parameters;

	}

	/**
	 * 获取程序缓存键
	 *
	 * @param parameters 参数对象
	 * @param parameters.shaderID 着色器ID
	 * @param parameters.customVertexShaderID 自定义顶点着色器ID
	 * @param parameters.customFragmentShaderID 自定义片元着色器ID
	 * @param parameters.defines 定义参数对象
	 * @param parameters.defines.name 定义参数名称
	 * @param parameters.defines.name 定义参数值
	 * @param parameters.isRawShaderMaterial 是否为原始着色器材质
	 * @param parameters.customProgramCacheKey 自定义程序缓存键
	 * @returns 字符串类型，程序缓存键
	 */
	function getProgramCacheKey(parameters) {
		// 创建一个空数组
		const array = [];
		// 如果参数中包含 shaderID
		if (parameters.shaderID) {
			// 将 shaderID 添加到数组中
			array.push(parameters.shaderID);
			// 否则
		} else {
			// 将 customVertexShaderID 添加到数组中
			array.push(parameters.customVertexShaderID);
			// 将 customFragmentShaderID 添加到数组中
			array.push(parameters.customFragmentShaderID);
		}
		// 如果参数中包含 defines
		if (parameters.defines !== undefined) {

			// 遍历 defines 对象
			for (const name in parameters.defines) {

				// 将 define 的名称添加到数组中
				array.push(name);
				// 将 define 的值添加到数组中
				array.push(parameters.defines[name]);

			}

		}

		// 如果参数 isRawShaderMaterial 为 false
		if (parameters.isRawShaderMaterial === false) {

			// 调用 getProgramCacheKeyParameters 函数，并将数组和参数作为参数传递
			getProgramCacheKeyParameters(array, parameters);
			// 调用 getProgramCacheKeyBooleans 函数，并将数组和参数作为参数传递
			getProgramCacheKeyBooleans(array, parameters);
			// 将 renderer 的 outputColorSpace 添加到数组中
			array.push(renderer.outputColorSpace);

		}

		// 将 customProgramCacheKey 添加到数组中
		array.push(parameters.customProgramCacheKey);

		// 将数组中的元素拼接成字符串并返回
		return array.join();

	}

	/**
	 * 获取程序缓存键参数
	 *
	 * @param array 数组，用于存储参数
	 * @param parameters 参数对象，包含各种参数
	 * @returns 无返回值
	 */
	function getProgramCacheKeyParameters(array, parameters) {

		array.push(parameters.precision);
		array.push(parameters.outputColorSpace);
		array.push(parameters.envMapMode);
		array.push(parameters.envMapCubeUVHeight);
		array.push(parameters.mapUv);
		array.push(parameters.alphaMapUv);
		array.push(parameters.lightMapUv);
		array.push(parameters.aoMapUv);
		array.push(parameters.bumpMapUv);
		array.push(parameters.normalMapUv);
		array.push(parameters.displacementMapUv);
		array.push(parameters.emissiveMapUv);
		array.push(parameters.metalnessMapUv);
		array.push(parameters.roughnessMapUv);
		array.push(parameters.anisotropyMapUv);
		array.push(parameters.clearcoatMapUv);
		array.push(parameters.clearcoatNormalMapUv);
		array.push(parameters.clearcoatRoughnessMapUv);
		array.push(parameters.iridescenceMapUv);
		array.push(parameters.iridescenceThicknessMapUv);
		array.push(parameters.sheenColorMapUv);
		array.push(parameters.sheenRoughnessMapUv);
		array.push(parameters.specularMapUv);
		array.push(parameters.specularColorMapUv);
		array.push(parameters.specularIntensityMapUv);
		array.push(parameters.transmissionMapUv);
		array.push(parameters.thicknessMapUv);
		array.push(parameters.combine);
		array.push(parameters.fogExp2);
		array.push(parameters.sizeAttenuation);
		array.push(parameters.morphTargetsCount);
		array.push(parameters.morphAttributeCount);
		array.push(parameters.numDirLights);
		array.push(parameters.numPointLights);
		array.push(parameters.numSpotLights);
		array.push(parameters.numSpotLightMaps);
		array.push(parameters.numHemiLights);
		array.push(parameters.numRectAreaLights);
		array.push(parameters.numDirLightShadows);
		array.push(parameters.numPointLightShadows);
		array.push(parameters.numSpotLightShadows);
		array.push(parameters.numSpotLightShadowsWithMaps);
		array.push(parameters.numLightProbes);
		array.push(parameters.shadowMapType);
		array.push(parameters.toneMapping);
		array.push(parameters.numClippingPlanes);
		array.push(parameters.numClipIntersection);
		array.push(parameters.depthPacking);

	}

	/**
	 * 根据给定的参数数组，获取程序缓存键布尔值。
	 *
	 * @param array 数组，用于存储程序缓存键布尔值。
	 * @param parameters 参数对象，包含不同的属性，用于确定哪些程序层需要启用。
	 * @returns 无返回值，将结果直接存入数组参数中。
	 */
	function getProgramCacheKeyBooleans(array, parameters) {

		_programLayers.disableAll();

		if (parameters.supportsVertexTextures)
			_programLayers.enable(0);
		if (parameters.instancing)
			_programLayers.enable(1);
		if (parameters.instancingColor)
			_programLayers.enable(2);
		if (parameters.instancingMorph)
			_programLayers.enable(3);
		if (parameters.matcap)
			_programLayers.enable(4);
		if (parameters.envMap)
			_programLayers.enable(5);
		if (parameters.normalMapObjectSpace)
			_programLayers.enable(6);
		if (parameters.normalMapTangentSpace)
			_programLayers.enable(7);
		if (parameters.clearcoat)
			_programLayers.enable(8);
		if (parameters.iridescence)
			_programLayers.enable(9);
		if (parameters.alphaTest)
			_programLayers.enable(10);
		if (parameters.vertexColors)
			_programLayers.enable(11);
		if (parameters.vertexAlphas)
			_programLayers.enable(12);
		if (parameters.vertexUv1s)
			_programLayers.enable(13);
		if (parameters.vertexUv2s)
			_programLayers.enable(14);
		if (parameters.vertexUv3s)
			_programLayers.enable(15);
		if (parameters.vertexTangents)
			_programLayers.enable(16);
		if (parameters.anisotropy)
			_programLayers.enable(17);
		if (parameters.alphaHash)
			_programLayers.enable(18);
		if (parameters.batching)
			_programLayers.enable(19);
		if (parameters.dispersion)
			_programLayers.enable(20);
		if (parameters.batchingColor)
			_programLayers.enable(21);

		array.push(_programLayers.mask);
		_programLayers.disableAll();

		if (parameters.fog)
			_programLayers.enable(0);
		if (parameters.useFog)
			_programLayers.enable(1);
		if (parameters.flatShading)
			_programLayers.enable(2);
		if (parameters.logarithmicDepthBuffer)
			_programLayers.enable(3);
		if (parameters.skinning)
			_programLayers.enable(4);
		if (parameters.morphTargets)
			_programLayers.enable(5);
		if (parameters.morphNormals)
			_programLayers.enable(6);
		if (parameters.morphColors)
			_programLayers.enable(7);
		if (parameters.premultipliedAlpha)
			_programLayers.enable(8);
		if (parameters.shadowMapEnabled)
			_programLayers.enable(9);
		if (parameters.doubleSided)
			_programLayers.enable(10);
		if (parameters.flipSided)
			_programLayers.enable(11);
		if (parameters.useDepthPacking)
			_programLayers.enable(12);
		if (parameters.dithering)
			_programLayers.enable(13);
		if (parameters.transmission)
			_programLayers.enable(14);
		if (parameters.sheen)
			_programLayers.enable(15);
		if (parameters.opaque)
			_programLayers.enable(16);
		if (parameters.pointsUvs)
			_programLayers.enable(17);
		if (parameters.decodeVideoTexture)
			_programLayers.enable(18);
		if (parameters.alphaToCoverage)
			_programLayers.enable(19);

		array.push(_programLayers.mask);

	}

	/**
	 * 获取材质的统一变量
	 *
	 * @param material 材质对象
	 * @returns 返回统一变量对象
	 */
	function getUniforms(material) {
		// 根据材质类型获取着色器ID
		const shaderID = shaderIDs[material.type];
		let uniforms;
		// 如果着色器ID存在
		if (shaderID) {
			// 根据着色器ID获取着色器对象
			const shader = ShaderLib[shaderID];
			// 克隆着色器的uniforms对象
			uniforms = UniformsUtils.clone(shader.uniforms);
			// 如果着色器ID不存在
		} else {
			// 直接使用材质的uniforms对象
			uniforms = material.uniforms;
		}
		// 返回uniforms对象
		return uniforms;
	}
	/**
	 * 获取程序对象
	 *
	 * @param parameters 参数对象
	 * @param cacheKey 缓存键
	 * @returns 返回程序对象
	 */
	function acquireProgram(parameters, cacheKey) {
		let program;
		// 检查是否已经编译过代码
		// Check if code has been already compiled
		for (let p = 0, pl = programs.length; p < pl; p++) {
			const preexistingProgram = programs[p];
			// 如果已存在的程序的缓存键与传入的缓存键相同
			if (preexistingProgram.cacheKey === cacheKey) {
				// 将已存在的程序赋值给 program
				program = preexistingProgram;
				// 增加已存在程序的使用次数
				++program.usedTimes;
				// 跳出循环
				break;
			}
		}
		// 如果 program 仍然为 undefined，说明没有已存在的程序
		if (program === undefined) {
			// 创建一个新的 WebGLProgram 对象，并将其赋值给 program
			program = new WebGLProgram(renderer, cacheKey, parameters, bindingStates);
			// 将新创建的 program 添加到 programs 数组中
			programs.push(program);
		}
		// 返回 program
		return program;
	}
	/**
	 * 释放程序资源
	 *
	 * @param program 要释放的程序资源
	 * @returns 无返回值
	 */
	function releaseProgram(program) {
		if (--program.usedTimes === 0) {
			// Remove from unordered set
			const i = programs.indexOf(program);
			// 删除第i个，将最后位置的移到i位置
			programs[i] = programs[programs.length - 1];
			programs.pop();
			// Free WebGL resources
			program.destroy();
		}
	}

	/**
	 * 释放着色器缓存
	 *
	 * @param material 要释放缓存的材质对象
	 */
	function releaseShaderCache(material) {
		_customShaders.remove(material);
	}

	function dispose() {
		_customShaders.dispose();
	}

	return {
		getParameters: getParameters,
		getProgramCacheKey: getProgramCacheKey,
		getUniforms: getUniforms,
		acquireProgram: acquireProgram,
		releaseProgram: releaseProgram,
		releaseShaderCache: releaseShaderCache,
		// Exposed for resource monitoring & error feedback via renderer.info:
		programs: programs,
		dispose: dispose
	};

}

export { WebGLPrograms };
