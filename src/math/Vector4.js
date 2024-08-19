class Vector4 {

    /**
     * @description
     * 构造函数，创建一个新的Vector4对象。
     * 如果没有提供参数，则默认值为0、0、0和1。
     *
     * @param {number} [x=0] - X坐标（可选）
     * @param {number} [y=0] - Y坐标（可选）
     * @param {number} [z=0] - Z坐标（可选）
     * @param {number} [w=1] - W坐标（可选）
     *
     * @returns {Object} 返回一个新的Vector4对象
     * @property {boolean} isVector4 - 用于检查当前对象是否为Vector4类型的属性，始终为true
     * @property {number} x - X坐标
     * @property {number} y - Y坐标
     * @property {number} z - Z坐标
     * @property {number} w - W坐标
     */
	constructor( x = 0, y = 0, z = 0, w = 1 ) {

		Vector4.prototype.isVector4 = true;

		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;

	}

    /**
     * 获取宽度，返回z值
     * @returns {number} z值，表示宽度
     */
	get width() {

		return this.z;

	}

	set width( value ) {

		this.z = value;

	}

    /**
     * 获取高度，返回宽度值
     *
     * @returns {number} 返回一个数字类型的值，表示高度
     */
	get height() {

		return this.w;

	}

	set height( value ) {

		this.w = value;

	}

    /**
     * @method set
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @param {Number} w
     * @returns {Vector4} 返回自身以支持链式调用
     *
     * 设置向量的各个分量。
     */
	set( x, y, z, w ) {

		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;

		return this;

	}

    /**
     * @method setScalar
     * @param {number} scalar - 要设置的标量值
     * @returns {Vector4} Vector4 对象本身，可以链式调用
     *
     * 将当前 Vector4 对象的 x, y, z, w 属性都设为给定的标量值。
     */
	setScalar( scalar ) {

		this.x = scalar;
		this.y = scalar;
		this.z = scalar;
		this.w = scalar;

		return this;

	}

    /**
     * @method setX
     * @param {number} x - X坐标值
     * @returns {THREE.Vector3} 返回当前向量对象自身，用于链式调用
     *
     * 设置向量的X坐标值，并返回当前向量对象自身。
     */
	setX( x ) {

		this.x = x;

		return this;

	}

    /**
     * @method setY
     * @param {number} y Y坐标值
     * @returns {THREE.Vector2} 返回当前向量对象自身
     *
     * 设置向量的Y坐标值，并返回当前向量对象自身。
     */
	setY( y ) {

		this.y = y;

		return this;

	}

    /**
     * @method setZ
     * @param {Number} z Z坐标值
     * @return {THREE.Vector3} 返回当前向量对象自身
     *
     * 设置向量的Z坐标值，并返回当前向量对象自身。
     */
	setZ( z ) {

		this.z = z;

		return this;

	}

    /**
     * @method setW
     * @param {number} w - 宽度值
     * @returns {this} 返回当前对象自身
     *
     * 设置当前矩形的宽度，并返回当前对象自身。
     */
	setW( w ) {

		this.w = w;

		return this;

	}

    /**
     * @method setComponent
     * @param {Number} index 索引值，取值范围为[0,3]
     * @param {Number} value 要设置的值
     * @returns {Vector4} 返回当前向量对象自身
     * @throws {Error} 如果index超出了范围，则抛出错误
     *
     * 根据索引值设置向量的x、y、z或w属性。
     */
	setComponent( index, value ) {

		switch ( index ) {

			case 0: this.x = value; break;
			case 1: this.y = value; break;
			case 2: this.z = value; break;
			case 3: this.w = value; break;
			default: throw new Error( 'index is out of range: ' + index );

		}

		return this;

	}

    /**
     * @method getComponent
     * @param {Number} index 组件索引，取值范围为0到3
     * @returns {Number} 返回对应索引的组件值
     * @throws {Error} 当索引超出范围时抛出错误
     */
	getComponent( index ) {

		switch ( index ) {

			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			case 3: return this.w;
			default: throw new Error( 'index is out of range: ' + index );

		}

	}

    /**
     * 克隆一个 Vector4 对象。
     *
     * @returns {Vector4} 返回一个新的 Vector4 对象，与原始 Vector4 对象相同。
     */
	clone() {

		return new this.constructor( this.x, this.y, this.z, this.w );

	}

    /**
     * @method copy
     * @param {Vector3} v
     * @returns {Vector4} 返回自身，用于链式调用
     * @description 将给定的向量复制到当前向量中
     */
	copy( v ) {

		this.x = v.x;
		this.y = v.y;
		this.z = v.z;
		this.w = ( v.w !== undefined ) ? v.w : 1;

		return this;

	}

    /**
     * @method add
     * @param {Vector4} v
     * @returns {Vector4} 返回自身，表示向量加法操作的结果
     * @description 向量加法，将当前向量和传入的向量相加，并返回结果。
     */
	add( v ) {

		this.x += v.x;
		this.y += v.y;
		this.z += v.z;
		this.w += v.w;

		return this;

	}

    /**
     * @method addScalar
     * @param {Number} s
     * @returns {Vector4} 返回自身以便链式调用
     * @description 将向量的每个分量都加上一个常数s，并返回自身。
     */
	addScalar( s ) {

		this.x += s;
		this.y += s;
		this.z += s;
		this.w += s;

		return this;

	}

    /**
     * @method addVectors
     * @description 向量加法，将两个向量相加并返回新的向量。
     * @param {Vector3} a - 第一个向量。
     * @param {Vector3} b - 第二个向量。
     * @returns {Vector3} 返回新的向量，等于a+b。
     */
	addVectors( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;
		this.z = a.z + b.z;
		this.w = a.w + b.w;

		return this;

	}

    /**
     * @description
     * 向量加法，将给定的向量乘以一个标量后，添加到当前向量中。
     *
     * @param {Vector4} v - 要加入的向量
     * @param {number} s - 标量值，用于缩放给定的向量
     *
     * @returns {Vector4} 返回当前向量对象自身，表示向量加法操作的结果
     */
	addScaledVector( v, s ) {

		this.x += v.x * s;
		this.y += v.y * s;
		this.z += v.z * s;
		this.w += v.w * s;

		return this;

	}

    /**
     * @method sub
     * @param {Vector4} v
     * @returns {Vector4} 返回当前向量减法后的结果
     *
     * 将当前向量与参数向量相减，并返回减法后的结果。
     */
	sub( v ) {

		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;
		this.w -= v.w;

		return this;

	}

    /**
     * @method subScalar
     * @param {number} s - 减数
     * @returns {Vector4} 返回当前向量对象自身，表示向量减法操作的结果
     * @description
     * 将当前向量对象中的 x, y, z, w 分量分别减去指定的数值 s。
     */
	subScalar( s ) {

		this.x -= s;
		this.y -= s;
		this.z -= s;
		this.w -= s;

		return this;

	}

    /**
     * @method subVectors
     * @description 向量减法，将a向量减去b向量的值，并返回结果向量。
     * @param {Vector4} a Vector4类型的向量a。
     * @param {Vector4} b Vector4类型的向量b。
     * @returns {Vector4} 返回一个新的Vector4实例，表示a向量减去b向量后的结果。
     */
	subVectors( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z;
		this.w = a.w - b.w;

		return this;

	}

    /**
     * 乘法运算，将当前向量的每个分量与另一个向量相乘。
     *
     * @param {Vector4} v - 要与当前向量相乘的向量。
     * @returns {Vector4} 返回当前向量，表示已经进行了乘法操作。
     */
	multiply( v ) {

		this.x *= v.x;
		this.y *= v.y;
		this.z *= v.z;
		this.w *= v.w;

		return this;

	}

    /**
     * 将向量的每个分量都乘以一个标量，并返回修改后的向量。
     *
     * @param {number} scalar - 要乘以向量的标量值。
     * @returns {Vector4} 返回修改后的向量。
     */
	multiplyScalar( scalar ) {

		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;
		this.w *= scalar;

		return this;

	}

	/**
	 * 应用一个4x4矩阵到当前对象上
	 *
	 * @param m 4x4矩阵
	 * @returns 返回当前对象
	 */
	applyMatrix4( m ) {

		const x = this.x, y = this.y, z = this.z, w = this.w;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z + e[ 12 ] * w;
		this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z + e[ 13 ] * w;
		this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z + e[ 14 ] * w;
		this.w = e[ 3 ] * x + e[ 7 ] * y + e[ 11 ] * z + e[ 15 ] * w;

		return this;

	}

    /**
     * 将向量除以一个标量，返回一个新的向量。
     *
     * @param {Number} scalar 要除以的标量。
     * @returns {Vector3} 返回一个新的向量，其长度为原来的向量除以给定的标量。
     */
	divideScalar( scalar ) {

		return this.multiplyScalar( 1 / scalar );

	}

    /**
     * @method setAxisAngleFromQuaternion
     * @param {THREE.Quaternion} q
     * @return {THREE.Euler} 返回自身引用
     *
     * 将四元数转换为轴角，并设置当前对象的轴角。
     * q是假定已经是正规化的。
     */
	setAxisAngleFromQuaternion( q ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/index.htm

		// q is assumed to be normalized

		this.w = 2 * Math.acos( q.w );

		const s = Math.sqrt( 1 - q.w * q.w );

		if ( s < 0.0001 ) {

			this.x = 1;
			this.y = 0;
			this.z = 0;

		} else {

			this.x = q.x / s;
			this.y = q.y / s;
			this.z = q.z / s;

		}

		return this;

	}

    /**
     * @method setAxisAngleFromRotationMatrix
     * @param {THREE.Matrix4} m
     * @return {THREE.Quaternion} 返回自身引用
     *
     * 从旋转矩阵中设置轴角。
     * 假定上三角矩阵（i.e., unscaled）。
     */
	setAxisAngleFromRotationMatrix( m ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToAngle/index.htm

		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

		let angle, x, y, z; // variables for result
		const epsilon = 0.01,		// margin to allow for rounding errors
			epsilon2 = 0.1,		// margin to distinguish between 0 and 180 degrees

			te = m.elements,

			m11 = te[ 0 ], m12 = te[ 4 ], m13 = te[ 8 ],
			m21 = te[ 1 ], m22 = te[ 5 ], m23 = te[ 9 ],
			m31 = te[ 2 ], m32 = te[ 6 ], m33 = te[ 10 ];

		if ( ( Math.abs( m12 - m21 ) < epsilon ) &&
		     ( Math.abs( m13 - m31 ) < epsilon ) &&
		     ( Math.abs( m23 - m32 ) < epsilon ) ) {

			// singularity found
			// first check for identity matrix which must have +1 for all terms
			// in leading diagonal and zero in other terms

			if ( ( Math.abs( m12 + m21 ) < epsilon2 ) &&
			     ( Math.abs( m13 + m31 ) < epsilon2 ) &&
			     ( Math.abs( m23 + m32 ) < epsilon2 ) &&
			     ( Math.abs( m11 + m22 + m33 - 3 ) < epsilon2 ) ) {

				// this singularity is identity matrix so angle = 0

				this.set( 1, 0, 0, 0 );

				return this; // zero angle, arbitrary axis

			}

			// otherwise this singularity is angle = 180

			angle = Math.PI;

			const xx = ( m11 + 1 ) / 2;
			const yy = ( m22 + 1 ) / 2;
			const zz = ( m33 + 1 ) / 2;
			const xy = ( m12 + m21 ) / 4;
			const xz = ( m13 + m31 ) / 4;
			const yz = ( m23 + m32 ) / 4;

			if ( ( xx > yy ) && ( xx > zz ) ) {

				// m11 is the largest diagonal term

				if ( xx < epsilon ) {

					x = 0;
					y = 0.707106781;
					z = 0.707106781;

				} else {

					x = Math.sqrt( xx );
					y = xy / x;
					z = xz / x;

				}

			} else if ( yy > zz ) {

				// m22 is the largest diagonal term

				if ( yy < epsilon ) {

					x = 0.707106781;
					y = 0;
					z = 0.707106781;

				} else {

					y = Math.sqrt( yy );
					x = xy / y;
					z = yz / y;

				}

			} else {

				// m33 is the largest diagonal term so base result on this

				if ( zz < epsilon ) {

					x = 0.707106781;
					y = 0.707106781;
					z = 0;

				} else {

					z = Math.sqrt( zz );
					x = xz / z;
					y = yz / z;

				}

			}

			this.set( x, y, z, angle );

			return this; // return 180 deg rotation

		}

		// as we have reached here there are no singularities so we can handle normally

		let s = Math.sqrt( ( m32 - m23 ) * ( m32 - m23 ) +
			( m13 - m31 ) * ( m13 - m31 ) +
			( m21 - m12 ) * ( m21 - m12 ) ); // used to normalize

		if ( Math.abs( s ) < 0.001 ) s = 1;

		// prevent divide by zero, should not happen if matrix is orthogonal and should be
		// caught by singularity test above, but I've left it in just in case

		this.x = ( m32 - m23 ) / s;
		this.y = ( m13 - m31 ) / s;
		this.z = ( m21 - m12 ) / s;
		this.w = Math.acos( ( m11 + m22 + m33 - 1 ) / 2 );

		return this;

	}

    /**
     * 设置四元数的位置，从矩阵中获取值。
     *
     * @param {Matrix4} m 一个4x4矩阵对象。
     * @returns {Quaternion} 返回当前实例。
     */
	setFromMatrixPosition( m ) {

		const e = m.elements;

		this.x = e[ 12 ];
		this.y = e[ 13 ];
		this.z = e[ 14 ];
		this.w = e[ 15 ];

		return this;

	}

    /**
     * 计算当前向量的最小值，并将结果赋给当前向量。
     *
     * @param {Vector4} v - 要比较的向量。
     * @returns {Vector4} 返回更新后的当前向量。
     */
	min( v ) {

		this.x = Math.min( this.x, v.x );
		this.y = Math.min( this.y, v.y );
		this.z = Math.min( this.z, v.z );
		this.w = Math.min( this.w, v.w );

		return this;

	}

    /**
     * 计算向量的最大值，并将结果赋给当前向量。
     *
     * @param {Vector4} v - 要比较的向量。
     * @returns {Vector4} 返回当前向量，用于链式调用。
     */
	max( v ) {

		this.x = Math.max( this.x, v.x );
		this.y = Math.max( this.y, v.y );
		this.z = Math.max( this.z, v.z );
		this.w = Math.max( this.w, v.w );

		return this;

	}

    /**
     * @method clamp
     * @param {Vector4} min - 最小值
     * @param {Vector4} max - 最大值
     * @returns {Vector4} 返回修改后的当前对象
     *
     * 限制当前向量的每个分量在指定范围内，如果超出则会被修正。
     * 假设 min < max，组件独立地进行比较和修正。
     */
	clamp( min, max ) {

		// assumes min < max, componentwise

		this.x = Math.max( min.x, Math.min( max.x, this.x ) );
		this.y = Math.max( min.y, Math.min( max.y, this.y ) );
		this.z = Math.max( min.z, Math.min( max.z, this.z ) );
		this.w = Math.max( min.w, Math.min( max.w, this.w ) );

		return this;

	}

    /**
     * @method clampScalar
     * @description 限制向量的每个分量在指定范围内，并返回修改后的向量。
     * @param {number} minVal - 最小值，默认为0。
     * @param {number} maxVal - 最大值，默认为1。
     * @returns {Vector4} 返回修改后的向量。
     */
	clampScalar( minVal, maxVal ) {

		this.x = Math.max( minVal, Math.min( maxVal, this.x ) );
		this.y = Math.max( minVal, Math.min( maxVal, this.y ) );
		this.z = Math.max( minVal, Math.min( maxVal, this.z ) );
		this.w = Math.max( minVal, Math.min( maxVal, this.w ) );

		return this;

	}

    /**
     * @method clampLength
     * @description 限制向量的长度，保证在指定的范围内。如果当前长度为0，则返回原始向量。
     * @param {number} min - 最小值，默认为0
     * @param {number} max - 最大值，默认为Infinity
     * @returns {Vector3} 返回一个新的向量，其长度在min和max之间
     */
	clampLength( min, max ) {

		const length = this.length();

		return this.divideScalar( length || 1 ).multiplyScalar( Math.max( min, Math.min( max, length ) ) );

	}

    /**
     * floor()
     * 返回一个新的 Vector4，其中每个分量都是向下取整。
     *
     * @returns {Vector4} 返回一个新的 Vector4 对象。
     */
	floor() {

		this.x = Math.floor( this.x );
		this.y = Math.floor( this.y );
		this.z = Math.floor( this.z );
		this.w = Math.floor( this.w );

		return this;

	}

    /**
     * @method ceil
     * @description 将向量的每个分量都进行上取整操作，返回一个新的向量。
     * @returns {Vector4} 返回一个新的向量，其中每个分量都是原始向量的上取整值。
     */
	ceil() {

		this.x = Math.ceil( this.x );
		this.y = Math.ceil( this.y );
		this.z = Math.ceil( this.z );
		this.w = Math.ceil( this.w );

		return this;

	}

    /**
     * round
     *
     * 将四元数的 x, y, z, w 属性进行四舍五入处理，并返回当前对象。
     *
     * @returns {Quaternion} 返回当前对象自身，以便可以进行链式调用。
     */
	round() {

		this.x = Math.round( this.x );
		this.y = Math.round( this.y );
		this.z = Math.round( this.z );
		this.w = Math.round( this.w );

		return this;

	}

    /**
     * @method roundToZero
     * 将向量的 x, y, z, w 属性四舍五入到最接近的整数。
     * 返回一个新的 Vector4，原始向量不会发生变化。
     *
     * @returns {Vector4} 返回一个新的 Vector4，其中 x, y, z, w 属性已被四舍五入到最接近的整数。
     */
	roundToZero() {

		this.x = Math.trunc( this.x );
		this.y = Math.trunc( this.y );
		this.z = Math.trunc( this.z );
		this.w = Math.trunc( this.w );

		return this;

	}

    /**
     * 反转向量的方向，并返回该向量本身。
     *
     * @returns {Vector4} 返回当前向量本身，其方向已被反转。
     */
	negate() {

		this.x = - this.x;
		this.y = - this.y;
		this.z = - this.z;
		this.w = - this.w;

		return this;

	}

    /**
     * @description 点乘操作，返回两个向量的点积。
     *
     * @param {Vector4} v - 另一个向量。
     * @returns {number} 返回点积值，类型为数字。
     */
	dot( v ) {

		return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;

	}

    /**
     * 计算向量的长度平方。
     *
     * @returns {number} 返回一个数值，表示向量的长度平方。
     */
	lengthSq() {

		return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;

	}

    /**
     * @description 返回向量的长度（模）。
     *
     * @returns {number} 返回一个数值，表示向量的长度（模）。
     */
	length() {

		return Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w );

	}

    /**
     * @method manhattanLength
     * @description 计算向量的曼哈顿距离，即每个分量的绝对值之和。
     * @returns {number} 返回一个数字类型的值，表示向量的曼哈顿距离。
     */
	manhattanLength() {

		return Math.abs( this.x ) + Math.abs( this.y ) + Math.abs( this.z ) + Math.abs( this.w );

	}

    /**
     * 将向量归一化，使其长度为1。如果向量的长度为0，则返回原始向量。
     *
     * @returns {Vector3} 返回归一化后的向量。
     */
	normalize() {

		return this.divideScalar( this.length() || 1 );

	}

    /**
     * @method setLength
     * @param {number} length 长度值，单位为米
     * @returns {Vector3} 返回当前向量对象自身
     *
     * 设置向量的长度。向量会被正规化后再乘以给定的长度值。
     */
	setLength( length ) {

		return this.normalize().multiplyScalar( length );

	}

    /**
     * @method lerp
     * @param {Vector4} v
     * @param {number} alpha
     * @returns {Vector4} 返回自身以实现链式调用
     *
     * 线性插值，将当前向量和目标向量之间的差值乘以alpha系数，并加到当前向量上。
     */
	lerp( v, alpha ) {

		this.x += ( v.x - this.x ) * alpha;
		this.y += ( v.y - this.y ) * alpha;
		this.z += ( v.z - this.z ) * alpha;
		this.w += ( v.w - this.w ) * alpha;

		return this;

	}

    /**
     * @method lerpVectors
     * @description 线性插值两个向量，并将结果赋给当前向量。
     * @param {Vector3} v1 第一个向量。
     * @param {Vector3} v2 第二个向量。
     * @param {number} alpha 插值系数，取值范围为0~1。
     * @returns {Vector4} 返回当前向量自身。
     */
	lerpVectors( v1, v2, alpha ) {

		this.x = v1.x + ( v2.x - v1.x ) * alpha;
		this.y = v1.y + ( v2.y - v1.y ) * alpha;
		this.z = v1.z + ( v2.z - v1.z ) * alpha;
		this.w = v1.w + ( v2.w - v1.w ) * alpha;

		return this;

	}

    /**
     * @method equals
     * @param {Vector4} v
     * @returns {boolean}
     * 返回一个布尔值，表示当前向量是否与传入的向量相等。
     * 两个向量相等的条件是 x、y、z、w 均相等。
     */
	equals( v ) {

		return ( ( v.x === this.x ) && ( v.y === this.y ) && ( v.z === this.z ) && ( v.w === this.w ) );

	}

    /**
     * @method fromArray
     * @param {Array} array 数组，包含 x、y、z、w 四个元素
     * @param {Number} [offset=0] 从数组的第几个元素开始取值，默认为 0
     * @returns {Vector4} 返回当前 Vector4 对象自身
     *
     * 将一个数组中的元素赋给当前 Vector4 对象。
     */
	fromArray( array, offset = 0 ) {

		this.x = array[ offset ];
		this.y = array[ offset + 1 ];
		this.z = array[ offset + 2 ];
		this.w = array[ offset + 3 ];

		return this;

	}

    /**
     * @method toArray
     * @param {Array} [array=[]] - 目标数组，默认为空数组。
     * @param {Number} [offset=0] - 数组的偏移量，默认为0。
     * @returns {Array} 返回一个包含四元数元素的数组。
     *
     * 将当前四元数转换为一个包含四个元素的数组，并存储在指定的数组中，从给定的偏移量开始。
     * 如果未提供数组，则创建一个新数组。
     */
	toArray( array = [], offset = 0 ) {

		array[ offset ] = this.x;
		array[ offset + 1 ] = this.y;
		array[ offset + 2 ] = this.z;
		array[ offset + 3 ] = this.w;

		return array;

	}

    /**
     * @method fromBufferAttribute
     * @description 从缓冲属性中获取向量值，并赋给当前对象。
     * @param {BufferAttribute} attribute BufferAttribute类型的缓冲属性。
     * @param {Number} index 要获取的向量在缓冲属性中的索引位置。默认为0。
     * @returns {Vector4} 返回当前对象自身，用于支持链式调用。
     */
	fromBufferAttribute( attribute, index ) {

		this.x = attribute.getX( index );
		this.y = attribute.getY( index );
		this.z = attribute.getZ( index );
		this.w = attribute.getW( index );

		return this;

	}

    /**
     * @description 生成随机四元数
     * @returns {Quaternion} 返回当前实例，带有新的随机值
     */
	random() {

		this.x = Math.random();
		this.y = Math.random();
		this.z = Math.random();
		this.w = Math.random();

		return this;

	}

	*[ Symbol.iterator ]() {

		yield this.x;
		yield this.y;
		yield this.z;
		yield this.w;

	}

}

export { Vector4 };
