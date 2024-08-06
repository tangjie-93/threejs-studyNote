import { EventDispatcher } from './EventDispatcher.js';
import { Texture } from '../textures/Texture.js';
import { LinearFilter } from '../constants.js';
import { Vector4 } from '../math/Vector4.js';
import { Source } from '../textures/Source.js';

/*
 In options, we can specify:
 * Texture parameters for an auto-generated target texture
 * depthBuffer/stencilBuffer: Booleans to indicate if we should generate these buffers
*/
class RenderTarget extends EventDispatcher {

	/**
	 * 构造函数
	 *
	 * @param width 宽度，默认为1
	 * @param height 高度，默认为1
	 * @param options 配置选项，默认为空对象
	 */
	constructor( width = 1, height = 1, options = {} ) {

		super();

		// 设置是否为渲染目标
		this.isRenderTarget = true;

		// 设置宽度、高度和深度
		this.width = width;
		this.height = height;
		this.depth = 1;

		// 设置剪刀矩形
		this.scissor = new Vector4( 0, 0, width, height );
		// 设置是否进行剪刀测试
		this.scissorTest = false;

		// 设置视口
		this.viewport = new Vector4( 0, 0, width, height );

		// 创建一个图像对象
		const image = { width: width, height: height, depth: 1 };

		// 合并默认选项和传入选项
		options = Object.assign( {
			// 是否生成mipmaps
			generateMipmaps: false,
			// 内部格式
			internalFormat: null,
			// 最小过滤方式
			minFilter: LinearFilter,
			// 是否使用深度缓冲区
			depthBuffer: true,
			// 是否使用模板缓冲区
			stencilBuffer: false,
			// 是否解析深度缓冲区
			resolveDepthBuffer: true,
			// 是否解析模板缓冲区
			resolveStencilBuffer: true,
			// 深度纹理
			depthTexture: null,
			// 采样数
			samples: 0,
			// 纹理数量
			count: 1
		}, options );

		// 创建纹理对象
		const texture = new Texture( image, options.mapping, options.wrapS, options.wrapT, options.magFilter, options.minFilter, options.format, options.type, options.anisotropy, options.colorSpace );

		// 设置纹理的Y轴是否翻转
		texture.flipY = false;
		// 设置是否生成mipmaps
		texture.generateMipmaps = options.generateMipmaps;
		// 设置内部格式
		texture.internalFormat = options.internalFormat;

		// 初始化纹理数组
		this.textures = [];

		// 获取纹理数量
		const count = options.count;
		for ( let i = 0; i < count; i ++ ) {
			// 复制纹理对象并添加到纹理数组中
			this.textures[ i ] = texture.clone();
			// 设置纹理为渲染目标纹理
			this.textures[ i ].isRenderTargetTexture = true;
		}

		// 设置是否使用深度缓冲区
		this.depthBuffer = options.depthBuffer;
		// 设置是否使用模板缓冲区
		this.stencilBuffer = options.stencilBuffer;

		// 设置是否解析深度缓冲区
		this.resolveDepthBuffer = options.resolveDepthBuffer;
		// 设置是否解析模板缓冲区
		this.resolveStencilBuffer = options.resolveStencilBuffer;

		// 设置深度纹理
		this.depthTexture = options.depthTexture;

		// 设置采样数
		this.samples = options.samples;
	}

	get texture() {

		return this.textures[ 0 ];

	}

	set texture( value ) {

		this.textures[ 0 ] = value;

	}

	/**
	 * 设置尺寸
	 *
	 * @param width 宽度
	 * @param height 高度
	 * @param depth 深度，默认为1
	 */
	setSize( width, height, depth = 1 ) {

		// 如果当前对象的宽度、高度或深度与传入的参数不同
		if ( this.width !== width || this.height !== height || this.depth !== depth ) {

			// 更新当前对象的宽度、高度和深度
			this.width = width;
			this.height = height;
			this.depth = depth;

			// 遍历当前对象的纹理数组
			for ( let i = 0, il = this.textures.length; i < il; i ++ ) {

				// 更新每个纹理的宽度、高度和深度
				this.textures[ i ].image.width = width;
				this.textures[ i ].image.height = height;
				this.textures[ i ].image.depth = depth;

			}

			// 释放当前对象的资源
			this.dispose();

		}

		// 设置当前对象的视口和剪裁区域
		this.viewport.set( 0, 0, width, height );
		this.scissor.set( 0, 0, width, height );

	}

	clone() {

		return new this.constructor().copy( this );

	}

	copy( source ) {

		this.width = source.width;
		this.height = source.height;
		this.depth = source.depth;

		this.scissor.copy( source.scissor );
		this.scissorTest = source.scissorTest;

		this.viewport.copy( source.viewport );

		this.textures.length = 0;

		for ( let i = 0, il = source.textures.length; i < il; i ++ ) {

			this.textures[ i ] = source.textures[ i ].clone();
			this.textures[ i ].isRenderTargetTexture = true;

		}

		// ensure image object is not shared, see #20328

		const image = Object.assign( {}, source.texture.image );
		this.texture.source = new Source( image );

		this.depthBuffer = source.depthBuffer;
		this.stencilBuffer = source.stencilBuffer;

		this.resolveDepthBuffer = source.resolveDepthBuffer;
		this.resolveStencilBuffer = source.resolveStencilBuffer;

		if ( source.depthTexture !== null ) this.depthTexture = source.depthTexture.clone();

		this.samples = source.samples;

		return this;

	}

	dispose() {

		this.dispatchEvent( { type: 'dispose' } );

	}

}

export { RenderTarget };
