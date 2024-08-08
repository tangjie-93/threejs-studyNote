import { Material } from './Material.js';
import { cloneUniforms, cloneUniformsGroups } from '../renderers/shaders/UniformsUtils.js';

import default_vertex from '../renderers/shaders/ShaderChunk/default_vertex.glsl.js';
import default_fragment from '../renderers/shaders/ShaderChunk/default_fragment.glsl.js';

class ShaderMaterial extends Material {

	constructor( parameters ) {

		super();

		// 标识是否为着色器材质
		this.isShaderMaterial = true;

		// 材质类型
		this.type = 'ShaderMaterial';

		// 定义对象，用于存储自定义宏定义
		this.defines = {};
		// 统一变量对象，用于存储着色器中的统一变量
		this.uniforms = {};
		// 统一变量组数组，用于分组管理统一变量
		this.uniformsGroups = [];

		// 顶点着色器代码
		this.vertexShader = default_vertex;
		// 片段着色器代码
		this.fragmentShader = default_fragment;

		// 线宽
		this.linewidth = 1;

		// 是否使用线框模式
		this.wireframe = false;
		// 线框模式的线宽
		this.wireframeLinewidth = 1;

		// 是否使用场景雾效
		this.fog = false; // set to use scene fog
		// 是否使用场景光源
		this.lights = false; // set to use scene lights
		// 是否使用用户自定义的裁剪平面
		this.clipping = false; // set to use user-defined clipping planes

		// 是否强制使用单通道渲染
		this.forceSinglePass = true;

		this.extensions = {
			// 是否使用顶点着色器裁剪
			clipCullDistance: false, // set to use vertex shader clipping
			// 是否使用顶点着色器 multi_draw 或启用 gl_DrawID
			multiDraw: false // set to use vertex shader multi_draw / enable gl_DrawID
		};

		// 当渲染的几何体不包括这些属性，但材质需要这些属性时，使用 WebGL 中的默认值来避免缓冲区数据缺失时出错
		// 当渲染的几何体不包含这些属性，但材质却需要时，在WebGL中使用这些默认值，以避免因缓冲区数据缺失而引发的错误
		// When rendered geometry doesn't include these attributes but the material does,
		// use these default values in WebGL. This avoids errors when buffer data is missing.
		this.defaultAttributeValues = {
			'color': [ 1, 1, 1 ],
			'uv': [ 0, 0 ],
			'uv1': [ 0, 0 ]
		};

		// 索引0的属性名
		this.index0AttributeName = undefined;
		// 是否需要更新统一变量
		this.uniformsNeedUpdate = false;

		// GLSL版本
		this.glslVersion = null;

		if ( parameters !== undefined ) {

			// 设置参数值
			this.setValues( parameters );

		}

	}

	copy( source ) {

		super.copy( source );

		this.fragmentShader = source.fragmentShader;
		this.vertexShader = source.vertexShader;

		this.uniforms = cloneUniforms( source.uniforms );
		this.uniformsGroups = cloneUniformsGroups( source.uniformsGroups );

		this.defines = Object.assign( {}, source.defines );

		this.wireframe = source.wireframe;
		this.wireframeLinewidth = source.wireframeLinewidth;

		this.fog = source.fog;
		this.lights = source.lights;
		this.clipping = source.clipping;

		this.extensions = Object.assign( {}, source.extensions );

		this.glslVersion = source.glslVersion;

		return this;

	}

	toJSON( meta ) {

		const data = super.toJSON( meta );

		data.glslVersion = this.glslVersion;
		data.uniforms = {};

		for ( const name in this.uniforms ) {

			const uniform = this.uniforms[ name ];
			const value = uniform.value;

			if ( value && value.isTexture ) {

				data.uniforms[ name ] = {
					type: 't',
					value: value.toJSON( meta ).uuid
				};

			} else if ( value && value.isColor ) {

				data.uniforms[ name ] = {
					type: 'c',
					value: value.getHex()
				};

			} else if ( value && value.isVector2 ) {

				data.uniforms[ name ] = {
					type: 'v2',
					value: value.toArray()
				};

			} else if ( value && value.isVector3 ) {

				data.uniforms[ name ] = {
					type: 'v3',
					value: value.toArray()
				};

			} else if ( value && value.isVector4 ) {

				data.uniforms[ name ] = {
					type: 'v4',
					value: value.toArray()
				};

			} else if ( value && value.isMatrix3 ) {

				data.uniforms[ name ] = {
					type: 'm3',
					value: value.toArray()
				};

			} else if ( value && value.isMatrix4 ) {

				data.uniforms[ name ] = {
					type: 'm4',
					value: value.toArray()
				};

			} else {

				data.uniforms[ name ] = {
					value: value
				};

				// note: the array variants v2v, v3v, v4v, m4v and tv are not supported so far

			}

		}

		if ( Object.keys( this.defines ).length > 0 ) data.defines = this.defines;

		data.vertexShader = this.vertexShader;
		data.fragmentShader = this.fragmentShader;

		data.lights = this.lights;
		data.clipping = this.clipping;

		const extensions = {};

		for ( const key in this.extensions ) {

			if ( this.extensions[ key ] === true ) extensions[ key ] = true;

		}

		if ( Object.keys( extensions ).length > 0 ) data.extensions = extensions;

		return data;

	}

}

export { ShaderMaterial };
