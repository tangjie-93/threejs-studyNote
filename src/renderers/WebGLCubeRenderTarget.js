import { BackSide, LinearFilter, LinearMipmapLinearFilter, NoBlending } from '../constants.js';
import { Mesh } from '../objects/Mesh.js';
import { BoxGeometry } from '../geometries/BoxGeometry.js';
import { ShaderMaterial } from '../materials/ShaderMaterial.js';
import { cloneUniforms } from './shaders/UniformsUtils.js';
import { WebGLRenderTarget } from './WebGLRenderTarget.js';
import { CubeCamera } from '../cameras/CubeCamera.js';
import { CubeTexture } from '../textures/CubeTexture.js';

class WebGLCubeRenderTarget extends WebGLRenderTarget {

	constructor( size = 1, options = {} ) {

		super( size, size, options );

		this.isWebGLCubeRenderTarget = true;

		const image = { width: size, height: size, depth: 1 };
		const images = [ image, image, image, image, image, image ];

		this.texture = new CubeTexture( images, options.mapping, options.wrapS, options.wrapT, options.magFilter, options.minFilter, options.format, options.type, options.anisotropy, options.colorSpace );

		// By convention -- likely based on the RenderMan spec from the 1990's -- cube maps are specified by WebGL (and three.js)
		// in a coordinate system in which positive-x is to the right when looking up the positive-z axis -- in other words,
		// in a left-handed coordinate system. By continuing this convention, preexisting cube maps continued to render correctly.

		// three.js uses a right-handed coordinate system. So environment maps used in three.js appear to have px and nx swapped
		// and the flag isRenderTargetTexture controls this conversion. The flip is not required when using WebGLCubeRenderTarget.texture
		// as a cube texture (this is detected when isRenderTargetTexture is set to true for cube textures).

		this.texture.isRenderTargetTexture = true;

		this.texture.generateMipmaps = options.generateMipmaps !== undefined ? options.generateMipmaps : false;
		this.texture.minFilter = options.minFilter !== undefined ? options.minFilter : LinearFilter;

	}

	/**
	 * 从等距柱状纹理生成立方体纹理
	 *
	 * @param renderer 渲染器
	 * @param texture 等距柱状纹理
	 * @returns 返回当前对象
	 */
	fromEquirectangularTexture( renderer, texture ) {

		// 设置纹理类型
		this.texture.type = texture.type;
		// 设置颜色空间
		this.texture.colorSpace = texture.colorSpace;

		// 设置是否生成mipmap
		this.texture.generateMipmaps = texture.generateMipmaps;
		// 设置最小过滤方式
		this.texture.minFilter = texture.minFilter;
		// 设置放大过滤方式
		this.texture.magFilter = texture.magFilter;

		const shader = {

			uniforms: {
				tEquirect: { value: null },
			},

			vertexShader: /* glsl */`
				// 顶点着色器代码开始
				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
				}

				void main() {
					vWorldDirection = transformDirection( position, modelMatrix );
					#include <begin_vertex>
					#include <project_vertex>
				}
			// 顶点着色器代码结束
			`,

			fragmentShader: /* glsl */`
				// 片段着色器代码开始
				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {
					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );
				}
			// 片段着色器代码结束
			`
		};

		// 创建立方体几何体
		const geometry = new BoxGeometry( 5, 5, 5 );

		// 创建着色器材质
		const material = new ShaderMaterial( {
			name: 'CubemapFromEquirect',
			uniforms: cloneUniforms( shader.uniforms ),
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader,
			side: BackSide,
			blending: NoBlending
		} );

		// 将传入的纹理赋值给着色器材质的uniform变量
		material.uniforms.tEquirect.value = texture;

		// 创建网格对象
		const mesh = new Mesh( geometry, material );

		// 保存当前纹理的最小过滤方式
		const currentMinFilter = texture.minFilter;

		// 避免极点模糊
		// 如果纹理的最小过滤方式为线性mipmap线性过滤，则改为线性过滤
		// Avoid blurred poles
		if ( texture.minFilter === LinearMipmapLinearFilter ) texture.minFilter = LinearFilter;

		// 创建立方体相机
		const camera = new CubeCamera( 1, 10, this );
		// 更新立方体相机的视图
		camera.update( renderer, mesh );

		// 恢复纹理的最小过滤方式
		texture.minFilter = currentMinFilter;

		// 销毁网格对象的几何体和材质
		// 用完就销毁？
		mesh.geometry.dispose();
		mesh.material.dispose();

		return this;

	}

	/**
	 * 清除渲染器缓冲区中的颜色、深度和模板信息
	 *
	 * @param renderer 渲染器对象
	 * @param color 颜色值
	 * @param depth 深度值
	 * @param stencil 模板值
	 */
	clear( renderer, color, depth, stencil ) {

		const currentRenderTarget = renderer.getRenderTarget();

		for ( let i = 0; i < 6; i ++ ) {

			renderer.setRenderTarget( this, i );

			renderer.clear( color, depth, stencil );

		}

		renderer.setRenderTarget( currentRenderTarget );

	}

}

export { WebGLCubeRenderTarget };
