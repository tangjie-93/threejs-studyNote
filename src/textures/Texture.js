import { EventDispatcher } from '../core/EventDispatcher.js';
import {
	MirroredRepeatWrapping,
	ClampToEdgeWrapping,
	RepeatWrapping,
	UnsignedByteType,
	RGBAFormat,
	LinearMipmapLinearFilter,
	LinearFilter,
	UVMapping,
	NoColorSpace,
} from '../constants.js';
import * as MathUtils from '../math/MathUtils.js';
import { Vector2 } from '../math/Vector2.js';
import { Matrix3 } from '../math/Matrix3.js';
import { Source } from './Source.js';

let _textureId = 0;

class Texture extends EventDispatcher {

	/**
	 * 纹理的构造函数
	 *
	 * @param image 默认纹理图像
	 * @param mapping 默认纹理映射
	 * @param wrapS 默认的S轴包裹方式，默认为ClampToEdgeWrapping
	 * @param wrapT 默认的T轴包裹方式，默认为ClampToEdgeWrapping
	 * @param magFilter 默认的放大过滤器，默认为LinearFilter
	 * @param minFilter 默认的缩小过滤器，默认为LinearMipmapLinearFilter
	 * @param format 默认的像素格式，默认为RGBAFormat
	 * @param type 默认的像素类型，默认为UnsignedByteType
	 * @param anisotropy 默认的最大各向异性值，默认为Texture.DEFAULT_ANISOTROPY
	 * @param colorSpace 默认的颜色空间，默认为NoColorSpace
	 */
	constructor( image = Texture.DEFAULT_IMAGE, mapping = Texture.DEFAULT_MAPPING, wrapS = ClampToEdgeWrapping, wrapT = ClampToEdgeWrapping, magFilter = LinearFilter, minFilter = LinearMipmapLinearFilter, format = RGBAFormat, type = UnsignedByteType, anisotropy = Texture.DEFAULT_ANISOTROPY, colorSpace = NoColorSpace ) {

		super();

		// 设置纹理标识为true
		this.isTexture = true;

		// 为当前纹理对象分配一个唯一的id
		Object.defineProperty( this, 'id', { value: _textureId ++ } );

		// 生成一个UUID作为纹理的uuid
		this.uuid = MathUtils.generateUUID();

		// 纹理的名字默认为空
		this.name = '';

		// 创建纹理的源对象
		this.source = new Source( image );

		// 初始化纹理的mipmap数组
		this.mipmaps = [];

		// 设置纹理的映射方式
		this.mapping = mapping;

		// 设置纹理的通道（默认为0）
		this.channel = 0;

		// 设置纹理在S方向的环绕方式
		this.wrapS = wrapS;

		// 设置纹理在T方向的环绕方式
		this.wrapT = wrapT;

		// 设置纹理的放大过滤方式
		this.magFilter = magFilter;

		// 设置纹理的缩小过滤方式
		this.minFilter = minFilter;

		// 设置纹理的各向异性过滤等级
		this.anisotropy = anisotropy;

		// 设置纹理的格式
		this.format = format;

		// 纹理的内部格式（默认为null）
		this.internalFormat = null;

		// 设置纹理的数据类型
		this.type = type;

		// 设置纹理的偏移量（默认为(0, 0)）
		this.offset = new Vector2( 0, 0 );

		// 设置纹理的重复次数（默认为(1, 1)）
		this.repeat = new Vector2( 1, 1 );

		// 设置纹理的中心点（默认为(0, 0)）
		this.center = new Vector2( 0, 0 );

		// 设置纹理的旋转角度（默认为0）
		this.rotation = 0;

		// 设置纹理的矩阵是否自动更新（默认为true）
		this.matrixAutoUpdate = true;

		// 创建纹理的矩阵对象
		this.matrix = new Matrix3();

		// 设置是否生成mipmap（默认为true）
		this.generateMipmaps = true;

		// 设置是否预乘alpha（默认为false）
		this.premultiplyAlpha = false;

		// 设置纹理的Y轴是否翻转（默认为true）
		this.flipY = true;

		// 设置纹理的解包对齐方式（有效值为1, 2, 4, 8，参见http://www.khronos.org/opengles/sdk/docs/man/xhtml/glPixelStorei.xml）
		this.unpackAlignment = 4;	// valid values: 1, 2, 4, 8 (see http://www.khronos.org/opengles/sdk/docs/man/xhtml/glPixelStorei.xml)

		// 设置纹理的颜色空间
		this.colorSpace = colorSpace;

		// 设置纹理的用户自定义数据对象
		this.userData = {};

		// 设置纹理的版本号（默认为0）
		this.version = 0;

		// 设置纹理的更新回调函数（默认为null）
		this.onUpdate = null;

		// 指示纹理是否属于渲染目标（默认为false）
		this.isRenderTargetTexture = false; // indicates whether a texture belongs to a render target or not

		// 指示纹理是否应该由PMREMGenerator处理（仅对渲染目标纹理有效，默认为0）
		this.pmremVersion = 0; // indicates whether this texture should be processed by PMREMGenerator or not (only relevant for render target textures)

	}

	get image() {

		return this.source.data;

	}

	set image( value = null ) {

		this.source.data = value;

	}

	/**
	 * 更新矩阵
	 *
	 * @description 根据当前对象的属性更新矩阵变换
	 * @returns 无返回值
	 */
	updateMatrix() {

		// 设置矩阵的UV变换参数
		this.matrix.setUvTransform(
			this.offset.x,     // U方向偏移量
			this.offset.y,     // V方向偏移量
			this.repeat.x,     // U方向重复次数
			this.repeat.y,     // V方向重复次数
			this.rotation,     // 旋转角度
			this.center.x,     // 旋转中心点X坐标
			this.center.y      // 旋转中心点Y坐标
		);

	}

	clone() {

		return new this.constructor().copy( this );

	}

	copy( source ) {

		this.name = source.name;

		this.source = source.source;
		this.mipmaps = source.mipmaps.slice( 0 );

		this.mapping = source.mapping;
		this.channel = source.channel;

		this.wrapS = source.wrapS;
		this.wrapT = source.wrapT;

		this.magFilter = source.magFilter;
		this.minFilter = source.minFilter;

		this.anisotropy = source.anisotropy;

		this.format = source.format;
		this.internalFormat = source.internalFormat;
		this.type = source.type;

		this.offset.copy( source.offset );
		this.repeat.copy( source.repeat );
		this.center.copy( source.center );
		this.rotation = source.rotation;

		this.matrixAutoUpdate = source.matrixAutoUpdate;
		this.matrix.copy( source.matrix );

		this.generateMipmaps = source.generateMipmaps;
		this.premultiplyAlpha = source.premultiplyAlpha;
		this.flipY = source.flipY;
		this.unpackAlignment = source.unpackAlignment;
		this.colorSpace = source.colorSpace;

		this.userData = JSON.parse( JSON.stringify( source.userData ) );

		this.needsUpdate = true;

		return this;

	}

	toJSON( meta ) {

		const isRootObject = ( meta === undefined || typeof meta === 'string' );

		if ( ! isRootObject && meta.textures[ this.uuid ] !== undefined ) {

			return meta.textures[ this.uuid ];

		}

		const output = {

			metadata: {
				version: 4.6,
				type: 'Texture',
				generator: 'Texture.toJSON'
			},

			uuid: this.uuid,
			name: this.name,

			image: this.source.toJSON( meta ).uuid,

			mapping: this.mapping,
			channel: this.channel,

			repeat: [ this.repeat.x, this.repeat.y ],
			offset: [ this.offset.x, this.offset.y ],
			center: [ this.center.x, this.center.y ],
			rotation: this.rotation,

			wrap: [ this.wrapS, this.wrapT ],

			format: this.format,
			internalFormat: this.internalFormat,
			type: this.type,
			colorSpace: this.colorSpace,

			minFilter: this.minFilter,
			magFilter: this.magFilter,
			anisotropy: this.anisotropy,

			flipY: this.flipY,

			generateMipmaps: this.generateMipmaps,
			premultiplyAlpha: this.premultiplyAlpha,
			unpackAlignment: this.unpackAlignment

		};

		if ( Object.keys( this.userData ).length > 0 ) output.userData = this.userData;

		if ( ! isRootObject ) {

			meta.textures[ this.uuid ] = output;

		}

		return output;

	}

	dispose() {

		this.dispatchEvent( { type: 'dispose' } );

	}

	transformUv( uv ) {

		if ( this.mapping !== UVMapping ) return uv;

		uv.applyMatrix3( this.matrix );

		if ( uv.x < 0 || uv.x > 1 ) {

			switch ( this.wrapS ) {

				case RepeatWrapping:

					uv.x = uv.x - Math.floor( uv.x );
					break;

				case ClampToEdgeWrapping:

					uv.x = uv.x < 0 ? 0 : 1;
					break;

				case MirroredRepeatWrapping:

					if ( Math.abs( Math.floor( uv.x ) % 2 ) === 1 ) {

						uv.x = Math.ceil( uv.x ) - uv.x;

					} else {

						uv.x = uv.x - Math.floor( uv.x );

					}

					break;

			}

		}

		if ( uv.y < 0 || uv.y > 1 ) {

			switch ( this.wrapT ) {

				case RepeatWrapping:

					uv.y = uv.y - Math.floor( uv.y );
					break;

				case ClampToEdgeWrapping:

					uv.y = uv.y < 0 ? 0 : 1;
					break;

				case MirroredRepeatWrapping:

					if ( Math.abs( Math.floor( uv.y ) % 2 ) === 1 ) {

						uv.y = Math.ceil( uv.y ) - uv.y;

					} else {

						uv.y = uv.y - Math.floor( uv.y );

					}

					break;

			}

		}

		if ( this.flipY ) {

			uv.y = 1 - uv.y;

		}

		return uv;

	}

	set needsUpdate( value ) {

		if ( value === true ) {

			this.version ++;
			this.source.needsUpdate = true;

		}

	}

	set needsPMREMUpdate( value ) {

		if ( value === true ) {

			this.pmremVersion ++;

		}

	}

}

Texture.DEFAULT_IMAGE = null;
Texture.DEFAULT_MAPPING = UVMapping;
Texture.DEFAULT_ANISOTROPY = 1;

export { Texture };
