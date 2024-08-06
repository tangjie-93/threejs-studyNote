import { Texture } from './Texture.js';
import { CubeReflectionMapping } from '../constants.js';

class CubeTexture extends Texture {

	constructor( images, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace ) {

		// 如果传入的 images 参数未定义，则将其设置为空数组
		images = images !== undefined ? images : [];

		// 如果传入的 mapping 参数未定义，则将其设置为 CubeReflectionMapping
		mapping = mapping !== undefined ? mapping : CubeReflectionMapping;

		// 调用父类的构造函数，传入相应的参数
		super( images, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace );

		// 设置当前实例的 isCubeTexture 属性为 true
		this.isCubeTexture = true;

		// 设置当前实例的 flipY 属性为 false
		this.flipY = false;

	}

	get images() {

		return this.image;

	}

	set images( value ) {

		this.image = value;

	}

}

export { CubeTexture };
