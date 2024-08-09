import { Matrix4 } from '../math/Matrix4.js';
import { Ray } from '../math/Ray.js';
import { Layers } from './Layers.js';

const _matrix = /*@__PURE__*/ new Matrix4();

class Raycaster {

	constructor( origin, direction, near = 0, far = Infinity ) {

		// 创建一个射线对象，起点为 origin，方向为 direction
		this.ray = new Ray( origin, direction );

		// direction 被假定为已经归一化（为了进行精确的距离计算）
		// direction is assumed to be normalized (for accurate distance calculations)

		// 设置近平面距离
		this.near = near;

		// 设置远平面距离
		this.far = far;

		// 相机对象初始化为 null
		this.camera = null;

		// 创建一个图层对象
		this.layers = new Layers();

		// 设置参数对象
		this.params = {
			// 网格参数
			Mesh: {},
			// 线段参数，包含阈值
			Line: { threshold: 1 },
			// 细节层次参数
			LOD: {},
			// 点参数，包含阈值
			Points: { threshold: 1 },
			//精灵参数
			Sprite: {}
		};

	}

	/**
	 * 设置射线起点和方向
	 *
	 * @param origin 射线起点
	 * @param direction 射线方向（假设已标准化，以进行准确的距离计算）
	 */
	set( origin, direction ) {

		// direction is assumed to be normalized (for accurate distance calculations)

		this.ray.set( origin, direction );

	}

	/**
	 * 根据给定的坐标和相机设置射线起点和方向
	 *
	 * @param coords 坐标对象，包含x和y属性
	 * @param camera 相机对象，可以是透视相机或正交相机
	 */
	setFromCamera( coords, camera ) {

		if ( camera.isPerspectiveCamera ) {

			this.ray.origin.setFromMatrixPosition( camera.matrixWorld );
			this.ray.direction.set( coords.x, coords.y, 0.5 ).unproject( camera ).sub( this.ray.origin ).normalize();
			this.camera = camera;

		} else if ( camera.isOrthographicCamera ) {

			this.ray.origin.set( coords.x, coords.y, ( camera.near + camera.far ) / ( camera.near - camera.far ) ).unproject( camera ); // set origin in plane of camera
			this.ray.direction.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
			this.camera = camera;

		} else {

			console.error( 'THREE.Raycaster: Unsupported camera type: ' + camera.type );

		}

	}

	/**
	 * 设置来自XR控制器的参数
	 *
	 * @param controller XR控制器实例
	 * @returns 返回该实例，方便链式调用
	 */
	setFromXRController( controller ) {

		_matrix.identity().extractRotation( controller.matrixWorld );

		this.ray.origin.setFromMatrixPosition( controller.matrixWorld );
		this.ray.direction.set( 0, 0, - 1 ).applyMatrix4( _matrix );

		return this;

	}

	/**
	 * 计算物体之间的交集
	 *
	 * @param object 物体对象
	 * @param recursive 是否递归计算交集，默认为true
	 * @param intersects 交集数组，默认为空数组
	 * @returns 返回交集数组
	 */
	intersectObject( object, recursive = true, intersects = [] ) {

		intersect( object, this, intersects, recursive );

		intersects.sort( ascSort );

		return intersects;

	}

	/**
	 * 计算物体之间的交集
	 *
	 * @param objects 物体数组
	 * @param recursive 是否递归计算交集，默认为true
	 * @param intersects 初始交集数组，默认为空数组
	 * @returns 交集数组
	 */
	intersectObjects( objects, recursive = true, intersects = [] ) {

		for ( let i = 0, l = objects.length; i < l; i ++ ) {

			intersect( objects[ i ], this, intersects, recursive );

		}

		intersects.sort( ascSort );

		return intersects;

	}

}

/**
 * 升序排序函数
 *
 * @param a 第一个比较对象
 * @param b 第二个比较对象
 * @returns 返回a和b的距离差值
 */
function ascSort( a, b ) {

	return a.distance - b.distance;

}

/**
 * 射线与物体求交
 *
 * @param object 物体对象
 * @param raycaster 射线投射器对象
 * @param intersects 射线与物体求交的结果数组
 * @param recursive 是否递归遍历子物体
 * @returns 无返回值
 */
function intersect( object, raycaster, intersects, recursive ) {

	let propagate = true;

	// 检查对象的层是否与射线投射器的层相交
	if ( object.layers.test( raycaster.layers ) ) {

		// 使用对象的 raycast 方法进行射线与对象的相交检测
		const result = object.raycast( raycaster, intersects );

		// 如果检测结果为 false，则不继续向下传播
		if ( result === false ) propagate = false;

	}

	// 如果需要继续向下传播且开启了递归选项
	if ( propagate === true && recursive === true ) {

		// 获取对象的子对象列表
		const children = object.children;

		// 遍历子对象列表
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			// 对每个子对象递归调用 intersect 函数
			intersect( children[ i ], raycaster, intersects, true );

		}

	}

}

export { Raycaster };
