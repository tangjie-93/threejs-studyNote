import { Vector3 } from './Vector3.js';

const _vector = /*@__PURE__*/ new Vector3();
const _segCenter = /*@__PURE__*/ new Vector3();
const _segDir = /*@__PURE__*/ new Vector3();
const _diff = /*@__PURE__*/ new Vector3();

const _edge1 = /*@__PURE__*/ new Vector3();
const _edge2 = /*@__PURE__*/ new Vector3();
const _normal = /*@__PURE__*/ new Vector3();

class Ray {

	constructor( origin = new Vector3(), direction = new Vector3( 0, 0, - 1 ) ) {
		// 初始化原点的值为传入的origin参数，如果未传入则默认为一个新的Vector3对象
		this.origin = origin;// 设置原点坐标
		// 初始化方向向量的值为传入的direction参数，如果未传入则默认为(0, 0, -1)
		this.direction = direction;// 设置方向向量
	}

	/**
	 * 设置起始点和方向向量
	 *
	 * @param origin 起始点，类型为 THREE.Vector3
	 * @param direction 方向向量，类型为 THREE.Vector3
	 * @returns 返回当前对象，类型为 THREE.Raycaster
	 */
	set( origin, direction ) {

		this.origin.copy( origin );
		this.direction.copy( direction );

		return this;

	}

	copy( ray ) {

		this.origin.copy( ray.origin );
		this.direction.copy( ray.direction );

		return this;

	}


	/**
	 * 根据时间 t 和目标对象 target 计算并返回新的位置
	 *
	 * @param {number} t - 时间参数，表示动画的进度
	 * @param {Object} target - 目标对象，应包含 copy 和 addScaledVector 方法
	 * @returns {Object} 返回根据时间 t 计算得到的新位置对象
	 */
	at( t, target ) {
		// 将this.origin的值赋值为target，并将结果通过this.direction和t进行缩放后，将结果赋值给target
		// this.origin为起始点，this.direction为方向向量，t为时间或比例因子
		return target.copy( this.origin ).addScaledVector( this.direction, t );
	}

	/**
	 * 使对象朝向指定向量
	 *
	 * @param v 目标向量
	 * @returns 返回当前对象
	 */
	lookAt( v ) {

		// 将方向向量设置为向量v
		// 然后从原点减去向量v，得到新的方向向量
		// 最后对新的方向向量进行归一化处理
		this.direction.copy( v ).sub( this.origin ).normalize();

		// 返回当前对象
		return this;

	}

	/**
	 * 根据给定的时间 t，将当前对象的位置设置为在该时间 t 下，路径上对应的位置，并返回当前对象
	 *
	 * @param t 时间，类型为 number
	 * @param _vector 一个临时向量，用于计算路径上的位置，类型为 THREE.Vector3
	 * @returns 返回当前对象
	 */
	recast( t ) {

		this.origin.copy( this.at( t, _vector ) );

		return this;

	}

	/**
	 * 计算点到射线上最近的点
	 *
	 * @param point 给定的点
	 * @param target 存储计算结果的向量
	 * @returns 返回计算得到的最近点向量
	 */
	closestPointToPoint( point, target ) {

		target.subVectors( point, this.origin );

		const directionDistance = target.dot( this.direction );

		if ( directionDistance < 0 ) {

			return target.copy( this.origin );

		}

		return target.copy( this.origin ).addScaledVector( this.direction, directionDistance );

	}

	/**
	 * 计算当前点到指定点的欧氏距离
	 *
	 * @param point {Object} - 指定点的坐标对象，格式为 {x: Number, y: Number}
	 * @returns {Number} - 当前点到指定点的欧氏距离
	 */
	distanceToPoint( point ) {

		return Math.sqrt( this.distanceSqToPoint( point ) );

	}

	distanceSqToPoint( point ) {

		// 计算点相对于原点的方向向量与射线方向的点积
		const directionDistance = _vector.subVectors( point, this.origin ).dot( this.direction );

		// 如果点在射线后面
		// point behind the ray

		// 如果方向距离小于0，则点位于射线之后
		if ( directionDistance < 0 ) {

			// 返回原点到点的平方距离
			return this.origin.distanceToSquared( point );

		}

		// 在射线上找到距离原点方向距离为directionDistance的点
		_vector.copy( this.origin ).addScaledVector( this.direction, directionDistance );

		// 返回找到的点到点的平方距离
		return _vector.distanceToSquared( point );

	}

	/**
	 * 计算射线与线段之间的最小距离的平方
	 *
	 * @param v0 线段的起点坐标
	 * @param v1 线段的终点坐标
	 * @param optionalPointOnRay 可选参数，用于存储射线上距离线段最近的点
	 * @param optionalPointOnSegment 可选参数，用于存储线段上距离射线最近的点
	 * @returns 返回射线与线段之间的最小距离的平方
	 */
	distanceSqToSegment( v0, v1, optionalPointOnRay, optionalPointOnSegment ) {

		// from https://github.com/pmjoniak/GeometricTools/blob/master/GTEngine/Include/Mathematics/GteDistRaySegment.h
		// It returns the min distance between the ray and the segment
		// defined by v0 and v1
		// It can also set two optional targets :
		// - The closest point on the ray
		// - The closest point on the segment

		_segCenter.copy( v0 ).add( v1 ).multiplyScalar( 0.5 );
		_segDir.copy( v1 ).sub( v0 ).normalize();
		_diff.copy( this.origin ).sub( _segCenter );

		const segExtent = v0.distanceTo( v1 ) * 0.5;
		const a01 = - this.direction.dot( _segDir );
		const b0 = _diff.dot( this.direction );
		const b1 = - _diff.dot( _segDir );
		const c = _diff.lengthSq();
		const det = Math.abs( 1 - a01 * a01 );
		let s0, s1, sqrDist, extDet;

		if ( det > 0 ) {

			// The ray and segment are not parallel.

			s0 = a01 * b1 - b0;
			s1 = a01 * b0 - b1;
			extDet = segExtent * det;

			if ( s0 >= 0 ) {

				if ( s1 >= - extDet ) {

					if ( s1 <= extDet ) {

						// region 0
						// Minimum at interior points of ray and segment.

						const invDet = 1 / det;
						s0 *= invDet;
						s1 *= invDet;
						sqrDist = s0 * ( s0 + a01 * s1 + 2 * b0 ) + s1 * ( a01 * s0 + s1 + 2 * b1 ) + c;

					} else {

						// region 1

						s1 = segExtent;
						s0 = Math.max( 0, - ( a01 * s1 + b0 ) );
						sqrDist = - s0 * s0 + s1 * ( s1 + 2 * b1 ) + c;

					}

				} else {

					// region 5

					s1 = - segExtent;
					s0 = Math.max( 0, - ( a01 * s1 + b0 ) );
					sqrDist = - s0 * s0 + s1 * ( s1 + 2 * b1 ) + c;

				}

			} else {

				if ( s1 <= - extDet ) {

					// region 4

					s0 = Math.max( 0, - ( - a01 * segExtent + b0 ) );
					s1 = ( s0 > 0 ) ? - segExtent : Math.min( Math.max( - segExtent, - b1 ), segExtent );
					sqrDist = - s0 * s0 + s1 * ( s1 + 2 * b1 ) + c;

				} else if ( s1 <= extDet ) {

					// region 3

					s0 = 0;
					s1 = Math.min( Math.max( - segExtent, - b1 ), segExtent );
					sqrDist = s1 * ( s1 + 2 * b1 ) + c;

				} else {

					// region 2

					s0 = Math.max( 0, - ( a01 * segExtent + b0 ) );
					s1 = ( s0 > 0 ) ? segExtent : Math.min( Math.max( - segExtent, - b1 ), segExtent );
					sqrDist = - s0 * s0 + s1 * ( s1 + 2 * b1 ) + c;

				}

			}

		} else {

			// Ray and segment are parallel.

			s1 = ( a01 > 0 ) ? - segExtent : segExtent;
			s0 = Math.max( 0, - ( a01 * s1 + b0 ) );
			sqrDist = - s0 * s0 + s1 * ( s1 + 2 * b1 ) + c;

		}

		if ( optionalPointOnRay ) {

			optionalPointOnRay.copy( this.origin ).addScaledVector( this.direction, s0 );

		}

		if ( optionalPointOnSegment ) {

			optionalPointOnSegment.copy( _segCenter ).addScaledVector( _segDir, s1 );

		}

		return sqrDist;

	}

	/**
	 * 判断射线是否与球体相交，并返回交点
	 *
	 * @param sphere 球体对象，包含 center 和 radius 属性
	 * @param target 用于存储交点的向量对象
	 * @returns 如果射线与球体相交，则返回交点向量对象；否则返回 null
	 */
	intersectSphere( sphere, target ) {

		_vector.subVectors( sphere.center, this.origin );
		const tca = _vector.dot( this.direction );
		const d2 = _vector.dot( _vector ) - tca * tca;
		const radius2 = sphere.radius * sphere.radius;

		if ( d2 > radius2 ) return null;

		const thc = Math.sqrt( radius2 - d2 );

		// t0 = first intersect point - entrance on front of sphere
		const t0 = tca - thc;

		// t1 = second intersect point - exit point on back of sphere
		const t1 = tca + thc;

		// test to see if t1 is behind the ray - if so, return null
		if ( t1 < 0 ) return null;

		// test to see if t0 is behind the ray:
		// if it is, the ray is inside the sphere, so return the second exit point scaled by t1,
		// in order to always return an intersect point that is in front of the ray.
		if ( t0 < 0 ) return this.at( t1, target );

		// else t0 is in front of the ray, so return the first collision point scaled by t0
		return this.at( t0, target );

	}

	intersectsSphere( sphere ) {

		return this.distanceSqToPoint( sphere.center ) <= ( sphere.radius * sphere.radius );

	}

	/**
	 * 计算射线到平面的距离
	 *
	 * @param plane 平面对象，需要包含normal属性（平面法线向量）和constant属性（平面方程常数项）
	 * @returns 返回射线与平面的交点参数t。如果射线与平面平行且射线起点不在平面上，则返回null；如果射线与平面平行且射线起点在平面上，则返回0。
	 */
	distanceToPlane( plane ) {

		const denominator = plane.normal.dot( this.direction );

		if ( denominator === 0 ) {

			// line is coplanar, return origin
			if ( plane.distanceToPoint( this.origin ) === 0 ) {

				return 0;

			}

			// Null is preferable to undefined since undefined means.... it is undefined

			return null;

		}

		const t = - ( this.origin.dot( plane.normal ) + plane.constant ) / denominator;

		// Return if the ray never intersects the plane

		return t >= 0 ? t : null;

	}

	/**
	 * 判断当前射线是否与指定平面相交，并返回交点。
	 *
	 * @param plane 平面对象，包含平面的法线向量和平面上任意一点。
	 * @param target （可选）用于存储交点的向量对象。如果未提供，则创建一个新的THREE.Vector3对象作为返回值。
	 * @returns 如果射线与平面相交，则返回交点向量；否则返回null。
	 */
	intersectPlane( plane, target ) {

		const t = this.distanceToPlane( plane );

		if ( t === null ) {

			return null;

		}

		return this.at( t, target );

	}

	intersectsPlane( plane ) {

		// check if the ray lies on the plane first

		const distToPoint = plane.distanceToPoint( this.origin );

		if ( distToPoint === 0 ) {

			return true;

		}

		const denominator = plane.normal.dot( this.direction );

		if ( denominator * distToPoint < 0 ) {

			return true;

		}

		// ray origin is behind the plane (and is pointing behind it)

		return false;

	}

	/**
	 * 判断射线是否与盒子相交，并返回最近的交点
	 *
	 * @param box {Object} - 要判断的盒子的边界信息，包括min和max属性，分别代表盒子的最小和最大坐标点
	 * @param target {Object} - 如果存在交点，则交点坐标会被保存在target对象中
	 * @returns {Object|null} - 如果射线与盒子相交，则返回最近的交点对象，否则返回null
	 */
	intersectBox( box, target ) {

		let tmin, tmax, tymin, tymax, tzmin, tzmax;

		const invdirx = 1 / this.direction.x,
			invdiry = 1 / this.direction.y,
			invdirz = 1 / this.direction.z;

		const origin = this.origin;

		if ( invdirx >= 0 ) {

			tmin = ( box.min.x - origin.x ) * invdirx;
			tmax = ( box.max.x - origin.x ) * invdirx;

		} else {

			tmin = ( box.max.x - origin.x ) * invdirx;
			tmax = ( box.min.x - origin.x ) * invdirx;

		}

		if ( invdiry >= 0 ) {

			tymin = ( box.min.y - origin.y ) * invdiry;
			tymax = ( box.max.y - origin.y ) * invdiry;

		} else {

			tymin = ( box.max.y - origin.y ) * invdiry;
			tymax = ( box.min.y - origin.y ) * invdiry;

		}

		if ( ( tmin > tymax ) || ( tymin > tmax ) ) return null;

		if ( tymin > tmin || isNaN( tmin ) ) tmin = tymin;

		if ( tymax < tmax || isNaN( tmax ) ) tmax = tymax;

		if ( invdirz >= 0 ) {

			tzmin = ( box.min.z - origin.z ) * invdirz;
			tzmax = ( box.max.z - origin.z ) * invdirz;

		} else {

			tzmin = ( box.max.z - origin.z ) * invdirz;
			tzmax = ( box.min.z - origin.z ) * invdirz;

		}

		if ( ( tmin > tzmax ) || ( tzmin > tmax ) ) return null;

		if ( tzmin > tmin || tmin !== tmin ) tmin = tzmin;

		if ( tzmax < tmax || tmax !== tmax ) tmax = tzmax;

		//return point closest to the ray (positive side)

		if ( tmax < 0 ) return null;

		return this.at( tmin >= 0 ? tmin : tmax, target );

	}

	intersectsBox( box ) {

		return this.intersectBox( box, _vector ) !== null;

	}

	/**
	 * 计算射线与三角形的交点
	 *
	 * @param a 三角形第一个顶点坐标
	 * @param b 三角形第二个顶点坐标
	 * @param c 三角形第三个顶点坐标
	 * @param backfaceCulling 是否背面剔除
	 * @param target 目标对象，用于存储交点坐标
	 * @returns 返回交点坐标，如果没有交点则返回null
	 */
	intersectTriangle( a, b, c, backfaceCulling, target ) {

		// Compute the offset origin, edges, and normal.

		// from https://github.com/pmjoniak/GeometricTools/blob/master/GTEngine/Include/Mathematics/GteIntrRay3Triangle3.h

		_edge1.subVectors( b, a );
		_edge2.subVectors( c, a );
		_normal.crossVectors( _edge1, _edge2 );

		// Solve Q + t*D = b1*E1 + b2*E2 (Q = kDiff, D = ray direction,
		// E1 = kEdge1, E2 = kEdge2, N = Cross(E1,E2)) by
		//   |Dot(D,N)|*b1 = sign(Dot(D,N))*Dot(D,Cross(Q,E2))
		//   |Dot(D,N)|*b2 = sign(Dot(D,N))*Dot(D,Cross(E1,Q))
		//   |Dot(D,N)|*t = -sign(Dot(D,N))*Dot(Q,N)
		let DdN = this.direction.dot( _normal );
		let sign;

		if ( DdN > 0 ) {

			if ( backfaceCulling ) return null;
			sign = 1;

		} else if ( DdN < 0 ) {

			sign = - 1;
			DdN = - DdN;

		} else {

			return null;

		}

		_diff.subVectors( this.origin, a );
		const DdQxE2 = sign * this.direction.dot( _edge2.crossVectors( _diff, _edge2 ) );

		// b1 < 0, no intersection
		if ( DdQxE2 < 0 ) {

			return null;

		}

		const DdE1xQ = sign * this.direction.dot( _edge1.cross( _diff ) );

		// b2 < 0, no intersection
		if ( DdE1xQ < 0 ) {

			return null;

		}

		// b1+b2 > 1, no intersection
		if ( DdQxE2 + DdE1xQ > DdN ) {

			return null;

		}

		// Line intersects triangle, check if ray does.
		const QdN = - sign * _diff.dot( _normal );

		// t < 0, no intersection
		if ( QdN < 0 ) {

			return null;

		}

		// Ray intersects triangle.
		return this.at( QdN / DdN, target );

	}

	applyMatrix4( matrix4 ) {

		this.origin.applyMatrix4( matrix4 );
		this.direction.transformDirection( matrix4 );

		return this;

	}

	equals( ray ) {

		return ray.origin.equals( this.origin ) && ray.direction.equals( this.direction );

	}

	clone() {

		return new this.constructor().copy( this );

	}

}

export { Ray };
