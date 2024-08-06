import { CubeReflectionMapping, CubeRefractionMapping, EquirectangularReflectionMapping, EquirectangularRefractionMapping } from '../../constants.js';
import { WebGLCubeRenderTarget } from '../WebGLCubeRenderTarget.js';

/**
 * WebGLCubeMaps 构造函数，用于创建 WebGLCubeMaps 实例
 *
 * @param {WebGLRenderer} renderer WebGL渲染器
 * @returns {Object} WebGLCubeMaps实例，包含get和dispose方法
 */
function WebGLCubeMaps( renderer ) {

	let cubemaps = new WeakMap();

	/**
	 * 将纹理映射方式转换为对应的立方体映射方式
	 *
	 * @param texture 纹理对象
	 * @param mapping 原始映射方式，可选值为 EquirectangularReflectionMapping 或 EquirectangularRefractionMapping
	 * @returns 转换后的纹理对象
	 */
	function mapTextureMapping( texture, mapping ) {

		if ( mapping === EquirectangularReflectionMapping ) {

			texture.mapping = CubeReflectionMapping;

		} else if ( mapping === EquirectangularRefractionMapping ) {

			texture.mapping = CubeRefractionMapping;

		}

		return texture;

	}

	/**
	 * 根据纹理对象获取转换后的纹理
	 *
	 * @param texture 纹理对象
	 * @returns 转换后的纹理对象，如果转换失败则返回原纹理对象
	 */
	function get( texture ) {

		if ( texture && texture.isTexture ) {

			const mapping = texture.mapping;

			if ( mapping === EquirectangularReflectionMapping || mapping === EquirectangularRefractionMapping ) {

				if ( cubemaps.has( texture ) ) {

					const cubemap = cubemaps.get( texture ).texture;
					return mapTextureMapping( cubemap, texture.mapping );

				} else {

					const image = texture.image;

					if ( image && image.height > 0 ) {

						const renderTarget = new WebGLCubeRenderTarget( image.height );
						renderTarget.fromEquirectangularTexture( renderer, texture );
						cubemaps.set( texture, renderTarget );

						texture.addEventListener( 'dispose', onTextureDispose );

						return mapTextureMapping( renderTarget.texture, texture.mapping );

					} else {

						// image not yet ready. try the conversion next frame

						return null;

					}

				}

			}

		}

		return texture;

	}

	/**
	 * 当纹理被销毁时触发
	 *
	 * @param event 事件对象
	 */
	function onTextureDispose( event ) {

		const texture = event.target;

		texture.removeEventListener( 'dispose', onTextureDispose );

		const cubemap = cubemaps.get( texture );

		if ( cubemap !== undefined ) {

			cubemaps.delete( texture );
			cubemap.dispose();

		}

	}

	function dispose() {

		cubemaps = new WeakMap();

	}

	return {
		get: get,
		dispose: dispose
	};

}

export { WebGLCubeMaps };
