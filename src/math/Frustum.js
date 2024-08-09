import { WebGLCoordinateSystem, WebGPUCoordinateSystem } from '../constants.js';
import { Vector3 } from './Vector3.js';
import { Sphere } from './Sphere.js';
import { Plane } from './Plane.js';

const _sphere = /*@__PURE__*/ new Sphere();
const _vector = /*@__PURE__*/ new Vector3();

class Frustum {

    /**
     * @description
     * 创建一个新的 Frustum 实例。
     *
     * @param {Plane} [p0=new Plane()] - 第一个平面，默认为新的 Plane 实例
     * @param {Plane} [p1=new Plane()] - 第二个平面，默认为新的 Plane 实例
     * @param {Plane} [p2=new Plane()] - 第三个平面，默认为新的 Plane 实例
     * @param {Plane} [p3=new Plane()] - 第四个平面，默认为新的 Plane 实例
     * @param {Plane} [p4=new Plane()] - 第五个平面，默认为新的 Plane 实例
     * @param {Plane} [p5=new Plane()] - 第六个平面，默认为新的 Plane 实例
     *
     * @returns {Frustum} 返回一个新的 Frustum 实例
     */
	constructor( p0 = new Plane(), p1 = new Plane(), p2 = new Plane(), p3 = new Plane(), p4 = new Plane(), p5 = new Plane() ) {

		this.planes = [ p0, p1, p2, p3, p4, p5 ];

	}

    /**
     * @method set
     * @param {THREE.Plane} p0
     * @param {THREE.Plane} p1
     * @param {THREE.Plane} p2
     * @param {THREE.Plane} p3
     * @param {THREE.Plane} p4
     * @param {THREE.Plane} p5
     * @return {Box3} 返回自身以支持链式调用
     *
     * 设置Box3的六个面。
     */
	set( p0, p1, p2, p3, p4, p5 ) {

		const planes = this.planes;

		planes[ 0 ].copy( p0 );
		planes[ 1 ].copy( p1 );
		planes[ 2 ].copy( p2 );
		planes[ 3 ].copy( p3 );
		planes[ 4 ].copy( p4 );
		planes[ 5 ].copy( p5 );

		return this;

	}

    /**
     * @method copy
     * @param {Frustum} frustum 待复制的Frustum对象
     * @returns {Frustum} 返回自身，表示已经被复制了
     *
     * 将指定的Frustum对象复制到当前Frustum对象中。
     */
	copy( frustum ) {

		const planes = this.planes;

		for ( let i = 0; i < 6; i ++ ) {

			planes[ i ].copy( frustum.planes[ i ] );

		}

		return this;

	}

	/**
	 * 从投影矩阵中设置视图锥体。
	 *
	 * @param m 投影矩阵。
	 * @param coordinateSystem 坐标系统，默认为WebGL坐标系统。
	 * @returns 返回当前视图锥体对象。
	 * @throws 当坐标系统无效时，抛出错误。
	 */
	setFromProjectionMatrix( m, coordinateSystem = WebGLCoordinateSystem ) {

		const planes = this.planes;
		const me = m.elements;
		const me0 = me[ 0 ], me1 = me[ 1 ], me2 = me[ 2 ], me3 = me[ 3 ];
		const me4 = me[ 4 ], me5 = me[ 5 ], me6 = me[ 6 ], me7 = me[ 7 ];
		const me8 = me[ 8 ], me9 = me[ 9 ], me10 = me[ 10 ], me11 = me[ 11 ];
		const me12 = me[ 12 ], me13 = me[ 13 ], me14 = me[ 14 ], me15 = me[ 15 ];

		planes[ 0 ].setComponents( me3 - me0, me7 - me4, me11 - me8, me15 - me12 ).normalize();
		planes[ 1 ].setComponents( me3 + me0, me7 + me4, me11 + me8, me15 + me12 ).normalize();
		planes[ 2 ].setComponents( me3 + me1, me7 + me5, me11 + me9, me15 + me13 ).normalize();
		planes[ 3 ].setComponents( me3 - me1, me7 - me5, me11 - me9, me15 - me13 ).normalize();
		planes[ 4 ].setComponents( me3 - me2, me7 - me6, me11 - me10, me15 - me14 ).normalize();

		if ( coordinateSystem === WebGLCoordinateSystem ) {

			planes[ 5 ].setComponents( me3 + me2, me7 + me6, me11 + me10, me15 + me14 ).normalize();

		} else if ( coordinateSystem === WebGPUCoordinateSystem ) {

			planes[ 5 ].setComponents( me2, me6, me10, me14 ).normalize();

		} else {

			throw new Error( 'THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: ' + coordinateSystem );

		}

		return this;

	}

    /**
     * @method intersectsObject
     * @param {THREE.Object3D} object THREE.Object3D对象
     * @returns {boolean} 返回true表示相交，否则为false
     *
     * 判断球与指定的THREE.Object3D对象是否相交。如果对象没有绑定半径，会先计算其包围球并应用世界变换。
     */
	intersectsObject( object ) {

		if ( object.boundingSphere !== undefined ) {

			if ( object.boundingSphere === null ) object.computeBoundingSphere();

			_sphere.copy( object.boundingSphere ).applyMatrix4( object.matrixWorld );

		} else {

			const geometry = object.geometry;

			if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

			_sphere.copy( geometry.boundingSphere ).applyMatrix4( object.matrixWorld );

		}

		return this.intersectsSphere( _sphere );

	}

    /**
     * @method intersectsSprite
     * @param {THREE.Sprite} sprite
     * @returns {boolean}
     * @description 判断是否与精灵相交。返回布尔值，表示是否相交。
     */
	intersectsSprite( sprite ) {

		_sphere.center.set( 0, 0, 0 );
		_sphere.radius = 0.7071067811865476;
		_sphere.applyMatrix4( sprite.matrixWorld );

		return this.intersectsSphere( _sphere );

	}

    /**
     * @method intersectsSphere
     * @param {THREE.Sphere} sphere
     * @returns {boolean} True if the frustum intersects the given sphere, otherwise false.
     * @description
     * Checks whether the frustum intersects with a given sphere.
     */
	intersectsSphere( sphere ) {

		const planes = this.planes;
		const center = sphere.center;
		const negRadius = - sphere.radius;

		for ( let i = 0; i < 6; i ++ ) {

			const distance = planes[ i ].distanceToPoint( center );

			if ( distance < negRadius ) {

				return false;

			}

		}

		return true;

	}

    /**
     * @method intersectsBox
     * @param {THREE.Box3} box
     * @return {boolean} True if the frustum intersects the given box, otherwise false.
     * @description
     * Checks whether the frustum intersects with a given bounding box.
     */
	intersectsBox( box ) {

		const planes = this.planes;

		for ( let i = 0; i < 6; i ++ ) {

			const plane = planes[ i ];

			// corner at max distance

			_vector.x = plane.normal.x > 0 ? box.max.x : box.min.x;
			_vector.y = plane.normal.y > 0 ? box.max.y : box.min.y;
			_vector.z = plane.normal.z > 0 ? box.max.z : box.min.z;

			if ( plane.distanceToPoint( _vector ) < 0 ) {

				return false;

			}

		}

		return true;

	}

    /**
     * @method containsPoint
     * @param {THREE.Vector3} point
     * @returns {boolean} True if the bounding box contains the given point, otherwise False.
     * @description 判断包围盒是否包含给定的点。
     */
	containsPoint( point ) {

		const planes = this.planes;

		for ( let i = 0; i < 6; i ++ ) {

			if ( planes[ i ].distanceToPoint( point ) < 0 ) {

				return false;

			}

		}

		return true;

	}

    /**
     * 复制当前对象，返回一个新的对象。
     *
     * @returns {Object3D} 返回一个新的 Object3D 实例，它是当前对象的深度克隆。
     */
	clone() {

		return new this.constructor().copy( this );

	}

}


export { Frustum };
