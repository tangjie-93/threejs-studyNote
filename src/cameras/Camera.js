import { WebGLCoordinateSystem } from '../constants.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Object3D } from '../core/Object3D.js';

class Camera extends Object3D {

	constructor() {

		super();

		this.isCamera = true;

		this.type = 'Camera';
		// 这是matrixWorld矩阵的逆矩阵，用于将世界坐标系中的点转换为相机坐标系下的点。
		this.matrixWorldInverse = new Matrix4();

		this.projectionMatrix = new Matrix4();
		this.projectionMatrixInverse = new Matrix4();

		this.coordinateSystem = WebGLCoordinateSystem;

	}

	copy( source, recursive ) {

		super.copy( source, recursive );

		this.matrixWorldInverse.copy( source.matrixWorldInverse );

		this.projectionMatrix.copy( source.projectionMatrix );
		this.projectionMatrixInverse.copy( source.projectionMatrixInverse );

		this.coordinateSystem = source.coordinateSystem;

		return this;

	}

	getWorldDirection( target ) {

		return super.getWorldDirection( target ).negate();

	}

	/**
	 * 更新对象的世界矩阵
	 *
	 * @param force 是否强制更新，默认为 false
	 * @returns 无返回值
	 */
	updateMatrixWorld( force ) {

		// 调用父类的 updateMatrixWorld 方法
		super.updateMatrixWorld( force );

		// 这是matrixWorld矩阵的逆矩阵，用于将世界坐标系中的点转换回对象的本地坐标系
		this.matrixWorldInverse.copy( this.matrixWorld ).invert();

	}

	/**
	 * 更新世界矩阵
	 *
	 * @param updateParents 是否更新父对象
	 * @param updateChildren 是否更新子对象
	 */
	updateWorldMatrix( updateParents, updateChildren ) {

		super.updateWorldMatrix( updateParents, updateChildren );

		this.matrixWorldInverse.copy( this.matrixWorld ).invert();

	}

	clone() {

		return new this.constructor().copy( this );

	}

}

export { Camera };
