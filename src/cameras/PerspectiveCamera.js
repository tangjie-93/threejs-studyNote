import { Camera } from './Camera.js';
import * as MathUtils from '../math/MathUtils.js';
import { Vector2 } from '../math/Vector2.js';
import { Vector3 } from '../math/Vector3.js';

const _v3 = /*@__PURE__*/ new Vector3();
const _minTarget = /*@__PURE__*/ new Vector2();
const _maxTarget = /*@__PURE__*/ new Vector2();


class PerspectiveCamera extends Camera {

	/**
	 * 构造函数，创建一个透视相机对象
	 *
	 * @param fov 视野角度，默认为50
	 * @param aspect 纵横比，默认为1
	 * @param near 近裁剪面距离，默认为0.1
	 * @param far 远裁剪面距离，默认为2000
	 */
	constructor( fov = 50, aspect = 1, near = 0.1, far = 2000 ) {

		super();

		// 标记为透视相机
		this.isPerspectiveCamera = true;

		// 相机类型
		this.type = 'PerspectiveCamera';

		// 视野角度
		this.fov = fov;
		// 缩放比例
		this.zoom = 1;

		// 近平面距离
		this.near = near;
		// 远平面距离
		this.far = far;
		// 焦距
		this.focus = 10;

		// 宽高比
		this.aspect = aspect;
		// 视图
		this.view = null;

		// 胶片宽度（默认为毫米）
		// width of the film (default in millimeters)
		this.filmGauge = 35;
		// 胶片水平偏移量（与胶片宽度相同的单位）
		// horizontal film offset (same unit as gauge)
		this.filmOffset = 0;

		// 更新投影矩阵
		this.updateProjectionMatrix();

	}

	copy( source, recursive ) {

		super.copy( source, recursive );

		this.fov = source.fov;
		this.zoom = source.zoom;

		this.near = source.near;
		this.far = source.far;
		this.focus = source.focus;

		this.aspect = source.aspect;
		this.view = source.view === null ? null : Object.assign( {}, source.view );

		this.filmGauge = source.filmGauge;
		this.filmOffset = source.filmOffset;

		return this;

	}

	/**
	 * Sets the FOV by focal length in respect to the current .filmGauge.
	 *
	 * The default film gauge is 35, so that the focal length can be specified for
	 * a 35mm (full frame) camera.
	 *
	 * Values for focal length and film gauge must have the same unit.
	 */
	setFocalLength( focalLength ) {

		/** see {@link http://www.bobatkins.com/photography/technical/field_of_view.html} */
		const vExtentSlope = 0.5 * this.getFilmHeight() / focalLength;

		this.fov = MathUtils.RAD2DEG * 2 * Math.atan( vExtentSlope );
		this.updateProjectionMatrix();

	}

	/**
	 * Calculates the focal length from the current .fov and .filmGauge.
	 */
	getFocalLength() {

		const vExtentSlope = Math.tan( MathUtils.DEG2RAD * 0.5 * this.fov );

		return 0.5 * this.getFilmHeight() / vExtentSlope;

	}

	getEffectiveFOV() {

		return MathUtils.RAD2DEG * 2 * Math.atan(
			Math.tan( MathUtils.DEG2RAD * 0.5 * this.fov ) / this.zoom );

	}

	getFilmWidth() {

		// film not completely covered in portrait format (aspect < 1)
		return this.filmGauge * Math.min( this.aspect, 1 );

	}

	getFilmHeight() {

		// film not completely covered in landscape format (aspect > 1)
		return this.filmGauge / Math.max( this.aspect, 1 );

	}

	/**
	 * Computes the 2D bounds of the camera's viewable rectangle at a given distance along the viewing direction.
	 * Sets minTarget and maxTarget to the coordinates of the lower-left and upper-right corners of the view rectangle.
	 */
	getViewBounds( distance, minTarget, maxTarget ) {

		_v3.set( - 1, - 1, 0.5 ).applyMatrix4( this.projectionMatrixInverse );

		minTarget.set( _v3.x, _v3.y ).multiplyScalar( - distance / _v3.z );

		_v3.set( 1, 1, 0.5 ).applyMatrix4( this.projectionMatrixInverse );

		maxTarget.set( _v3.x, _v3.y ).multiplyScalar( - distance / _v3.z );

	}

	/**
	 * Computes the width and height of the camera's viewable rectangle at a given distance along the viewing direction.
	 * Copies the result into the target Vector2, where x is width and y is height.
	 */
	getViewSize( distance, target ) {

		this.getViewBounds( distance, _minTarget, _maxTarget );

		return target.subVectors( _maxTarget, _minTarget );

	}

	/**
	 * Sets an offset in a larger frustum. This is useful for multi-window or
	 * multi-monitor/multi-machine setups.
	 *
	 * For example, if you have 3x2 monitors and each monitor is 1920x1080 and
	 * the monitors are in grid like this
	 *
	 *   +---+---+---+
	 *   | A | B | C |
	 *   +---+---+---+
	 *   | D | E | F |
	 *   +---+---+---+
	 *
	 * then for each monitor you would call it like this
	 *
	 *   const w = 1920;
	 *   const h = 1080;
	 *   const fullWidth = w * 3;
	 *   const fullHeight = h * 2;
	 *
	 *   --A--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 0, h * 0, w, h );
	 *   --B--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 1, h * 0, w, h );
	 *   --C--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 2, h * 0, w, h );
	 *   --D--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 0, h * 1, w, h );
	 *   --E--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 1, h * 1, w, h );
	 *   --F--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 2, h * 1, w, h );
	 *
	 *   Note there is no reason monitors have to be the same size or in a grid.
	 */
	setViewOffset( fullWidth, fullHeight, x, y, width, height ) {

		this.aspect = fullWidth / fullHeight;

		if ( this.view === null ) {

			this.view = {
				enabled: true,
				fullWidth: 1,
				fullHeight: 1,
				offsetX: 0,
				offsetY: 0,
				width: 1,
				height: 1
			};

		}

		this.view.enabled = true;
		this.view.fullWidth = fullWidth;
		this.view.fullHeight = fullHeight;
		this.view.offsetX = x;
		this.view.offsetY = y;
		this.view.width = width;
		this.view.height = height;

		this.updateProjectionMatrix();

	}

	clearViewOffset() {

		if ( this.view !== null ) {

			this.view.enabled = false;

		}

		this.updateProjectionMatrix();

	}

	/**
	 * 更新投影矩阵
	 *
	 * @returns 无返回值
	 */
	updateProjectionMatrix() {

		// 获取近平面距离
		const near = this.near;

		// 计算顶部边界
		let top = near * Math.tan( MathUtils.DEG2RAD * 0.5 * this.fov ) / this.zoom;

		// 计算高度
		let height = 2 * top;

		// 计算宽度
		let width = this.aspect * height;

		// 计算左边边界
		let left = - 0.5 * width;

		// 获取视图对象
		const view = this.view;

		// 如果视图对象不为空且启用
		if ( this.view !== null && this.view.enabled ) {

			// 获取视图的完整宽度和高度
			const fullWidth = view.fullWidth,
				fullHeight = view.fullHeight;

			// 根据视图的偏移量调整左边边界
			left += view.offsetX * width / fullWidth;

			// 根据视图的偏移量调整顶部边界
			top -= view.offsetY * height / fullHeight;

			// 根据视图的尺寸调整宽度
			width *= view.width / fullWidth;

			// 根据视图的尺寸调整高度
			height *= view.height / fullHeight;

		}

		// 获取镜头偏移量
		const skew = this.filmOffset;

		// 如果镜头偏移量不为0，根据偏移量和胶片宽度调整左边边界
		if ( skew !== 0 ) left += near * skew / this.getFilmWidth();

		// 设置透视投影矩阵 投影矩阵用于将3D的相机坐标转换为2D的屏幕坐标
		this.projectionMatrix.makePerspective( left, left + width, top, top - height, near, this.far, this.coordinateSystem );

		// 复制透视投影矩阵并求逆 得到相机空间中的坐标矩阵
		// 对透视投影矩阵求逆得到的是一个矩阵，它可以将标准化设备坐标（或裁剪空间）中的坐标转换回视图空间（或相机空间）中的坐标
		// 逆投影矩阵用于将2D的屏幕坐标转换回3D的相机坐标
		this.projectionMatrixInverse.copy( this.projectionMatrix ).invert();

	}

	toJSON( meta ) {

		const data = super.toJSON( meta );

		data.object.fov = this.fov;
		data.object.zoom = this.zoom;

		data.object.near = this.near;
		data.object.far = this.far;
		data.object.focus = this.focus;

		data.object.aspect = this.aspect;

		if ( this.view !== null ) data.object.view = Object.assign( {}, this.view );

		data.object.filmGauge = this.filmGauge;
		data.object.filmOffset = this.filmOffset;

		return data;

	}

}

export { PerspectiveCamera };
