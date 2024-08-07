import { createElementNS } from '../utils.js';
import { SRGBToLinear } from '../math/ColorManagement.js';

let _canvas;

class ImageUtils {

	static getDataURL( image ) {

		if ( /^data:/i.test( image.src ) ) {

			return image.src;

		}

		if ( typeof HTMLCanvasElement === 'undefined' ) {

			return image.src;

		}

		let canvas;

		if ( image instanceof HTMLCanvasElement ) {

			canvas = image;

		} else {

			if ( _canvas === undefined ) _canvas = createElementNS( 'canvas' );

			_canvas.width = image.width;
			_canvas.height = image.height;

			const context = _canvas.getContext( '2d' );

			if ( image instanceof ImageData ) {

				context.putImageData( image, 0, 0 );

			} else {

				context.drawImage( image, 0, 0, image.width, image.height );

			}

			canvas = _canvas;

		}

		if ( canvas.width > 2048 || canvas.height > 2048 ) {

			console.warn( 'THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons', image );

			return canvas.toDataURL( 'image/jpeg', 0.6 );

		} else {

			return canvas.toDataURL( 'image/png' );

		}

	}

	/**
	 * 将sRGB颜色空间转换为线性颜色空间
	 *
	 * @param image 输入的图像对象，支持HTMLImageElement、HTMLCanvasElement和ImageBitmap类型，或具有data属性的对象
	 * @returns 转换后的图像对象，若输入为HTMLImageElement或HTMLCanvasElement类型，则返回canvas对象；若输入为具有data属性的对象，则返回包含data、width和height的对象；若输入类型不支持，则返回原始图像对象
	 */
	static sRGBToLinear( image ) {

		// 判断传入的image是否为HTMLImageElement、HTMLCanvasElement或ImageBitmap类型的对象
		if ( ( typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement ) ||
			( typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement ) ||
			( typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap ) ) {

			// 创建一个canvas元素
			const canvas = createElementNS( 'canvas' );

			// 设置canvas的宽度和高度与传入的image相同
			canvas.width = image.width;
			canvas.height = image.height;

			// 获取canvas的2D渲染上下文
			const context = canvas.getContext( '2d' );

			// 将传入的image绘制到canvas上
			context.drawImage( image, 0, 0, image.width, image.height );

			// 获取canvas上的图像数据
			const imageData = context.getImageData( 0, 0, image.width, image.height );
			const data = imageData.data;

			// 遍历图像数据数组，将每个像素值从sRGB空间转换到线性空间
			for ( let i = 0; i < data.length; i ++ ) {

				data[ i ] = SRGBToLinear( data[ i ] / 255 ) * 255;

			}

			// 将转换后的图像数据设置回canvas
			context.putImageData( imageData, 0, 0 );

			// 返回canvas元素
			return canvas;

		// 如果传入的image具有data属性（可能是一个ImageData对象）
		} else if ( image.data ) {

			// 复制一份data数据
			const data = image.data.slice( 0 );

			// 遍历data数组
			for ( let i = 0; i < data.length; i ++ ) {

				// 判断data是否为Uint8Array或Uint8ClampedArray类型
				if ( data instanceof Uint8Array || data instanceof Uint8ClampedArray ) {

					// 如果是，则将像素值从sRGB空间转换到线性空间，并取整
					data[ i ] = Math.floor( SRGBToLinear( data[ i ] / 255 ) * 255 );

				} else {

					// 否则，假设data为浮点数类型，直接将像素值从sRGB空间转换到线性空间
					// assuming float
					data[ i ] = SRGBToLinear( data[ i ] );

				}

			}

			// 返回一个包含转换后的data、宽度和高度的对象
			return {
				data: data,
				width: image.width,
				height: image.height
			};

		// 如果传入的image类型不支持，则输出警告并返回原image
		} else {

			console.warn( 'THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.' );
			return image;

		}

	}

}

export { ImageUtils };
