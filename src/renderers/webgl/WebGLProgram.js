import { WebGLUniforms } from './WebGLUniforms.js';
import { WebGLShader } from './WebGLShader.js';
import { ShaderChunk } from '../shaders/ShaderChunk.js';
import { NoToneMapping, AddOperation, MixOperation, MultiplyOperation, CubeRefractionMapping, CubeUVReflectionMapping, CubeReflectionMapping, PCFSoftShadowMap, PCFShadowMap, VSMShadowMap, AgXToneMapping, ACESFilmicToneMapping, NeutralToneMapping, CineonToneMapping, CustomToneMapping, ReinhardToneMapping, LinearToneMapping, GLSL3, LinearSRGBColorSpace, SRGBColorSpace, LinearDisplayP3ColorSpace, DisplayP3ColorSpace, P3Primaries, Rec709Primaries } from '../../constants.js';
import { ColorManagement } from '../../math/ColorManagement.js';

// From https://www.khronos.org/registry/webgl/extensions/KHR_parallel_shader_compile/
const COMPLETION_STATUS_KHR = 0x91B1;

let programIdCount = 0;

/**
 * @description
 * 处理源代码，返回一个包含错误行及周围6行的字符串数组。
 * 如果错误行在第7行以外，则从第7行开始；如果错误行在第-6行之前，则从第0行开始。
 *
 * @param {string} string 需要处理的源代码字符串，每行以'\n'分隔。
 * @param {number} errorLine 错误发生的行号，从1开始计算。
 *
 * @returns {string[]} 返回一个包含错误行及周围6行的字符串数组，每行以'\n'分隔。
 */
function handleSource( string, errorLine ) {

	const lines = string.split( '\n' );
	const lines2 = [];

	const from = Math.max( errorLine - 6, 0 );
	const to = Math.min( errorLine + 6, lines.length );

	for ( let i = from; i < to; i ++ ) {

		const line = i + 1;
		lines2.push( `${line === errorLine ? '>' : ' '} ${line}: ${lines[ i ]}` );

	}

	return lines2.join( '\n' );

}

function getEncodingComponents( colorSpace ) {

	const workingPrimaries = ColorManagement.getPrimaries( ColorManagement.workingColorSpace );
	const encodingPrimaries = ColorManagement.getPrimaries( colorSpace );

	let gamutMapping;

	if ( workingPrimaries === encodingPrimaries ) {

		gamutMapping = '';

	} else if ( workingPrimaries === P3Primaries && encodingPrimaries === Rec709Primaries ) {

		gamutMapping = 'LinearDisplayP3ToLinearSRGB';

	} else if ( workingPrimaries === Rec709Primaries && encodingPrimaries === P3Primaries ) {

		gamutMapping = 'LinearSRGBToLinearDisplayP3';

	}

	switch ( colorSpace ) {

		case LinearSRGBColorSpace:
		case LinearDisplayP3ColorSpace:
			return [ gamutMapping, 'LinearTransferOETF' ];

		case SRGBColorSpace:
		case DisplayP3ColorSpace:
			return [ gamutMapping, 'sRGBTransferOETF' ];

		default:
			console.warn( 'THREE.WebGLProgram: Unsupported color space:', colorSpace );
			return [ gamutMapping, 'LinearTransferOETF' ];

	}

}

/**
 * 获取着色器编译错误
 *
 * @param gl WebGL上下文
 * @param shader 着色器对象
 * @param type 着色器类型（顶点着色器或片元着色器）
 * @returns 返回编译错误信息，如果编译成功则返回空字符串
 */
function getShaderErrors( gl, shader, type ) {

	const status = gl.getShaderParameter( shader, gl.COMPILE_STATUS );
	const errors = gl.getShaderInfoLog( shader ).trim();

	if ( status && errors === '' ) return '';

	const errorMatches = /ERROR: 0:(\d+)/.exec( errors );
	if ( errorMatches ) {

		// --enable-privileged-webgl-extension
		// console.log( '**' + type + '**', gl.getExtension( 'WEBGL_debug_shaders' ).getTranslatedShaderSource( shader ) );

		const errorLine = parseInt( errorMatches[ 1 ] );
		return type.toUpperCase() + '\n\n' + errors + '\n\n' + handleSource( gl.getShaderSource( shader ), errorLine );

	} else {

		return errors;

	}

}

/**
 * @description
 * 获取纹理编码函数，返回一个字符串。该函数名为 functionName，参数为 value，返回值为经过指定颜色空间的编码后的 vec4 类型值。
 *
 * @param {string} functionName - 函数名，必填项，类型为 string。
 * @param {string} colorSpace - 颜色空间，必填项，类型为 string，可选值包括 'sRGB'、'linear'、'gamma'。
 *
 * @returns {string} 返回一个字符串，表示纹理编码函数的代码。
 */
function getTexelEncodingFunction( functionName, colorSpace ) {

	const components = getEncodingComponents( colorSpace );
	return `vec4 ${functionName}( vec4 value ) { return ${components[ 0 ]}( ${components[ 1 ]}( value ) ); }`;

}

/**
 * @description
 * 获取色调映射函数，根据不同的色调映射方式返回对应的函数名称。
 *
 * @param {string} functionName - 函数名称，字符串类型，必需参数。
 * @param {number} toneMapping - 色调映射方式，数值类型，可选参数，默认为 LinearToneMapping。
 * @returns {string} 返回一个字符串类型，包含色调映射函数的代码片段。
 */
function getToneMappingFunction( functionName, toneMapping ) {

	let toneMappingName;

	switch ( toneMapping ) {

		case LinearToneMapping:
			toneMappingName = 'Linear';
			break;

		case ReinhardToneMapping:
			toneMappingName = 'Reinhard';
			break;

		case CineonToneMapping:
			toneMappingName = 'OptimizedCineon';
			break;

		case ACESFilmicToneMapping:
			toneMappingName = 'ACESFilmic';
			break;

		case AgXToneMapping:
			toneMappingName = 'AgX';
			break;

		case NeutralToneMapping:
			toneMappingName = 'Neutral';
			break;

		case CustomToneMapping:
			toneMappingName = 'Custom';
			break;

		default:
			console.warn( 'THREE.WebGLProgram: Unsupported toneMapping:', toneMapping );
			toneMappingName = 'Linear';

	}

	return 'vec3 ' + functionName + '( vec3 color ) { return ' + toneMappingName + 'ToneMapping( color ); }';

}

/**
 * 生成顶点扩展代码
 *
 * @param parameters 参数对象
 * @param parameters.extensionClipCullDistance 是否启用 GL_ANGLE_clip_cull_distance 扩展
 * @param parameters.extensionMultiDraw 是否启用 GL_ANGLE_multi_draw 扩展
 * @returns 生成的顶点扩展代码字符串
 */
function generateVertexExtensions( parameters ) {

	const chunks = [
		parameters.extensionClipCullDistance ? '#extension GL_ANGLE_clip_cull_distance : require' : '',
		parameters.extensionMultiDraw ? '#extension GL_ANGLE_multi_draw : require' : '',
	];

	return chunks.filter( filterEmptyLine ).join( '\n' );

}

/**
 * 生成宏定义字符串
 *
 * @param defines 宏定义对象
 * @returns 返回生成的宏定义字符串
 */
function generateDefines( defines ) {

	const chunks = [];

	for ( const name in defines ) {

		const value = defines[ name ];

		if ( value === false ) continue;

		chunks.push( '#define ' + name + ' ' + value );

	}

	return chunks.join( '\n' );

}

/**
 * @description
 * 获取属性的位置信息，返回一个对象包含所有属性的类型、位置和位置大小。
 *
 * @param {WebGLRenderingContext} gl - WebGLRenderingContext 对象。
 * @param {WebGLProgram} program - WebGLProgram 对象，表示当前使用中的程序。
 *
 * @returns {Object} 返回一个对象，其中包含了所有属性的类型、位置和位置大小。
 * 每个属性都是一个对象，包含以下字段：
 * - type (Number)：属性的类型，可能为 gl.FLOAT、gl.FLOAT_VEC2、gl.FLOAT_VEC3 或 gl.FLOAT_MAT2、gl.FLOAT_MAT3 或 gl.FLOAT_MAT4。
 * - location (Number)：属性在着色器程序中的位置。
 * - locationSize (Number)：属性的位置大小，默认为 1，如果属性是 mat2、mat3 或 mat4，则为 2、3 或 4。
 */
function fetchAttributeLocations( gl, program ) {
	const attributes = {};
	// 获取程序中活动属性的数量
	const n = gl.getProgramParameter( program, gl.ACTIVE_ATTRIBUTES );
	for ( let i = 0; i < n; i ++ ) {
		// 获取活动属性的信息
		const info = gl.getActiveAttrib( program, i );
		// 获取属性名称
		const name = info.name;

		let locationSize = 1;
		// 根据属性类型设置位置大小
		if ( info.type === gl.FLOAT_MAT2 ) locationSize = 2;
		if ( info.type === gl.FLOAT_MAT3 ) locationSize = 3;
		if ( info.type === gl.FLOAT_MAT4 ) locationSize = 4;
		// 将属性信息保存到attributes对象中
		attributes[ name ] = {
			type: info.type,
			// 获取属性的位置
			location: gl.getAttribLocation( program, name ),
			locationSize: locationSize
		};
	}
	// 返回保存了属性信息的对象
	return attributes;
}

/**
 * @description 过滤空行，返回非空字符串
 * @param {string} string 需要过滤的字符串
 * @returns {boolean} 如果字符串不为空则返回true，否则返回false
 */
function filterEmptyLine( string ) {

	return string !== '';

}

/**
 * @description
 * 替换字符串中的光源数量参数，并返回新的字符串。
 *
 * @param {string} string - 需要替换的字符串。
 * @param {Object} parameters - 包含光源数量参数的对象，包括：
 * - numDirLights (number) - 方向光的数量。
 * - numSpotLights (number) - 聚光灯的数量。
 * - numSpotLightMaps (number) - 聚光灯使用的纹理图片的数量。
 * - numSpotLightShadowsWithMaps (number) - 聚光灯使用纹理图片时的阴影数量。
 * - numSpotLightShadows (number) - 聚光灯不使用纹理图片时的阴影数量。
 * - numRectAreaLights (number) - 矩形区域光的数量。
 * - numPointLights (number) - 点光源的数量。
 * - numHemiLights (number) - 半球光的数量。
 * - numDirLightShadows (number) - 方向光的阴影数量。
 * - numPointLightShadows (number) - 点光源的阴影数量。
 *
 * @returns {string} 返回一个新的字符串，其中包含了替换后的光源数量参数。
 */
function replaceLightNums( string, parameters ) {

	const numSpotLightCoords = parameters.numSpotLightShadows + parameters.numSpotLightMaps - parameters.numSpotLightShadowsWithMaps;

	return string
		.replace( /NUM_DIR_LIGHTS/g, parameters.numDirLights )
		.replace( /NUM_SPOT_LIGHTS/g, parameters.numSpotLights )
		.replace( /NUM_SPOT_LIGHT_MAPS/g, parameters.numSpotLightMaps )
		.replace( /NUM_SPOT_LIGHT_COORDS/g, numSpotLightCoords )
		.replace( /NUM_RECT_AREA_LIGHTS/g, parameters.numRectAreaLights )
		.replace( /NUM_POINT_LIGHTS/g, parameters.numPointLights )
		.replace( /NUM_HEMI_LIGHTS/g, parameters.numHemiLights )
		.replace( /NUM_DIR_LIGHT_SHADOWS/g, parameters.numDirLightShadows )
		.replace( /NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, parameters.numSpotLightShadowsWithMaps )
		.replace( /NUM_SPOT_LIGHT_SHADOWS/g, parameters.numSpotLightShadows )
		.replace( /NUM_POINT_LIGHT_SHADOWS/g, parameters.numPointLightShadows );

}

/**
 * @description
 * 替换字符串中的剪切平面数量，并返回新的字符串。
 *
 * @param {string} string - 需要替换的字符串，包含剪切平面数量的占位符（NUM_CLIPPING_PLANES和UNION_CLIPPING_PLANES）。
 * @param {Object} parameters - 包含剪切平面数量和剪切平面交集数量的对象，格式为{ numClippingPlanes: number, numClipIntersection: number }。
 * @param {number} parameters.numClippingPlanes - 剪切平面数量。
 * @param {number} parameters.numClipIntersection - 剪切平面交集数量。
 *
 * @returns {string} 返回一个新的字符串，其中剪切平面数量和剪切平面交集数量已经被替换。
 */
function replaceClippingPlaneNums( string, parameters ) {

	return string
		.replace( /NUM_CLIPPING_PLANES/g, parameters.numClippingPlanes )
		.replace( /UNION_CLIPPING_PLANES/g, ( parameters.numClippingPlanes - parameters.numClipIntersection ) );

}

// Resolve Includes

const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm;

/**
 * @description
 * 解析包含的内容，将所有的include标记替换为对应的内容。
 *
 * @param {string} string - 需要解析的字符串，包含include标记。
 * @returns {string} 返回已经解析过include标记的字符串。
 */
function resolveIncludes( string ) {

	return string.replace( includePattern, includeReplacer );

}

const shaderChunkMap = new Map();

/**
 * @description
 * 用于替换包含的字符串，返回解析后的字符串。
 * 如果包含的字符串在ShaderChunk中不存在，则会从shaderChunkMap中获取新的包含名称，并进行相应的处理。
 * 如果新的包含名称不存在，将抛出一个错误。
 *
 * @param {string} match 需要替换的字符串，包含了包含名称，格式为#include <includeName>
 * @param {string} include 包含名称，来自match参数
 * @returns {string} 返回解析后的字符串，包含了包含内容
 * @throws {Error} 当新的包含名称不存在时，将抛出一个错误
 */
function includeReplacer( match, include ) {

	let string = ShaderChunk[ include ];

	if ( string === undefined ) {

		const newInclude = shaderChunkMap.get( include );

		if ( newInclude !== undefined ) {

			string = ShaderChunk[ newInclude ];
			console.warn( 'THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.', include, newInclude );

		} else {

			throw new Error( 'Can not resolve #include <' + include + '>' );

		}

	}

	return resolveIncludes( string );

}

// Unroll Loops

const unrollLoopPattern = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;

/**
 * 展开循环
 *
 * @param string 要处理的字符串
 * @returns 展开循环后的字符串
 */
function unrollLoops( string ) {

	return string.replace( unrollLoopPattern, loopReplacer );

}

/**
 * @description
 * 用于替换循环语法的函数，将循环内容进行重复替换。
 *
 * @param {string} match 匹配到的字符串，包含循环语法
 * @param {number} start 开始索引值，表示需要从哪个位置开始进行循环
 * @param {number} end 结束索引值，表示需要到哪个位置结束循环
 * @param {string} snippet 循环体内容，包含可能需要被替换的变量i
 *
 * @returns {string} 返回一个字符串，包含了循环后的结果
 */
function loopReplacer( match, start, end, snippet ) {

	let string = '';

	for ( let i = parseInt( start ); i < parseInt( end ); i ++ ) {

		string += snippet
			.replace( /\[\s*i\s*\]/g, '[ ' + i + ' ]' )
			.replace( /UNROLLED_LOOP_INDEX/g, i );

	}

	return string;

}

/**
 * 生成精度定义字符串
 *
 * @param parameters 精度参数对象
 * @param parameters.precision 精度等级，可选值为'highp'、'mediump'、'lowp'
 * @returns 生成的精度定义字符串
 */

function generatePrecision( parameters ) {

	let precisionstring = `precision ${parameters.precision} float;
	precision ${parameters.precision} int;
	precision ${parameters.precision} sampler2D;
	precision ${parameters.precision} samplerCube;
	precision ${parameters.precision} sampler3D;
	precision ${parameters.precision} sampler2DArray;
	precision ${parameters.precision} sampler2DShadow;
	precision ${parameters.precision} samplerCubeShadow;
	precision ${parameters.precision} sampler2DArrayShadow;
	precision ${parameters.precision} isampler2D;
	precision ${parameters.precision} isampler3D;
	precision ${parameters.precision} isamplerCube;
	precision ${parameters.precision} isampler2DArray;
	precision ${parameters.precision} usampler2D;
	precision ${parameters.precision} usampler3D;
	precision ${parameters.precision} usamplerCube;
	precision ${parameters.precision} usampler2DArray;
	`;

	if ( parameters.precision === 'highp' ) {

		precisionstring += '\n#define HIGH_PRECISION';

	} else if ( parameters.precision === 'mediump' ) {

		precisionstring += '\n#define MEDIUM_PRECISION';

	} else if ( parameters.precision === 'lowp' ) {

		precisionstring += '\n#define LOW_PRECISION';

	}

	return precisionstring;

}

/**
 * 生成阴影贴图类型定义
 *
 * @param parameters 参数对象
 * @param parameters.shadowMapType 阴影贴图类型
 * @returns 阴影贴图类型定义字符串
 */
function generateShadowMapTypeDefine( parameters ) {

	let shadowMapTypeDefine = 'SHADOWMAP_TYPE_BASIC';

	if ( parameters.shadowMapType === PCFShadowMap ) {

		shadowMapTypeDefine = 'SHADOWMAP_TYPE_PCF';

	} else if ( parameters.shadowMapType === PCFSoftShadowMap ) {

		shadowMapTypeDefine = 'SHADOWMAP_TYPE_PCF_SOFT';

	} else if ( parameters.shadowMapType === VSMShadowMap ) {

		shadowMapTypeDefine = 'SHADOWMAP_TYPE_VSM';

	}

	return shadowMapTypeDefine;

}

/**
 * 生成环境贴图类型定义
 *
 * @param parameters 参数对象
 * @param parameters.envMap 环境贴图
 * @param parameters.envMapMode 环境贴图模式
 * @returns 环境贴图类型定义
 */
function generateEnvMapTypeDefine( parameters ) {

	let envMapTypeDefine = 'ENVMAP_TYPE_CUBE';

	if ( parameters.envMap ) {

		switch ( parameters.envMapMode ) {

			case CubeReflectionMapping:
			case CubeRefractionMapping:
				envMapTypeDefine = 'ENVMAP_TYPE_CUBE';
				break;

			case CubeUVReflectionMapping:
				envMapTypeDefine = 'ENVMAP_TYPE_CUBE_UV';
				break;

		}

	}

	return envMapTypeDefine;

}

/**
 * 生成环境贴图模式定义
 *
 * @param parameters 参数对象
 * @param parameters.envMap 环境贴图
 * @param parameters.envMapMode 环境贴图模式
 * @returns 返回环境贴图模式定义字符串
 */
function generateEnvMapModeDefine( parameters ) {

	let envMapModeDefine = 'ENVMAP_MODE_REFLECTION';

	if ( parameters.envMap ) {

		switch ( parameters.envMapMode ) {

			case CubeRefractionMapping:

				envMapModeDefine = 'ENVMAP_MODE_REFRACTION';
				break;

		}

	}

	return envMapModeDefine;

}

/**
 * 生成环境贴图混合宏定义
 *
 * @param parameters 参数对象
 * @param parameters.envMap 环境贴图
 * @param parameters.combine 混合模式，可选值为MultiplyOperation、MixOperation、AddOperation
 * @returns 返回环境贴图混合宏定义字符串
 */
function generateEnvMapBlendingDefine( parameters ) {

	let envMapBlendingDefine = 'ENVMAP_BLENDING_NONE';

	if ( parameters.envMap ) {

		switch ( parameters.combine ) {

			case MultiplyOperation:
				envMapBlendingDefine = 'ENVMAP_BLENDING_MULTIPLY';
				break;

			case MixOperation:
				envMapBlendingDefine = 'ENVMAP_BLENDING_MIX';
				break;

			case AddOperation:
				envMapBlendingDefine = 'ENVMAP_BLENDING_ADD';
				break;

		}

	}

	return envMapBlendingDefine;

}

/**
 * 生成环境贴图立方体UV大小
 *
 * @param parameters 包含环境贴图立方体UV高度的参数对象
 * @returns 包含texelWidth、texelHeight和maxMip的对象，如果图像高度为null则返回null
 */
function generateCubeUVSize( parameters ) {

	// 获取环境贴图立方体UV高度
	const imageHeight = parameters.envMapCubeUVHeight;

	// 如果图像高度为null，则返回null
	if ( imageHeight === null ) return null;

	// 计算最大mip等级，根据图像高度的对数值减去2
	const maxMip = Math.log2( imageHeight ) - 2;

	// 计算纹理高度（texelHeight），即1除以图像高度
	const texelHeight = 1.0 / imageHeight;

	// 计算纹理宽度（texelWidth），即1除以（3乘以最大mip等级对应的2的幂次和7乘以16中的较大值）
	const texelWidth = 1.0 / ( 3 * Math.max( Math.pow( 2, maxMip ), 7 * 16 ) );

	// 返回一个包含texelWidth、texelHeight和maxMip的对象
	return { texelWidth, texelHeight, maxMip };

}

/**
 * @description
 * 创建一个WebGLProgram对象，用于存储和管理OpenGL中的程序。
 * 该函数会在第一次使用时进行初始化，并且会保存着程序的相关信息，包括属性、着色器、缓存等。
 *
 * @param {Object} renderer WebGLRenderer对象引用，用于访问WebGL上下文。
 * @param {string} cacheKey 缓存的标识符，用于区分不同的着色器程序。
 * @param {Object} parameters 包含着色器参数的对象，包括预处理指令、定义、着色器源代码等。
 * @param {Object} bindingStates 包含绑定状态的对象，用于管理着色器程序的绑定状态。
 *
 * @returns {Object} WebGLProgram对象，包含了程序的相关信息和方法。
 */
function WebGLProgram( renderer, cacheKey, parameters, bindingStates ) {
	// 获取webgl上下文
	const gl = renderer.getContext();
	// 自定义数据
	const defines = parameters.defines;
	// 获取顶点着色器
	let vertexShader = parameters.vertexShader;
	// 获取片段着色器
	let fragmentShader = parameters.fragmentShader;

	const shadowMapTypeDefine = generateShadowMapTypeDefine( parameters );
	const envMapTypeDefine = generateEnvMapTypeDefine( parameters );
	const envMapModeDefine = generateEnvMapModeDefine( parameters );
	const envMapBlendingDefine = generateEnvMapBlendingDefine( parameters );
	const envMapCubeUVSize = generateCubeUVSize( parameters );

	const customVertexExtensions = generateVertexExtensions( parameters );

	const customDefines = generateDefines( defines );
	// 创建program
	const program = gl.createProgram();

	let prefixVertex, prefixFragment;
	let versionString = parameters.glslVersion ? '#version ' + parameters.glslVersion + '\n' : '';
	// 构建顶点和片元着色器代码的前置字符串
	if ( parameters.isRawShaderMaterial ) {

		prefixVertex = [

			'#define SHADER_TYPE ' + parameters.shaderType,
			'#define SHADER_NAME ' + parameters.shaderName,

			customDefines

		].filter( filterEmptyLine ).join( '\n' );

		if ( prefixVertex.length > 0 ) {

			prefixVertex += '\n';

		}

		prefixFragment = [

			'#define SHADER_TYPE ' + parameters.shaderType,
			'#define SHADER_NAME ' + parameters.shaderName,

			customDefines

		].filter( filterEmptyLine ).join( '\n' );

		if ( prefixFragment.length > 0 ) {

			prefixFragment += '\n';

		}

	} else {

		prefixVertex = [

			generatePrecision( parameters ),

			'#define SHADER_TYPE ' + parameters.shaderType,
			'#define SHADER_NAME ' + parameters.shaderName,

			customDefines,

			parameters.extensionClipCullDistance ? '#define USE_CLIP_DISTANCE' : '',
			parameters.batching ? '#define USE_BATCHING' : '',
			parameters.batchingColor ? '#define USE_BATCHING_COLOR' : '',
			parameters.instancing ? '#define USE_INSTANCING' : '',
			parameters.instancingColor ? '#define USE_INSTANCING_COLOR' : '',
			parameters.instancingMorph ? '#define USE_INSTANCING_MORPH' : '',

			parameters.useFog && parameters.fog ? '#define USE_FOG' : '',
			parameters.useFog && parameters.fogExp2 ? '#define FOG_EXP2' : '',

			parameters.map ? '#define USE_MAP' : '',
			parameters.envMap ? '#define USE_ENVMAP' : '',
			parameters.envMap ? '#define ' + envMapModeDefine : '',
			parameters.lightMap ? '#define USE_LIGHTMAP' : '',
			parameters.aoMap ? '#define USE_AOMAP' : '',
			parameters.bumpMap ? '#define USE_BUMPMAP' : '',
			parameters.normalMap ? '#define USE_NORMALMAP' : '',
			parameters.normalMapObjectSpace ? '#define USE_NORMALMAP_OBJECTSPACE' : '',
			parameters.normalMapTangentSpace ? '#define USE_NORMALMAP_TANGENTSPACE' : '',
			parameters.displacementMap ? '#define USE_DISPLACEMENTMAP' : '',
			parameters.emissiveMap ? '#define USE_EMISSIVEMAP' : '',

			parameters.anisotropy ? '#define USE_ANISOTROPY' : '',
			parameters.anisotropyMap ? '#define USE_ANISOTROPYMAP' : '',

			parameters.clearcoatMap ? '#define USE_CLEARCOATMAP' : '',
			parameters.clearcoatRoughnessMap ? '#define USE_CLEARCOAT_ROUGHNESSMAP' : '',
			parameters.clearcoatNormalMap ? '#define USE_CLEARCOAT_NORMALMAP' : '',

			parameters.iridescenceMap ? '#define USE_IRIDESCENCEMAP' : '',
			parameters.iridescenceThicknessMap ? '#define USE_IRIDESCENCE_THICKNESSMAP' : '',

			parameters.specularMap ? '#define USE_SPECULARMAP' : '',
			parameters.specularColorMap ? '#define USE_SPECULAR_COLORMAP' : '',
			parameters.specularIntensityMap ? '#define USE_SPECULAR_INTENSITYMAP' : '',

			parameters.roughnessMap ? '#define USE_ROUGHNESSMAP' : '',
			parameters.metalnessMap ? '#define USE_METALNESSMAP' : '',
			parameters.alphaMap ? '#define USE_ALPHAMAP' : '',
			parameters.alphaHash ? '#define USE_ALPHAHASH' : '',

			parameters.transmission ? '#define USE_TRANSMISSION' : '',
			parameters.transmissionMap ? '#define USE_TRANSMISSIONMAP' : '',
			parameters.thicknessMap ? '#define USE_THICKNESSMAP' : '',

			parameters.sheenColorMap ? '#define USE_SHEEN_COLORMAP' : '',
			parameters.sheenRoughnessMap ? '#define USE_SHEEN_ROUGHNESSMAP' : '',

			//

			parameters.mapUv ? '#define MAP_UV ' + parameters.mapUv : '',
			parameters.alphaMapUv ? '#define ALPHAMAP_UV ' + parameters.alphaMapUv : '',
			parameters.lightMapUv ? '#define LIGHTMAP_UV ' + parameters.lightMapUv : '',
			parameters.aoMapUv ? '#define AOMAP_UV ' + parameters.aoMapUv : '',
			parameters.emissiveMapUv ? '#define EMISSIVEMAP_UV ' + parameters.emissiveMapUv : '',
			parameters.bumpMapUv ? '#define BUMPMAP_UV ' + parameters.bumpMapUv : '',
			parameters.normalMapUv ? '#define NORMALMAP_UV ' + parameters.normalMapUv : '',
			parameters.displacementMapUv ? '#define DISPLACEMENTMAP_UV ' + parameters.displacementMapUv : '',

			parameters.metalnessMapUv ? '#define METALNESSMAP_UV ' + parameters.metalnessMapUv : '',
			parameters.roughnessMapUv ? '#define ROUGHNESSMAP_UV ' + parameters.roughnessMapUv : '',

			parameters.anisotropyMapUv ? '#define ANISOTROPYMAP_UV ' + parameters.anisotropyMapUv : '',

			parameters.clearcoatMapUv ? '#define CLEARCOATMAP_UV ' + parameters.clearcoatMapUv : '',
			parameters.clearcoatNormalMapUv ? '#define CLEARCOAT_NORMALMAP_UV ' + parameters.clearcoatNormalMapUv : '',
			parameters.clearcoatRoughnessMapUv ? '#define CLEARCOAT_ROUGHNESSMAP_UV ' + parameters.clearcoatRoughnessMapUv : '',

			parameters.iridescenceMapUv ? '#define IRIDESCENCEMAP_UV ' + parameters.iridescenceMapUv : '',
			parameters.iridescenceThicknessMapUv ? '#define IRIDESCENCE_THICKNESSMAP_UV ' + parameters.iridescenceThicknessMapUv : '',

			parameters.sheenColorMapUv ? '#define SHEEN_COLORMAP_UV ' + parameters.sheenColorMapUv : '',
			parameters.sheenRoughnessMapUv ? '#define SHEEN_ROUGHNESSMAP_UV ' + parameters.sheenRoughnessMapUv : '',

			parameters.specularMapUv ? '#define SPECULARMAP_UV ' + parameters.specularMapUv : '',
			parameters.specularColorMapUv ? '#define SPECULAR_COLORMAP_UV ' + parameters.specularColorMapUv : '',
			parameters.specularIntensityMapUv ? '#define SPECULAR_INTENSITYMAP_UV ' + parameters.specularIntensityMapUv : '',

			parameters.transmissionMapUv ? '#define TRANSMISSIONMAP_UV ' + parameters.transmissionMapUv : '',
			parameters.thicknessMapUv ? '#define THICKNESSMAP_UV ' + parameters.thicknessMapUv : '',

			//

			parameters.vertexTangents && parameters.flatShading === false ? '#define USE_TANGENT' : '',
			parameters.vertexColors ? '#define USE_COLOR' : '',
			parameters.vertexAlphas ? '#define USE_COLOR_ALPHA' : '',
			parameters.vertexUv1s ? '#define USE_UV1' : '',
			parameters.vertexUv2s ? '#define USE_UV2' : '',
			parameters.vertexUv3s ? '#define USE_UV3' : '',

			parameters.pointsUvs ? '#define USE_POINTS_UV' : '',

			parameters.flatShading ? '#define FLAT_SHADED' : '',

			parameters.skinning ? '#define USE_SKINNING' : '',

			parameters.morphTargets ? '#define USE_MORPHTARGETS' : '',
			parameters.morphNormals && parameters.flatShading === false ? '#define USE_MORPHNORMALS' : '',
			( parameters.morphColors ) ? '#define USE_MORPHCOLORS' : '',
			( parameters.morphTargetsCount > 0 ) ? '#define MORPHTARGETS_TEXTURE_STRIDE ' + parameters.morphTextureStride : '',
			( parameters.morphTargetsCount > 0 ) ? '#define MORPHTARGETS_COUNT ' + parameters.morphTargetsCount : '',
			parameters.doubleSided ? '#define DOUBLE_SIDED' : '',
			parameters.flipSided ? '#define FLIP_SIDED' : '',

			parameters.shadowMapEnabled ? '#define USE_SHADOWMAP' : '',
			parameters.shadowMapEnabled ? '#define ' + shadowMapTypeDefine : '',

			parameters.sizeAttenuation ? '#define USE_SIZEATTENUATION' : '',

			parameters.numLightProbes > 0 ? '#define USE_LIGHT_PROBES' : '',

			parameters.logarithmicDepthBuffer ? '#define USE_LOGDEPTHBUF' : '',

			'uniform mat4 modelMatrix;',
			'uniform mat4 modelViewMatrix;',
			'uniform mat4 projectionMatrix;',
			'uniform mat4 viewMatrix;',
			'uniform mat3 normalMatrix;',
			'uniform vec3 cameraPosition;',
			'uniform bool isOrthographic;',

			'#ifdef USE_INSTANCING',

			'	attribute mat4 instanceMatrix;',

			'#endif',

			'#ifdef USE_INSTANCING_COLOR',

			'	attribute vec3 instanceColor;',

			'#endif',

			'#ifdef USE_INSTANCING_MORPH',

			'	uniform sampler2D morphTexture;',

			'#endif',

			'attribute vec3 position;',
			'attribute vec3 normal;',
			'attribute vec2 uv;',

			'#ifdef USE_UV1',

			'	attribute vec2 uv1;',

			'#endif',

			'#ifdef USE_UV2',

			'	attribute vec2 uv2;',

			'#endif',

			'#ifdef USE_UV3',

			'	attribute vec2 uv3;',

			'#endif',

			'#ifdef USE_TANGENT',

			'	attribute vec4 tangent;',

			'#endif',

			'#if defined( USE_COLOR_ALPHA )',

			'	attribute vec4 color;',

			'#elif defined( USE_COLOR )',

			'	attribute vec3 color;',

			'#endif',

			'#ifdef USE_SKINNING',

			'	attribute vec4 skinIndex;',
			'	attribute vec4 skinWeight;',

			'#endif',

			'\n'

		].filter( filterEmptyLine ).join( '\n' );

		prefixFragment = [

			generatePrecision( parameters ),

			'#define SHADER_TYPE ' + parameters.shaderType,
			'#define SHADER_NAME ' + parameters.shaderName,

			customDefines,

			parameters.useFog && parameters.fog ? '#define USE_FOG' : '',
			parameters.useFog && parameters.fogExp2 ? '#define FOG_EXP2' : '',

			parameters.alphaToCoverage ? '#define ALPHA_TO_COVERAGE' : '',
			parameters.map ? '#define USE_MAP' : '',
			parameters.matcap ? '#define USE_MATCAP' : '',
			parameters.envMap ? '#define USE_ENVMAP' : '',
			parameters.envMap ? '#define ' + envMapTypeDefine : '',
			parameters.envMap ? '#define ' + envMapModeDefine : '',
			parameters.envMap ? '#define ' + envMapBlendingDefine : '',
			envMapCubeUVSize ? '#define CUBEUV_TEXEL_WIDTH ' + envMapCubeUVSize.texelWidth : '',
			envMapCubeUVSize ? '#define CUBEUV_TEXEL_HEIGHT ' + envMapCubeUVSize.texelHeight : '',
			envMapCubeUVSize ? '#define CUBEUV_MAX_MIP ' + envMapCubeUVSize.maxMip + '.0' : '',
			parameters.lightMap ? '#define USE_LIGHTMAP' : '',
			parameters.aoMap ? '#define USE_AOMAP' : '',
			parameters.bumpMap ? '#define USE_BUMPMAP' : '',
			parameters.normalMap ? '#define USE_NORMALMAP' : '',
			parameters.normalMapObjectSpace ? '#define USE_NORMALMAP_OBJECTSPACE' : '',
			parameters.normalMapTangentSpace ? '#define USE_NORMALMAP_TANGENTSPACE' : '',
			parameters.emissiveMap ? '#define USE_EMISSIVEMAP' : '',

			parameters.anisotropy ? '#define USE_ANISOTROPY' : '',
			parameters.anisotropyMap ? '#define USE_ANISOTROPYMAP' : '',

			parameters.clearcoat ? '#define USE_CLEARCOAT' : '',
			parameters.clearcoatMap ? '#define USE_CLEARCOATMAP' : '',
			parameters.clearcoatRoughnessMap ? '#define USE_CLEARCOAT_ROUGHNESSMAP' : '',
			parameters.clearcoatNormalMap ? '#define USE_CLEARCOAT_NORMALMAP' : '',

			parameters.dispersion ? '#define USE_DISPERSION' : '',

			parameters.iridescence ? '#define USE_IRIDESCENCE' : '',
			parameters.iridescenceMap ? '#define USE_IRIDESCENCEMAP' : '',
			parameters.iridescenceThicknessMap ? '#define USE_IRIDESCENCE_THICKNESSMAP' : '',

			parameters.specularMap ? '#define USE_SPECULARMAP' : '',
			parameters.specularColorMap ? '#define USE_SPECULAR_COLORMAP' : '',
			parameters.specularIntensityMap ? '#define USE_SPECULAR_INTENSITYMAP' : '',

			parameters.roughnessMap ? '#define USE_ROUGHNESSMAP' : '',
			parameters.metalnessMap ? '#define USE_METALNESSMAP' : '',

			parameters.alphaMap ? '#define USE_ALPHAMAP' : '',
			parameters.alphaTest ? '#define USE_ALPHATEST' : '',
			parameters.alphaHash ? '#define USE_ALPHAHASH' : '',

			parameters.sheen ? '#define USE_SHEEN' : '',
			parameters.sheenColorMap ? '#define USE_SHEEN_COLORMAP' : '',
			parameters.sheenRoughnessMap ? '#define USE_SHEEN_ROUGHNESSMAP' : '',

			parameters.transmission ? '#define USE_TRANSMISSION' : '',
			parameters.transmissionMap ? '#define USE_TRANSMISSIONMAP' : '',
			parameters.thicknessMap ? '#define USE_THICKNESSMAP' : '',

			parameters.vertexTangents && parameters.flatShading === false ? '#define USE_TANGENT' : '',
			parameters.vertexColors || parameters.instancingColor || parameters.batchingColor ? '#define USE_COLOR' : '',
			parameters.vertexAlphas ? '#define USE_COLOR_ALPHA' : '',
			parameters.vertexUv1s ? '#define USE_UV1' : '',
			parameters.vertexUv2s ? '#define USE_UV2' : '',
			parameters.vertexUv3s ? '#define USE_UV3' : '',

			parameters.pointsUvs ? '#define USE_POINTS_UV' : '',

			parameters.gradientMap ? '#define USE_GRADIENTMAP' : '',

			parameters.flatShading ? '#define FLAT_SHADED' : '',

			parameters.doubleSided ? '#define DOUBLE_SIDED' : '',
			parameters.flipSided ? '#define FLIP_SIDED' : '',

			parameters.shadowMapEnabled ? '#define USE_SHADOWMAP' : '',
			parameters.shadowMapEnabled ? '#define ' + shadowMapTypeDefine : '',

			parameters.premultipliedAlpha ? '#define PREMULTIPLIED_ALPHA' : '',

			parameters.numLightProbes > 0 ? '#define USE_LIGHT_PROBES' : '',

			parameters.decodeVideoTexture ? '#define DECODE_VIDEO_TEXTURE' : '',

			parameters.logarithmicDepthBuffer ? '#define USE_LOGDEPTHBUF' : '',

			'uniform mat4 viewMatrix;',
			'uniform vec3 cameraPosition;',
			'uniform bool isOrthographic;',

			( parameters.toneMapping !== NoToneMapping ) ? '#define TONE_MAPPING' : '',
			( parameters.toneMapping !== NoToneMapping ) ? ShaderChunk[ 'tonemapping_pars_fragment' ] : '', // this code is required here because it is used by the toneMapping() function defined below
			( parameters.toneMapping !== NoToneMapping ) ? getToneMappingFunction( 'toneMapping', parameters.toneMapping ) : '',

			parameters.dithering ? '#define DITHERING' : '',
			parameters.opaque ? '#define OPAQUE' : '',

			ShaderChunk[ 'colorspace_pars_fragment' ], // this code is required here because it is used by the various encoding/decoding function defined below
			getTexelEncodingFunction( 'linearToOutputTexel', parameters.outputColorSpace ),

			parameters.useDepthPacking ? '#define DEPTH_PACKING ' + parameters.depthPacking : '',

			'\n'

		].filter( filterEmptyLine ).join( '\n' );
	}
	// 解析#include
	vertexShader = resolveIncludes( vertexShader );
	// 替换字符串中的光源数量参数
	vertexShader = replaceLightNums( vertexShader, parameters );
	// 替换字符串中的剪切平面数量
	vertexShader = replaceClippingPlaneNums( vertexShader, parameters );

	fragmentShader = resolveIncludes( fragmentShader );
	fragmentShader = replaceLightNums( fragmentShader, parameters );
	fragmentShader = replaceClippingPlaneNums( fragmentShader, parameters );

	vertexShader = unrollLoops( vertexShader );
	fragmentShader = unrollLoops( fragmentShader );

	if ( parameters.isRawShaderMaterial !== true ) {

		// GLSL 3.0 conversion for built-in materials and ShaderMaterial

		versionString = '#version 300 es\n';

		prefixVertex = [
			customVertexExtensions,
			'#define attribute in',
			'#define varying out',
			'#define texture2D texture'
		].join( '\n' ) + '\n' + prefixVertex;

		prefixFragment = [
			'#define varying in',
			( parameters.glslVersion === GLSL3 ) ? '' : 'layout(location = 0) out highp vec4 pc_fragColor;',
			( parameters.glslVersion === GLSL3 ) ? '' : '#define gl_FragColor pc_fragColor',
			'#define gl_FragDepthEXT gl_FragDepth',
			'#define texture2D texture',
			'#define textureCube texture',
			'#define texture2DProj textureProj',
			'#define texture2DLodEXT textureLod',
			'#define texture2DProjLodEXT textureProjLod',
			'#define textureCubeLodEXT textureLod',
			'#define texture2DGradEXT textureGrad',
			'#define texture2DProjGradEXT textureProjGrad',
			'#define textureCubeGradEXT textureGrad'
		].join( '\n' ) + '\n' + prefixFragment;

	}
	// 得到最终的着色器代码
	const vertexGlsl = versionString + prefixVertex + vertexShader;
	const fragmentGlsl = versionString + prefixFragment + fragmentShader;
	// 创建着色器对象
	/**
	 *  const shader = gl.createShader( type );
		gl.shaderSource( shader, string );
		gl.compileShader( shader );
	 */
	const glVertexShader = WebGLShader( gl, gl.VERTEX_SHADER, vertexGlsl );
	const glFragmentShader = WebGLShader( gl, gl.FRAGMENT_SHADER, fragmentGlsl );

	gl.attachShader( program, glVertexShader );
	gl.attachShader( program, glFragmentShader );

	// Force a particular attribute to index 0.
	if ( parameters.index0AttributeName !== undefined ) {
		gl.bindAttribLocation( program, 0, parameters.index0AttributeName );
	} else if ( parameters.morphTargets === true ) {
		// programs with morphTargets displace position out of attribute 0
		// 将 'position' 绑定到顶点属性位置 0
		// 必须在调用 gl.linkProgram() 之前使用，否则不会生效
		gl.bindAttribLocation( program, 0, 'position' );
	}

	gl.linkProgram( program );

	/**
	 * 首次使用时的处理函数
	 *
	 * @param self 当前对象
	 * @returns 无返回值
	 */
	function onFirstUse( self ) {
		// check for link errors
		// 是否应该检测shader编译错误
		if ( renderer.debug.checkShaderErrors ) {
			// 获取日志信息
			const programLog = gl.getProgramInfoLog( program ).trim();
			const vertexLog = gl.getShaderInfoLog( glVertexShader ).trim();
			const fragmentLog = gl.getShaderInfoLog( glFragmentShader ).trim();

			let runnable = true;
			let haveDiagnostics = true;
			// 检查链接状态
			if ( gl.getProgramParameter( program, gl.LINK_STATUS ) === false ) {
				runnable = false;
				if ( typeof renderer.debug.onShaderError === 'function' ) {
					renderer.debug.onShaderError( gl, program, glVertexShader, glFragmentShader );
				} else {
					// 打印错误日志
					const vertexErrors = getShaderErrors( gl, glVertexShader, 'vertex' );
					const fragmentErrors = getShaderErrors( gl, glFragmentShader, 'fragment' );
					console.error(
						'THREE.WebGLProgram: Shader Error ' + gl.getError() + ' - ' +
						'VALIDATE_STATUS ' + gl.getProgramParameter( program, gl.VALIDATE_STATUS ) + '\n\n' +
						'Material Name: ' + self.name + '\n' +
						'Material Type: ' + self.type + '\n\n' +
						'Program Info Log: ' + programLog + '\n' +
						vertexErrors + '\n' +
						fragmentErrors
					);

				}

			} else if ( programLog !== '' ) {

				console.warn( 'THREE.WebGLProgram: Program Info Log:', programLog );

			} else if ( vertexLog === '' || fragmentLog === '' ) {

				haveDiagnostics = false;
			}
			if ( haveDiagnostics ) {
				self.diagnostics = {
					runnable: runnable,
					programLog: programLog,
					vertexShader: {
						log: vertexLog,
						prefix: prefixVertex
					},
					fragmentShader: {
						log: fragmentLog,
						prefix: prefixFragment
					}
				};
			}
		}
		// 用完就删除
		gl.deleteShader( glVertexShader );
		gl.deleteShader( glFragmentShader );

		cachedUniforms = new WebGLUniforms( gl, program );
		cachedAttributes = fetchAttributeLocations( gl, program );
	}
	// set up caching for uniform locations
	let cachedUniforms;
	this.getUniforms = function () {
		if ( cachedUniforms === undefined ) {
			// Populates cachedUniforms and cachedAttributes
			onFirstUse( this );
		}
		return cachedUniforms;
	};

	// set up caching for attribute locations

	let cachedAttributes;
	this.getAttributes = function () {
		if ( cachedAttributes === undefined ) {
			// Populates cachedAttributes and cachedUniforms
			onFirstUse( this );
		}
		return cachedAttributes;
	};

	// indicate when the program is ready to be used. if the KHR_parallel_shader_compile extension isn't supported,
	// flag the program as ready immediately. It may cause a stall when it's first used.

	let programReady = ( parameters.rendererExtensionParallelShaderCompile === false );
	// 判断program是否准备好使用了
	this.isReady = function () {
		if ( programReady === false ) {
			programReady = gl.getProgramParameter( program, COMPLETION_STATUS_KHR );
		}
		return programReady;
	};

	// 资源释放
	this.destroy = function () {
		bindingStates.releaseStatesOfProgram( this );
		gl.deleteProgram( program );
		this.program = undefined;
	};
	
	this.type = parameters.shaderType;
	this.name = parameters.shaderName;
	this.id = programIdCount ++;
	this.cacheKey = cacheKey;
	this.usedTimes = 1;
	this.program = program;
	this.vertexShader = glVertexShader;
	this.fragmentShader = glFragmentShader;

	return this;

}

export { WebGLProgram };
